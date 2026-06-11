/**
 * /api/cron/scrape-maps-vendors
 *
 * PRIMARY operator scraper — Google Maps only.
 * 1. Scrapes Google Maps for top OC junk/moving vendors via JS injection
 * 2. Deduplicates against existing DB rows (by name hash)
 * 3. Scores each vendor with Infermatic AI (realtor-focused 3-pillar scoring)
 * 4. Upserts results into service_operators
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { scrapeGoogleMapsVendors } from "@/lib/service-operators/scrapers/google-maps";
import { isStorageCompany } from "@/lib/service-operators/types";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const INFERMATIC_URL   = "https://api.totalgpt.ai/v1/chat/completions";
const INFERMATIC_MODEL = "Sao10K-72B-Qwen2.5-Kunou-v1-FP8-Dynamic";

type AiScore = {
  availability_score: number;
  reliability_score: number;
  professionalism_score: number;
  review_credibility_score: number;
  total_score: number;
  confidence_tier: string;
  realtor_pitch: string;
  red_flags: string[];
};

async function aiScore(
  name: string,
  rating: number,
  reviewCount: number,
  is24h: boolean,
  hours: string | undefined,
  apiKey: string
): Promise<AiScore | null> {
  const prompt = `Score this OC junk removal / moving company for real estate agent referrals.

COMPANY: ${name}
GOOGLE RATING: ${rating}/5.0 (${reviewCount} reviews)
HOURS: ${is24h ? "Open 24 hours" : hours || "Standard business hours"}

Realtor priorities:
1. AVAILABILITY (0-25): 24h=25, closes after 9pm=18, closes 7-9pm=12, closes before 7pm=5
2. RELIABILITY (0-35): review count + rating. 1000+reviews=20pts, 500+=16, 200+=12, 100+=8, 50+=4, <20=0. Rating 5.0=+15, 4.8+=+12, 4.5+=+8, 4.0+=+4, <4.0=0
3. PROFESSIONALISM (0-25): no data available = 5 baseline
4. REVIEW_CREDIBILITY (0-15): rating 4.8+&200+reviews=15, 4.5+&100+=10, 4.0+&50+=5, else 0

Respond ONLY in JSON:
{"availability_score":<0-25>,"reliability_score":<0-35>,"professionalism_score":<0-25>,"review_credibility_score":<0-15>,"total_score":<sum max 100>,"confidence_tier":<"elite" if 85+,"verified" if 70-84,"strong" if 55-69,"good" if 40-54,"not_shown" if below 40>,"realtor_pitch":"<12 words max>","red_flags":[]}`;

  try {
    const res = await fetch(INFERMATIC_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: INFERMATIC_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 250,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]+\}/);
    return m ? (JSON.parse(m[0]) as AiScore) : null;
  } catch { return null; }
}

function tierToPriority(tier: string): string {
  const map: Record<string, string> = { elite: "elite", verified: "verified", strong: "hot_now", good: "strong" };
  return map[tier] ?? "good";
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }
  if (!env.INFERMATIC_API_KEY) {
    return NextResponse.json({ error: "INFERMATIC_API_KEY not configured" }, { status: 500 });
  }

  const now = new Date();
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  // Run between 2–6 AM PT unless forced
  const ptHour = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getHours();
  if (!force && !(ptHour >= 2 && ptHour < 6)) {
    return NextResponse.json({ skipped: true, reason: "Outside 2–6 AM PT window", ptHour });
  }

  const db = createSupabaseAdminClient();
  let mapsScraped = 0;
  let inserted = 0;
  let updated = 0;
  let runError: string | null = null;

  try {
    // ── Step 1: Scrape Google Maps ────────────────────────────────────────
    const vendors = await scrapeGoogleMapsVendors();
    mapsScraped = vendors.length;

    if (mapsScraped === 0) {
      return NextResponse.json({ ok: false, error: "Maps scraper returned 0 results", mapsScraped: 0, inserted: 0, updated: 0 });
    }

    // Filter out storage/self-storage facilities before processing
    const filteredVendors = vendors.filter(v => !isStorageCompany(v.name));
    mapsScraped = filteredVendors.length;

    if (mapsScraped === 0) {
      return NextResponse.json({ ok: false, error: "Maps scraper returned 0 results after filtering", mapsScraped: 0, inserted: 0, updated: 0 });
    }

    // ── Step 2: Load existing IDs to detect new vs existing ──────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRows } = await (db as any)
      .from("service_operators")
      .select("id")
      .in("id", filteredVendors.map(v => v.id));

    const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id));

    // ── Step 3: Score and upsert each vendor ──────────────────────────────
    for (const vendor of filteredVendors) {
      const isNew = !existingIds.has(vendor.id);
      const nowIso = now.toISOString();

      // AI score
      const scored = await aiScore(
        vendor.name,
        vendor.rating,
        vendor.reviewCount,
        vendor.is24h,
        vendor.hours,
        env.INFERMATIC_API_KEY!
      );

      const score = scored?.total_score ?? 0;
      const tier = scored?.confidence_tier ?? "not_shown";

      const row = {
        id: vendor.id,
        company: vendor.name,
        phone: vendor.phone ?? null,
        address: vendor.address ?? null,
        city: "Orange County",
        state: "CA",
        service_type: vendor.serviceType,
        source: "google_maps",
        score,
        priority: tierToPriority(tier),
        profile_status: "unverified",
        scraped_at: nowIso,
        google_maps_rating: vendor.rating,
        google_review_count: vendor.reviewCount,
        hours_description: vendor.is24h ? "Open 24 hours" : vendor.hours ?? null,
        availability_score: scored?.availability_score ?? 0,
        reliability_score: scored?.reliability_score ?? 0,
        professionalism_score: scored?.professionalism_score ?? 0,
        confidence_tier: tier,
        ai_bio: scored?.realtor_pitch ?? null,
        last_scored_at: nowIso,
        verification_token: crypto.randomUUID(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any)
        .from("service_operators")
        .upsert(row, { onConflict: "id", ignoreDuplicates: false });

      if (!error) {
        if (isNew) inserted++; else updated++;
      }

      // Small delay to be polite to Infermatic
      await new Promise(r => setTimeout(r, 200));
    }

  } catch (e) {
    runError = e instanceof Error ? e.message : JSON.stringify(e);
  }

  return NextResponse.json({
    ok: runError === null,
    startedAt: now.toISOString(),
    mapsScraped,
    inserted,
    updated,
    error: runError,
    triggeredBy: request.headers.get("x-cron-job-org") ? "cron-job.org" : "manual",
  });
}
