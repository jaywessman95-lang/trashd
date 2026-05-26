import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DEFAULT_REALTOR_SCRAPE_SETTINGS } from "@/lib/sold-homes/types";
import { scrapeHomeFinderListings } from "@/lib/sold-homes/scrapers/homefinder-listings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowUTC = new Date();
  const ptHour = new Date(nowUTC.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getHours();
  const force = new URL(request.url).searchParams.get("force") === "true";

  if (!force && (ptHour < 6 || ptHour >= 20)) {
    return NextResponse.json({ skipped: true, reason: "Outside 6am–8pm PT window", ptHour });
  }

  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }

  const settings = DEFAULT_REALTOR_SCRAPE_SETTINGS;

  let leadsFound = 0;
  let upserted = 0;
  let scraperError: string | null = null;

  try {
    const leads = await scrapeHomeFinderListings(settings.maxContactsPerSession);
    leadsFound = leads.length;

    if (leads.length > 0 && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createSupabaseAdminClient();

      const rows = leads.map((l) => ({
        id: l.id,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip ?? null,
        sale_price: l.salePrice,
        sold_date: l.soldDate,
        property_type: l.propertyType,
        sale_type: l.saleType,
        cash_sale: l.cashSale ?? false,
        score: l.score,
        priority: l.priority,
        score_reason: l.scoreReason ?? null,
        listing_url: l.listingUrl ?? null,
        source: l.source,
        agent_name: l.agentName ?? null,
        agent_phone: l.agentPhone ?? null,
        agent_email: l.agentEmail ?? null,
        agent_brokerage: l.agentBrokerage ?? null,
        agent_image_url: l.agentImageUrl ?? null,
        agent_profile_status: l.agentProfileStatus ?? "unverified",
        updated_at: new Date().toISOString(),
      }));

      const { error } = await db
        .from("realtor_sold_listings")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

      if (error) throw error;
      upserted = rows.length;
    }
  } catch (e) {
    scraperError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    ok: scraperError === null,
    startedAt: nowUTC.toISOString(),
    ptHour,
    maxLeads: settings.maxContactsPerSession,
    sources: ["homefinder"],
    leadsFound,
    upserted,
    error: scraperError,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "manual",
  });
}
