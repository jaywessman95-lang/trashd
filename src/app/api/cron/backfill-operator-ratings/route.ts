/**
 * /api/cron/backfill-operator-ratings
 *
 * One-time / on-demand route that re-scrapes existing YellowPages operator
 * profiles to populate rating + review data for the 3-pillar scorer.
 * Safe to re-run — only processes rows where google_maps_rating IS NULL.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchWithZyte } from "@/lib/integrations/zyte";
import { computeVendorScore, tierToPriority } from "@/lib/service-operators/scoring";
import { isCustomDomain } from "@/lib/service-operators/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const BAD_EMAIL_RE = /noreply|no-reply|privacy|legal|abuse@|yellowpages|superpages|google\.|cloudflare|amazonaws|\.png|\.jpg|\.js$/i;

function extractRating(html: string): { rating?: number; reviewCount?: number } {
  const rv = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/)?.[1]
    ?? html.match(/itemprop="ratingValue"[^>]*content="([\d.]+)"/)?.[1]
    ?? html.match(/itemprop="ratingValue"[^>]*>([\d.]+)</)?.[1];
  const rc = html.match(/"reviewCount"\s*:\s*"?(\d+)"?/)?.[1]
    ?? html.match(/"ratingCount"\s*:\s*"?(\d+)"?/)?.[1]
    ?? html.match(/itemprop="reviewCount"[^>]*content="(\d+)"/)?.[1]
    ?? html.match(/itemprop="reviewCount"[^>]*>(\d+)</)?.[1];
  const rating = parseFloat(rv ?? "");
  const reviewCount = parseInt(rc ?? "", 10);
  return {
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : undefined,
  };
}

function extractHours(html: string): string | undefined {
  const m = html.match(/(?:Open|Closes?)\s+(?:24\s*[Hh]ours|24\/7|\d{1,2}(?::\d{2})?\s*[APap][Mm])/);
  return m?.[0]?.trim();
}

function extractHasInsured(html: string): boolean {
  return /licensed|insured|bonded|liability/i.test(html);
}

function extractProfileUrl(html: string): string | undefined {
  // YP profile URLs are stored in the html as the canonical link
  const m = html.match(/itemprop="url"[^>]*(?:content|href)="(https?:\/\/www\.yellowpages\.com\/[^"]+)"/);
  return m?.[1];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const batchSize = Math.min(parseInt(url.searchParams.get("batch") ?? "30", 10), 100);

  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Fetch unrated YP operators that have a profile_url we can re-scrape
  // We use their id (md5 of "yp::<email|phone|url>") — but we need the original URL.
  // YP operators have source = 'yellowpages_profile' and no google_maps_rating.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: unrated, error } = await (db as any)
    .from("service_operators")
    .select("id, company, email, phone, website_url, score, priority, source")
    .eq("source", "yellowpages_profile")
    .is("google_maps_rating", null)
    .not("phone", "is", null)
    .order("score", { ascending: false })
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const op of unrated ?? []) {
    // Build the YP search URL using the phone number to find the profile
    const phone = op.phone?.replace(/\D/g, "").slice(-10);
    if (!phone) { skipped++; continue; }

    // Search YP by phone to find the profile URL
    const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(op.company ?? "junk removal")}&geo_location_terms=orange+county+ca`;

    try {
      const { html: searchHtml } = await fetchWithZyte({ url: searchUrl, stealth: true });

      // Find the profile URL for this operator by matching phone in the search results
      const profileUrlMatch = searchHtml.match(
        new RegExp(`href="(/[^"]+/mip/[^"?#]+)"[^]*?${phone.slice(0, 6)}`)
      ) ?? searchHtml.match(/href="(\/[^"]+\/mip\/[^"?#]+)"/);

      if (!profileUrlMatch) { skipped++; continue; }

      const profileUrl = "https://www.yellowpages.com" + profileUrlMatch[1];
      const { html: profileHtml } = await fetchWithZyte({ url: profileUrl, stealth: true });

      const { rating, reviewCount } = extractRating(profileHtml);
      const hoursDescription = extractHours(profileHtml);
      const hasLicensedInsured = extractHasInsured(profileHtml);
      const hasCustomDomain = isCustomDomain(op.email ?? "");

      if (rating === undefined || reviewCount === undefined) { skipped++; continue; }

      const result = computeVendorScore({
        hoursDescription,
        googleReviewCount: reviewCount,
        googleMapsRating: rating,
        hasLicensedInsured,
        websiteUrl: op.website_url,
        phone: op.phone,
        email: op.email,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("service_operators").update({
        google_maps_rating:    rating,
        google_review_count:   reviewCount,
        hours_description:     hoursDescription ?? null,
        availability_score:    result.scores.availability,
        reliability_score:     result.scores.reliability,
        professionalism_score: result.scores.professionalism,
        confidence_tier:       result.disqualified ? "not_shown" : result.tier,
        score:                 result.scores.total,
        priority:              tierToPriority(result.tier),
        last_scored_at:        now,
        updated_at:            now,
      }).eq("id", op.id);

      enriched++;
      await new Promise(r => setTimeout(r, 600));
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: (unrated ?? []).length,
    enriched,
    skipped,
    errors,
  });
}
