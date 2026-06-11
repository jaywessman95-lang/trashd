import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runContactScrapers } from "@/lib/sold-homes/scrapers/contacts";
import { scheduleEmailsInWindow } from "@/lib/email-queue-helpers";
import { DEFAULT_REALTOR_SCRAPE_SETTINGS } from "@/lib/sold-homes/types";
import crypto from "crypto";

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

  // Read optional query params for targeted runs
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  if (!force && (ptHour < 7 || ptHour >= 19)) {
    return NextResponse.json({ skipped: true, reason: "Outside 7am–7pm PT window", ptHour });
  }
  const sourcesParam = url.searchParams.get("sources");
  const sources = sourcesParam ? sourcesParam.split(",").map((s) => s.trim()) : undefined;
  const maxPages = parseInt(url.searchParams.get("maxPages") ?? "3", 10);
  const maxCities = parseInt(url.searchParams.get("maxCities") ?? "5", 10);
  const maxEmails = parseInt(
    url.searchParams.get("maxEmails") ?? String(DEFAULT_REALTOR_SCRAPE_SETTINGS.maxEmailsPerRun),
    10,
  );
  const emailWindowStart = parseInt(
    url.searchParams.get("emailWindowStart") ?? String(DEFAULT_REALTOR_SCRAPE_SETTINGS.emailWindowStart),
    10,
  );
  const emailWindowEnd = parseInt(
    url.searchParams.get("emailWindowEnd") ?? String(DEFAULT_REALTOR_SCRAPE_SETTINGS.emailWindowEnd),
    10,
  );

  let upserted = 0;
  let emailsSent = 0;
  let runError: string | null = null;
  let lastEmailError: string | null = null;
  let bySource: Record<string, { contacts: number; pages: number; error?: string }> = {};

  try {
    const summary = await runContactScrapers({ sources, maxPages, maxCities });
    bySource = summary.bySource;

    if (summary.allContacts.length > 0 && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createSupabaseAdminClient();

      const rows = summary.allContacts.map((c) => ({
        id: c.id,
        name: c.name ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        brokerage: c.brokerage ?? null,
        profile_url: c.profileUrl ?? null,
        source: c.source,
        scraped_at: c.scrapedAt,
        profile_status: "unverified",
        verification_token: crypto.randomUUID(),
      }));

      // Upsert — ignoreDuplicates: true preserves onboarding_email_sent_at for existing rows
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error } = await db
          .from("realtor_contacts")
          .upsert(batch, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        upserted += batch.length;
      }

      // Enqueue outreach emails with randomised send times spread across the PT window
      if (maxEmails > 0 && env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
        const { data: toEmail } = await db
          .from("realtor_contacts")
          .select("id, name, email, verification_token")
          .not("email", "is", null)
          .is("onboarding_email_sent_at", null)
          .order("scraped_at", { ascending: false })
          .limit(maxEmails);

        const contacts = (toEmail ?? []).filter((c) => !!c.email);
        const scheduledTimes = scheduleEmailsInWindow(contacts.length, emailWindowStart, emailWindowEnd);

        if (scheduledTimes.length > 0) {
          const queueRows = contacts.slice(0, scheduledTimes.length).map((c, i) => ({
            type: "realtor",
            recipient_id: c.id,
            recipient_email: c.email,
            recipient_name: c.name ?? null,
            verification_token: c.verification_token ?? null,
            scheduled_at: scheduledTimes[i].toISOString(),
            status: "pending",
          }));

          const { error: qErr } = await db.from("email_queue").insert(queueRows);
          if (qErr) {
            lastEmailError = qErr.message;
          } else {
            // Mark contacts as queued so they won't be picked up again next run
            const ids = contacts.slice(0, scheduledTimes.length).map((c) => c.id);
            await db
              .from("realtor_contacts")
              .update({ onboarding_email_sent_at: new Date().toISOString() })
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
    upserted,
    emailsQueued: emailsSent,
    bySource,
    error: runError,
    emailError: lastEmailError,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "manual",
  });
}
