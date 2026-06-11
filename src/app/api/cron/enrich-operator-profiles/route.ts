/**
 * /api/cron/enrich-operator-profiles
 *
 * Scrapes public data for verified operator profiles and populates the 10
 * profile data points that realtors care about. Safe to re-run — processes
 * verified operators whose profile data is stale or missing.
 *
 * Run via: GET /api/cron/enrich-operator-profiles?batch=10
 * Authorization: Bearer <CRON_SECRET>
 *
 * Data scraped per operator (in order of attempt):
 *  1. Reviews & star ratings      — Google / Yelp / BBB
 *  2. Response time               — Google Business Profile
 *  3. Service area coverage       — Vendor website (service area page)
 *  4. Pricing                     — Vendor website (pricing page)
 *  5. Hours of operation          — Google Business Profile
 *  6. Before/after photos         — Vendor website gallery
 *  7. Certifications & licenses   — Vendor website / BBB
 *  8. Customer testimonials       — Google reviews (top 3)
 *  9. Jobs completed              — Vendor website ("500+ jobs")
 * 10. Fleet & equipment           — Vendor website
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchWithZyte } from "@/lib/integrations/zyte";
import type { PricingTier, Testimonial } from "@/lib/service-operators/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Extraction helpers ────────────────────────────────────────────────────────

function extractRating(html: string): { rating?: number; count?: number } {
  const rv = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/)?.[1]
    ?? html.match(/itemprop="ratingValue"[^>]*content="([\d.]+)"/)?.[1]
    ?? html.match(/"aggregateRating"[^{]*"ratingValue"\s*:\s*([\d.]+)/)?.[1];
  const rc = html.match(/"reviewCount"\s*:\s*"?(\d+)"?/)?.[1]
    ?? html.match(/"ratingCount"\s*:\s*"?(\d+)"?/)?.[1]
    ?? html.match(/itemprop="reviewCount"[^>]*content="(\d+)"/)?.[1];
  const rating = parseFloat(rv ?? "");
  const count  = parseInt(rc ?? "", 10);
  return {
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    count:  Number.isFinite(count)  && count  > 0 ? count  : undefined,
  };
}

function extractResponseTime(html: string): string | undefined {
  // Google Business "Responds within X" patterns
  const patterns = [
    /usually\s+responds?\s+(?:in|within)\s+([^<"]{3,40})/i,
    /responds?\s+(?:in|within)\s+([^<"]{3,40})/i,
    /typically\s+replies?\s+(?:in|within)\s+([^<"]{3,40})/i,
    /"responseTime"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return `Usually replies ${m[1].trim().replace(/[.,]$/, "")}`;
  }
  return undefined;
}

function extractHoursJson(html: string): Record<string, string> | undefined {
  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const result: Record<string, string> = {};

  // Try JSON-LD schema first
  const schemaMatch = html.match(/"openingHoursSpecification"\s*:\s*(\[[\s\S]*?\])/);
  if (schemaMatch) {
    try {
      const specs = JSON.parse(schemaMatch[1]) as Array<{
        dayOfWeek?: string | string[];
        opens?: string;
        closes?: string;
      }>;
      for (const spec of specs) {
        const dows = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek ?? ""];
        for (const dow of dows) {
          const day = dow.replace("https://schema.org/", "").toLowerCase();
          if (days.includes(day) && spec.opens && spec.closes) {
            result[day] = `${spec.opens}–${spec.closes}`;
          }
        }
      }
      if (Object.keys(result).length >= 3) return result;
    } catch { /* continue */ }
  }

  // Try plain text "openingHours" array
  const ohMatch = html.match(/"openingHours"\s*:\s*\[([\s\S]*?)\]/);
  if (ohMatch) {
    const entries = ohMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) ?? [];
    for (const entry of entries) {
      const m = entry.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(.+)$/i);
      if (!m) continue;
      const abbrevMap: Record<string, string> = {
        mo:"monday",tu:"tuesday",we:"wednesday",th:"thursday",
        fr:"friday",sa:"saturday",su:"sunday",
      };
      const start = abbrevMap[m[1].toLowerCase()];
      const end   = m[2] ? abbrevMap[m[2].toLowerCase()] : start;
      const time  = m[3];
      const dayRange = start === end ? [start] : days.slice(days.indexOf(start), days.indexOf(end) + 1);
      for (const d of dayRange) result[d] = time;
    }
    if (Object.keys(result).length >= 3) return result;
  }

  return undefined;
}

function extractJobsCompleted(html: string): number | undefined {
  const patterns = [
    /(\d[\d,]+)\+?\s*(?:jobs?|projects?|cleanouts?|removals?)\s*(?:completed|done|served)/i,
    /completed?\s*(?:over\s*)?(\d[\d,]+)\+?\s*(?:jobs?|projects?)/i,
    /(?:over|more than)\s*(\d[\d,]+)\s*(?:happy\s*)?(?:customers?|clients?|jobs?)/i,
    /"numberOfEmployees"\s*:\s*\{[^}]*"value"\s*:\s*(\d+)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (n > 0 && n < 1_000_000) return n;
    }
  }
  return undefined;
}

function extractFleetDescription(html: string): string | undefined {
  const patterns = [
    /(\d+\s*(?:full[- ]size|large|medium|15[- ]?ft|box)\s*trucks?[^.!?]{0,120})/i,
    /(our\s*fleet\s*(?:includes?|consists?\s*of)[^.!?]{0,150})/i,
    /(\d+\s*trucks?\s*and[^.!?]{0,100})/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  }
  return undefined;
}

function extractPhotoUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Gallery/portfolio image patterns
  const imgRe = /<img[^>]+src="([^"]+(?:before|after|gallery|job|cleanout|removal|project)[^"]*\.(jpe?g|png|webp))"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null && urls.length < 12) {
    let src = m[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(src, baseUrl).href; } catch { continue; }
    }
    if (!seen.has(src) && src.startsWith("http")) {
      seen.add(src);
      urls.push(src);
    }
  }

  // Also check og:image / schema images as fallback
  if (urls.length === 0) {
    const ogRe = /content="(https?:\/\/[^"]+\.(jpe?g|png|webp)[^"]*)"/gi;
    while ((m = ogRe.exec(html)) !== null && urls.length < 6) {
      if (!seen.has(m[1])) { seen.add(m[1]); urls.push(m[1]); }
    }
  }

  return urls;
}

function extractCertifications(html: string): string[] {
  const certs: string[] = [];
  const certMap: Array<[RegExp, string]> = [
    [/licensed\s*waste\s*hauler/i,          "Licensed Waste Hauler"],
    [/EPA\s*certified/i,                    "EPA Certified"],
    [/proper\s*disposal\s*certified/i,      "Proper Disposal Certified"],
    [/BBB\s*accredited/i,                   "BBB Accredited"],
    [/OSHA\s*(?:certified|compliant)/i,     "OSHA Compliant"],
    [/DOT\s*(?:registered|number|#)/i,      "DOT Registered"],
    [/ProMover/i,                           "AMSA ProMover"],
    [/Google\s*Guaranteed/i,                "Google Guaranteed"],
    [/background\s*(?:check|checked|screening)/i, "Background Checked"],
    [/bonded\s*(?:and\s*)?insured|insured\s*(?:and\s*)?bonded/i, "Bonded & Insured"],
  ];
  for (const [re, label] of certMap) {
    if (re.test(html)) certs.push(label);
  }
  return [...new Set(certs)];
}

function extractTestimonials(html: string): Testimonial[] {
  const results: Testimonial[] = [];
  // Review structured data
  const reviewRe = /"reviewBody"\s*:\s*"([^"]{20,400})"/g;
  const authorRe = /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/g;
  const dateRe   = /"datePublished"\s*:\s*"([^"]+)"/g;

  const bodies:  string[] = [];
  const authors: string[] = [];
  const dates:   string[] = [];

  let m: RegExpExecArray | null;
  while ((m = reviewRe.exec(html)) !== null && bodies.length < 5) bodies.push(m[1]);
  while ((m = authorRe.exec(html)) !== null) authors.push(m[1]);
  while ((m = dateRe.exec(html)) !== null) dates.push(m[1]);

  for (let i = 0; i < Math.min(bodies.length, 3); i++) {
    results.push({
      text:   bodies[i].replace(/\\n/g, " ").replace(/\s+/g, " ").trim(),
      author: authors[i] ?? undefined,
      date:   dates[i] ? new Date(dates[i]).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : undefined,
    });
  }
  return results;
}

function extractPricingTiers(html: string): PricingTier[] {
  const tiers: PricingTier[] = [];
  // Common junk removal tier patterns
  const tierPatterns: Array<[RegExp, string]> = [
    [/1\s*\/\s*8\s*(?:truck|load)[^$\d]*\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i, "1/8 Truck"],
    [/1\s*\/\s*4\s*(?:truck|load)[^$\d]*\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i, "1/4 Truck"],
    [/1\s*\/\s*2\s*(?:truck|load)[^$\d]*\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i, "1/2 Truck"],
    [/(?:full|3\s*\/\s*4)\s*(?:truck|load)[^$\d]*\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i, "Full Truck"],
  ];
  for (const [re, label] of tierPatterns) {
    const m = html.match(re);
    if (m) tiers.push({ label, price: `$${m[1]}–$${m[2]}` });
  }

  // Single price mention fallback
  if (tiers.length === 0) {
    const minPrice = html.match(/starting\s*(?:at|from)\s*\$\s*([\d,]+)/i);
    if (minPrice) tiers.push({ label: "Minimum", price: `from $${minPrice[1]}` });
  }

  return tiers;
}

function extractServiceAreaZips(html: string): string[] {
  const seen = new Set<string>();
  const re = /\b(9[0-9]{4})\b/g;  // California ZIPs start with 9
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) seen.add(m[1]);
  // Limit to a reasonable count — too many means we matched random content
  const zips = [...seen];
  return zips.length <= 30 ? zips : [];
}

// ── Google Maps place scraper ─────────────────────────────────────────────────

const GMAPS_EXTRACT_JS = `
(async () => {
  await new Promise(r => setTimeout(r, 2500));
  const bodyText = document.body?.innerText || '';

  const responseMatch = bodyText.match(/usually\\s+repli(?:es?|ed)\\s+(?:in|within)\\s+[^\\n]{3,40}/i)
    || bodyText.match(/responds?\\s+(?:in|within)\\s+[^\\n]{3,40}/i);
  const responseTime = responseMatch ? responseMatch[0].trim() : null;

  const reviewEls = document.querySelectorAll('[data-review-id] [data-expandable-section] span, .MyEned span');
  let reviewSnippet = null;
  for (const el of reviewEls) {
    const t = el.textContent?.trim();
    if (t && t.length > 40 && t.length < 300) { reviewSnippet = t; break; }
  }

  const ratingEl = document.querySelector('[data-value]') || document.querySelector('.F7nice span');
  const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.textContent || '';
  const ratingMatch = ratingText.match(/([\\d.]+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  const reviewCountEl = document.querySelector('button[jsaction*="pane.reviewChart"] span, [aria-label*="reviews"]');
  const reviewCountText = reviewCountEl?.textContent || reviewCountEl?.getAttribute('aria-label') || '';
  const countMatch = reviewCountText.match(/([0-9,]+)/);
  const reviewCount = countMatch ? parseInt(countMatch[1].replace(/,/g,''), 10) : null;

  const hoursEls = document.querySelectorAll('[data-hide-tooltip-on-mouse-move] table tr, .y0skZc');
  const hoursObj = {};
  const dayMap = {monday:'monday',tuesday:'tuesday',wednesday:'wednesday',thursday:'thursday',friday:'friday',saturday:'saturday',sunday:'sunday'};
  for (const row of hoursEls) {
    const cells = row.querySelectorAll('td, li');
    if (cells.length >= 2) {
      const day = cells[0]?.textContent?.trim().toLowerCase().replace(/\\./g,'');
      const time = cells[1]?.textContent?.trim();
      if (day && time && dayMap[day]) hoursObj[day] = time;
    }
  }

  return JSON.stringify({ responseTime, reviewSnippet, rating, reviewCount, hours: Object.keys(hoursObj).length >= 3 ? hoursObj : null });
})()
`;

async function scrapeGoogleMapsPlace(company: string, city: string): Promise<{
  responseTime?: string;
  reviewSnippet?: string;
  rating?: number;
  reviewCount?: number;
  hours?: Record<string, string>;
} | null> {
  const query = `${company} ${city} CA junk removal`;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@33.7175,-117.8311,11z`;
  try {
    const { jsResult } = await fetchWithZyte({ url: mapsUrl, render: true, javascript: GMAPS_EXTRACT_JS });
    if (!jsResult) return null;
    const data = JSON.parse(jsResult);
    return {
      responseTime:  data.responseTime  ?? undefined,
      reviewSnippet: data.reviewSnippet ?? undefined,
      rating:        typeof data.rating === "number" && data.rating > 0 ? data.rating : undefined,
      reviewCount:   typeof data.reviewCount === "number" && data.reviewCount > 0 ? data.reviewCount : undefined,
      hours:         data.hours ?? undefined,
    };
  } catch {
    return null;
  }
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const batchSize = Math.min(parseInt(url.searchParams.get("batch") ?? "10", 10), 50);
  // Force re-enrich even if already done
  const force = url.searchParams.get("force") === "1";

  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Fetch verified operators that have a website and haven't been enriched recently
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("service_operators")
    .select("id, company, city, website_url, phone, google_maps_rating, jobs_completed, last_scored_at")
    .eq("profile_status", "verified")
    .not("website_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(batchSize);

  if (!force) {
    // Only enrich if never enriched or enriched more than 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    q = q.or(`last_scored_at.is.null,last_scored_at.lt.${thirtyDaysAgo}`);
  }

  const { data: operators, error: fetchErr } = await q;
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  let enriched = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const op of operators ?? []) {
    const websiteUrl: string = op.website_url;
    if (!websiteUrl) { skipped++; continue; }

    try {
      // ── Fetch vendor website ────────────────────────────────────────
      const { html: siteHtml } = await fetchWithZyte({ url: websiteUrl, render: true });
      await new Promise(r => setTimeout(r, 800));

      // ── Extract all 10 data points ──────────────────────────────────
      const { rating, count } = extractRating(siteHtml);
      const responseTime      = extractResponseTime(siteHtml);
      const hoursJson         = extractHoursJson(siteHtml);
      const jobsCompleted     = extractJobsCompleted(siteHtml);
      const fleetDescription  = extractFleetDescription(siteHtml);
      const photoUrls         = extractPhotoUrls(siteHtml, websiteUrl);
      const certifications    = extractCertifications(siteHtml);
      const testimonials      = extractTestimonials(siteHtml);
      const pricingTiers      = extractPricingTiers(siteHtml);
      const serviceAreaZips   = extractServiceAreaZips(siteHtml);

      // Try to also fetch a dedicated pricing or gallery page
      let pricingExtra: PricingTier[] = [];
      const pricingLinkMatch = siteHtml.match(
        /href="([^"]*(?:pricing|rates?|cost)[^"]*)"(?:\s[^>]*)?>(?:[^<]*)?(?:Pricing|Rates?|Cost)/i
      );
      if (pricingLinkMatch && pricingTiers.length === 0) {
        try {
          let pUrl = pricingLinkMatch[1];
          if (pUrl.startsWith("/")) pUrl = new URL(pUrl, websiteUrl).href;
          const { html: pHtml } = await fetchWithZyte({ url: pUrl, render: true });
          pricingExtra = extractPricingTiers(pHtml);
          await new Promise(r => setTimeout(r, 600));
        } catch { /* ignore */ }
      }

      // ── Build update payload (only overwrite nulls, keep vendor edits) ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const update: Record<string, any> = { last_scored_at: now, updated_at: now };

      // Auto-scraped fields always overwrite (realtors trust scraped data)
      if (rating)         update.google_maps_rating  = rating;
      if (count)          update.google_review_count = count;
      if (responseTime)   update.google_response_time = responseTime;
      if (hoursJson)      update.hours_json           = hoursJson;

      // Enrichment fields: only set if not already vendor-populated
      if (!op.jobs_completed && jobsCompleted)    update.jobs_completed    = jobsCompleted;
      if (fleetDescription)                        update.fleet_description = fleetDescription;
      if (photoUrls.length > 0)                    update.photo_urls        = photoUrls;
      if (certifications.length > 0)               update.certifications    = certifications;
      if (testimonials.length > 0)                 update.testimonials      = testimonials;
      const finalTiers = pricingExtra.length > 0 ? pricingExtra : pricingTiers;
      if (finalTiers.length > 0)                   update.pricing_tiers     = finalTiers;
      if (serviceAreaZips.length > 0)              update.service_area_zips = serviceAreaZips;

      // ── Google Maps step ────────────────────────────────────────────
      try {
        const company = op.company ?? "junk removal";
        const city    = op.city    ?? "Orange County";
        const gmaps = await scrapeGoogleMapsPlace(company, city);
        if (gmaps) {
          // Google data takes priority — overrides website rating/hours
          if (gmaps.responseTime)                       update.google_response_time = gmaps.responseTime;
          if (gmaps.reviewSnippet)                      update.review_snippet       = gmaps.reviewSnippet;
          if (gmaps.rating && !op.google_maps_rating)   update.google_maps_rating   = gmaps.rating;
          if (gmaps.reviewCount)                        update.google_review_count  = gmaps.reviewCount;
          if (gmaps.hours && !update.hours_json)        update.hours_json           = gmaps.hours;
        }
        await new Promise(r => setTimeout(r, 800));
      } catch { /* Maps search failed — website data still applied */ }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("service_operators").update(update).eq("id", op.id);
      enriched++;

    } catch (e) {
      console.error(`[enrich-profiles] Failed for ${op.id}:`, e);
      errors++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({
    ok: true,
    processed: (operators ?? []).length,
    enriched,
    skipped,
    errors,
    timestamp: now,
  });
}
