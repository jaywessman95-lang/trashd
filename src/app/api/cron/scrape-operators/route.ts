import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runOperatorScrapers } from "@/lib/service-operators/scrapers";
import { sendOperatorOutreach } from "@/lib/integrations/gmail";
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
    10
  );
  const maxEmails = parseInt(
    url.searchParams.get("maxEmails") ?? String(DEFAULT_OPERATOR_SCRAPE_SETTINGS.maxEmailsPerRun),
    10
  );

  let upserted = 0;
  let emailsSent = 0;
  let runError: string | null = null;
  let lastEmailError: string | null = null;
  let bySource: Record<string, number> = {};

  try {
    const { operators, bySource: src } = await runOperatorScrapers(maxLeads);
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
      }));

      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error } = await db
          .from("service_operators")
          .upsert(batch, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        upserted += batch.length;
      }

      // Send outreach emails to newly inserted operators that have an email
      if (maxEmails > 0 && env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
        const { data: toEmail } = await db
          .from("service_operators")
          .select("id, company, email, verification_token")
          .not("email", "is", null)
          .is("outreach_sent_at", null)
          .order("scraped_at", { ascending: false })
          .limit(maxEmails);

        for (const op of toEmail ?? []) {
          if (!op.email) continue;
          try {
            await sendOperatorOutreach(
              op.email,
              op.company,
              op.verification_token ?? undefined
            );
            await db
              .from("service_operators")
              .update({ outreach_sent_at: nowUTC.toISOString() })
              .eq("id", op.id);
            emailsSent++;
          } catch (emailErr) {
            lastEmailError = emailErr instanceof Error ? emailErr.message
              : ((emailErr as { message?: string })?.message ?? JSON.stringify(emailErr));
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
    emailsSent,
    bySource,
    error: runError,
    emailError: lastEmailError,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "manual",
  });
}
