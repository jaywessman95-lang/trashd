import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DEFAULT_REALTOR_SCRAPE_SETTINGS } from "@/lib/sold-homes/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  // Guard: if CRON_SECRET is not configured, reject all requests rather than
  // letting "Bearer undefined" accidentally bypass auth.
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pacific time check: only run 6am–8pm (13:00–03:00 UTC, PDT)
  const nowUTC = new Date();
  const ptHour = new Date(nowUTC.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getHours();

  if (ptHour < 6 || ptHour >= 20) {
    return NextResponse.json({ skipped: true, reason: "Outside 6am–8pm PT window", ptHour });
  }

  const settings = DEFAULT_REALTOR_SCRAPE_SETTINGS;
  const cutoffDate = new Date(Date.now() - settings.maxDaysSold * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const runMeta = {
    startedAt: nowUTC.toISOString(),
    ptHour,
    maxContactsPerSession: settings.maxContactsPerSession,
    maxDaysSold: settings.maxDaysSold,
    requireContact: settings.requireContact,
    soldSince: cutoffDate,
    sources: ["redfin", "homes_com", "realtor_com", "homesnap", "oc_recorder"]
  };

  // Scraper execution is wired here once Zyte + Supabase are connected.
  // Each connector is called in sequence, respecting maxContactsPerSession.
  // Listings without agent phone/email are skipped when requireContact = true.
  // Scored results are upserted into realtor_sold_listings table.

  return NextResponse.json({
    ok: true,
    run: runMeta,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "vercel-cron",
    message: "Realtor scrape session initiated. Connect Zyte API key and Supabase to activate live scraping."
  });
}
