import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runOperatorScrapers } from "@/lib/service-operators/scrapers";
import { scheduleEmailsInWindow } from "@/lib/email-queue-helpers";
import crypto from "crypto";
import { DEFAULT_OPERATOR_SCRAPE_SETTINGS } from "@/lib/service-operators/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }

  const nowUTC = new Date();
  const ptHour = new Date(
    nowUTC.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  ).getHours();

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  if (!force && (ptHour < 7 || ptHour >= 19)) {
    return NextResponse.json({ skipped: true, reason: "Outside 7am–7pm PT window", ptHour });
  }

  const maxLeads = parseInt(
    url.searchParams.get("maxLeads") ?? String(DEFAULT_OPERATOR_SCRAPE_SETTINGS.maxLeadsPerHour),
    10,
  );
  const maxEmails = parseInt(
    url.searchParams.get("maxEmails") ?? String(DEFAULT_OPERATOR_SCRAPE_SETTINGS.maxEmailsPerRun),
    10,
  );
  const emailWindowStart = parseInt(
    url.searchParams.get("emailWindowStart") ?? String(DEFAULT_OPERATOR_SCRAPE_SETTINGS.emailWindowStart),
    10,
  );
  const emailWindowEnd = parseInt(
    url.searchParams.get("emailWindowEnd") ?? String(DEFAULT_OPERATOR_SCRAPE_SETTINGS.emailWindowEnd),
    10,
  );
  const citiesParam = url.searchParams.get("cities");
  const targetCities = citiesParam ? citiesParam.split(",").map((c) => c.trim()).filter(Boolean) : undefined;

  let upserted = 0;
  let emailsSent = 0;
  let runError: string | null = null;
  let lastEmailError: string | null = null;
  let bySource: Record<string, number> = {};

  try {
    const { operators, bySource: src } = await runOperatorScrapers(maxLeads, targetCities);
    bySource = src;

    if (operators.length > 0 && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createSupabaseAdminClient();

      const rows = operators.map((op) => ({
        id: op.id,
        company: op.company ?? null,
        phone: op.phone ?? null,
        email: op.email ?? null,
        address: op.address ?? null,
        city: op.city ?? null,
        state: op.state ?? "CA",
        zip: op.zip ?? null,
        service_type: op.serviceType,
        website_url: op.websiteUrl ?? null,
        source: op.source,
        score: op.score,
        priority: op.priority,
        profile_status: op.profileStatus ?? "unverified",
        scraped_at: op.scrapedAt ?? nowUTC.toISOString(),
        verification_token: crypto.randomUUID(),
        // 3-pillar scoring data (populated when YellowPages profile has ratings)
        google_maps_rating:    op.googleMapsRating    ?? null,
        google_review_count:   op.googleReviewCount   ?? null,
        hours_description:     op.hoursDescription    ?? null,
        availability_score:    op.availabilityScore   ?? 0,
        reliability_score:     op.reliabilityScore    ?? 0,
        professionalism_score: op.professionalismScore ?? 0,
        confidence_tier:       op.confidenceTier      ?? null,
        last_scored_at:        op.confidenceTier ? nowUTC.toISOString() : null,
      }));

      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (db as any)
          .from("service_operators")
          .upsert(batch, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        upserted += batch.length;
      }

      // For operators that came back with rating data, UPDATE the scoring columns
      // on existing rows (ignoreDuplicates skips the full row, so we patch separately)
      const withRatings = operators.filter(op => op.googleMapsRating !== undefined);
      for (const op of withRatings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from("service_operators").update({
          google_maps_rating:    op.googleMapsRating,
          google_review_count:   op.googleReviewCount   ?? null,
          hours_description:     op.hoursDescription    ?? null,
          availability_score:    op.availabilityScore   ?? 0,
          reliability_score:     op.reliabilityScore    ?? 0,
          professionalism_score: op.professionalismScore ?? 0,
          confidence_tier:       op.confidenceTier      ?? null,
          score:                 op.score,
          priority:              op.priority,
          last_scored_at:        nowUTC.toISOString(),
          updated_at:            nowUTC.toISOString(),
        }).eq("id", op.id);
      }

      // Enqueue outreach emails with randomised send times spread across the PT window
      if (maxEmails > 0 && env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
        const { data: toEmail } = await db
          .from("service_operators")
          .select("id, company, email, verification_token")
          .not("email", "is", null)
          .is("outreach_sent_at", null)
          .order("scraped_at", { ascending: false })
          .limit(maxEmails);

        const operators = (toEmail ?? []).filter((op) => !!op.email);
        const scheduledTimes = scheduleEmailsInWindow(operators.length, emailWindowStart, emailWindowEnd);

        if (scheduledTimes.length > 0) {
          const queueRows = operators.slice(0, scheduledTimes.length).map((op, i) => ({
            type: "operator",
            recipient_id: op.id,
            recipient_email: op.email,
            recipient_name: op.company ?? null,
            verification_token: op.verification_token ?? null,
            scheduled_at: scheduledTimes[i].toISOString(),
            status: "pending",
          }));

          const { error: qErr } = await db.from("email_queue").insert(queueRows);
          if (qErr) {
            lastEmailError = qErr.message;
          } else {
            // Mark operators as queued so they won't be picked up again next run
            const ids = operators.slice(0, scheduledTimes.length).map((op) => op.id);
            await db
              .from("service_operators")
              .update({ outreach_sent_at: nowUTC.toISOString() })
              .in("id", ids);
            emailsSent = queueRows.length;
          }
        }
      }
    }
  } catch (e) {
    runError = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? JSON.stringify(e));
  }

  return NextResponse.json({
    ok: runError === null,
    startedAt: nowUTC.toISOString(),
    ptHour,
    maxLeads,
    maxEmails,
    upserted,
    emailsQueued: emailsSent,
    bySource,
    error: runError,
    emailError: lastEmailError,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "manual",
  });
}
