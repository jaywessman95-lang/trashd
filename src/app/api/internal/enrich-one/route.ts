/**
 * /api/internal/enrich-one?id=<operatorId>&secret=<CRON_SECRET>
 *
 * Enriches a single verified operator's profile immediately — called
 * automatically from the activation page the moment they verify.
 *
 * Pipeline (in order):
 *  1. Fetch operator website → extract photos, certs, pricing, hours,
 *     testimonials, jobs completed, fleet description, service area ZIPs
 *  2. Search Google Maps for the operator → extract response time,
 *     accurate star rating, review count, review snippet, hours
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchWithZyte } from "@/lib/integrations/zyte";
import type { PricingTier, Testimonial } from "@/lib/service-operators/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// ── Extraction helpers (shared with enrich-operator-profiles) ─────────────────

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

  // Handle string form: "openingHours": "Mo-Su 00:00-23:59" or "Mo-Su 07:00-19:00"
  const ohStringMatch = html.match(/"openingHours"\s*:\s*"([^"]+)"/);
  if (ohStringMatch) {
    const abbrevMap: Record<string, string> = {
      mo:"monday",tu:"tuesday",we:"wednesday",th:"thursday",
      fr:"friday",sa:"saturday",su:"sunday",
    };
    const entries = ohStringMatch[1].split(/[,;]\s*/);
    for (const entry of entries) {
      const m = entry.trim().match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(.+)$/i);
      if (!m) continue;
      const start = abbrevMap[m[1].toLowerCase()];
      const end   = m[2] ? abbrevMap[m[2].toLowerCase()] : start;
      const rawTime = m[3].trim();
      const timeLabel = rawTime === "00:00-23:59" || rawTime === "00:00-00:00" ? "Open 24 hours" : rawTime;
      const dayRange = start === end ? [start] : days.slice(days.indexOf(start), days.indexOf(end) + 1);
      for (const d of dayRange) result[d] = timeLabel;
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

  function addUrl(src: string) {
    if (!src || seen.has(src)) return;
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) { try { src = new URL(src, baseUrl).href; } catch { return; } }
    if (!src.startsWith("http")) return;
    // skip logos, icons, sprites, favicons, tiny thumbnails
    if (/logo|icon|sprite|favicon|placeholder|arrow|button|badge/i.test(src)) return;
    if (/\.(svg|gif)$/i.test(src)) return;
    seen.add(src);
    urls.push(src);
  }

  // Determine the registrable domain for filtering
  let baseDomain = "";
  try {
    baseDomain = new URL(baseUrl).hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
  } catch { /* ignore */ }

  function isCompanyImage(src: string): boolean {
    if (!src.startsWith("http")) return false;
    try {
      const host = new URL(src).hostname.replace(/^www\./, "");
      if (baseDomain && host.endsWith(baseDomain)) return true;
    } catch { /* ignore */ }
    // Known content CDN patterns tied to website builders
    const isContentPath = /\/wp-content\/uploads\/|\/dms3rep\/|\/uploads\/|\/images\/|\/photos\/|\/gallery\//i.test(src);
    const isKnownCdn = /lirp\.cdn-website\.com|lirp-cdn\.multiscreensite\.com|cdn\.shopify\.com|squarespace-cdn\.com/i.test(src);
    return isContentPath || isKnownCdn;
  }

  // 1. Priority: job-relevant keywords in the FILENAME (last path segment only)
  const keywordRe = /<img[^>]+src="([^"]+\.(jpe?g|png|webp))"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = keywordRe.exec(html)) !== null && urls.length < 12) {
    const src = m[1];
    if (!isCompanyImage(src)) continue;
    // Check keyword in the filename part only
    const filename = src.split("/").pop()?.split("?")[0]?.toLowerCase() ?? "";
    if (/before|after|gallery|job|cleanout|removal|project|truck|fleet|crew|team|work|photo|img[-_]/i.test(filename)) {
      addUrl(src);
    }
  }

  // 2. Any company-domain images as fallback
  if (urls.length < 6) {
    const cdnRe = /<img[^>]+src="(https?:\/\/[^"]+\.(jpe?g|png|webp))"[^>]*>/gi;
    while ((m = cdnRe.exec(html)) !== null && urls.length < 12) {
      if (isCompanyImage(m[1])) addUrl(m[1]);
    }
  }

  return urls.slice(0, 10);
}

function extractCertifications(html: string): string[] {
  const certs: string[] = [];
  const certMap: Array<[RegExp, string]> = [
    [/licensed\s*waste\s*hauler/i,     "Licensed Waste Hauler"],
    [/EPA\s*certified/i,               "EPA Certified"],
    [/proper\s*disposal\s*certified/i, "Proper Disposal Certified"],
    [/BBB\s*accredited/i,              "BBB Accredited"],
    [/OSHA\s*(?:certified|compliant)/i,"OSHA Compliant"],
    [/DOT\s*(?:registered|number|#)/i, "DOT Registered"],
    [/ProMover/i,                      "AMSA ProMover"],
    [/Google\s*Guaranteed/i,           "Google Guaranteed"],
    [/background\s*(?:check|checked|screening)/i, "Background Checked"],
    [/bonded\s*(?:and\s*|&\s*)?insured|insured\s*(?:and\s*|&\s*)?bonded/i, "Bonded & Insured"],
    [/licensed\s*(?:and\s*|&amp;\s*|&\s*)?insured|insured\s*(?:and\s*|&amp;\s*|&\s*)?licensed/i, "Licensed & Insured"],
  ];
  for (const [re, label] of certMap) {
    if (re.test(html)) certs.push(label);
  }
  return [...new Set(certs)];
}

function extractTestimonials(html: string): Testimonial[] {
  const results: Testimonial[] = [];
  const bodyRe   = /"reviewBody"\s*:\s*"([^"]{20,400})"/g;
  const authorRe = /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/g;
  const dateRe   = /"datePublished"\s*:\s*"([^"]+)"/g;
  const bodies: string[] = []; const authors: string[] = []; const dates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = bodyRe.exec(html)) !== null && bodies.length < 5) bodies.push(m[1]);
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

function extractSchemaOrgDescription(html: string): string | undefined {
  const m = html.match(/"description"\s*:\s*"([^"]{20,300})"/);
  if (m) {
    const desc = m[1].replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
    if (desc.length >= 20) return desc;
  }
  return undefined;
}

function extractSchemaAddress(html: string): { city?: string; state?: string; zip?: string; address?: string } {
  const cityM   = html.match(/"addressLocality"\s*:\s*"([^"]+)"/);
  const stateM  = html.match(/"addressRegion"\s*:\s*"([A-Z]{2})"/);
  const zipM    = html.match(/"postalCode"\s*:\s*"(\d{5})"/);
  const streetM = html.match(/"streetAddress"\s*:\s*"([^"]+)"/);
  return {
    city:    cityM?.[1],
    state:   stateM?.[1],
    zip:     zipM?.[1],
    address: streetM?.[1],
  };
}

function extractPricingTiers(html: string): PricingTier[] {
  const tiers: PricingTier[] = [];
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
  if (tiers.length === 0) {
    const minPrice = html.match(/starting\s*(?:at|from)\s*\$\s*([\d,]+)/i);
    if (minPrice) tiers.push({ label: "Minimum", price: `from $${minPrice[1]}` });
  }
  return tiers;
}

function extractLogoUrl(html: string, baseUrl: string): string | undefined {
  // 1. OpenGraph image
  const ogM = html.match(/<meta\s+(?:property="og:image"|name="og:image")\s+content="([^"]+)"/i)
    ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  if (ogM?.[1]) {
    let u = ogM[1].trim();
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) { try { u = new URL(u, baseUrl).href; } catch { u = ""; } }
    if (u.startsWith("http") && !/placeholder|default|blank/i.test(u)) return u;
  }
  // 2. Schema.org logo
  const slM = html.match(/"logo"\s*:\s*\{\s*[^}]*"url"\s*:\s*"([^"]+)"/);
  if (slM?.[1]) {
    let u = slM[1].trim();
    if (u.startsWith("/")) { try { u = new URL(u, baseUrl).href; } catch { u = ""; } }
    if (u.startsWith("http")) return u;
  }
  // 3. Twitter card image
  const twM = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
  if (twM?.[1]) {
    let u = twM[1].trim();
    if (u.startsWith("/")) { try { u = new URL(u, baseUrl).href; } catch { u = ""; } }
    if (u.startsWith("http")) return u;
  }
  return undefined;
}

function extractServiceAreaZips(html: string): string[] {
  const seen = new Set<string>();
  // Only California ZIPs: 90000–96199
  const re = /\b(9(?:0[0-9]{3}|[1-5][0-9]{3}|6[01][0-9]{2}))\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) seen.add(m[1]);
  const zips = [...seen];
  return zips.length <= 30 ? zips : [];
}

// ── Google Maps place page scraper ────────────────────────────────────────────

const GMAPS_EXTRACT_JS = `
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  const bodyText = document.body?.innerText || '';

  // Response time
  const responseMatch = bodyText.match(/usually\\s+repli(?:es?|ed)\\s+(?:in|within)\\s+[^\\n]{3,40}/i)
    || bodyText.match(/responds?\\s+(?:in|within)\\s+[^\\n]{3,40}/i);
  const responseTime = responseMatch ? responseMatch[0].trim() : null;

  // Review snippet
  const reviewEls = document.querySelectorAll('[data-review-id] [data-expandable-section] span, .MyEned span, .wiI7pd');
  let reviewSnippet = null;
  for (const el of reviewEls) {
    const t = el.textContent?.trim();
    if (t && t.length > 40 && t.length < 300) { reviewSnippet = t; break; }
  }

  // Rating & count
  const ratingEl = document.querySelector('[data-value]') || document.querySelector('.F7nice span');
  const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.textContent || '';
  const ratingMatch = ratingText.match(/([\\d.]+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  const reviewCountEl = document.querySelector('button[jsaction*="pane.reviewChart"] span, [aria-label*="reviews"]');
  const reviewCountText = reviewCountEl?.textContent || reviewCountEl?.getAttribute('aria-label') || '';
  const countMatch = reviewCountText.match(/([0-9,]+)/);
  const reviewCount = countMatch ? parseInt(countMatch[1].replace(/,/g,''), 10) : null;

  // Hours
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

  // Photos — collect Google Maps business photos (lh3.googleusercontent.com)
  const photoUrls = [];
  const seen = new Set();
  const allImgs = document.querySelectorAll('img[src*="googleusercontent"], img[src*="ggpht"], button img');
  for (const img of allImgs) {
    let src = img.src || img.getAttribute('src') || '';
    if (!src || seen.has(src)) continue;
    // Skip icons, avatars (small), map tiles
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if ((w > 0 && w < 40) || (h > 0 && h < 40)) continue;
    // Upscale Google Photos URLs to 800px width
    if (src.includes('googleusercontent') || src.includes('ggpht')) {
      src = src.replace(/=w\\d+-h\\d+/, '=w800-h600').replace(/=s\\d+/, '=s800');
      if (!seen.has(src)) { seen.add(src); photoUrls.push(src); }
    }
    if (photoUrls.length >= 8) break;
  }

  // Business thumbnail (hero image)
  let thumbnail = null;
  const heroImg = document.querySelector('.RZ66Rb img, .heroHeaderImage img, [data-photo-index="0"] img');
  if (heroImg) {
    let s = heroImg.src || heroImg.getAttribute('src') || '';
    if (s) thumbnail = s.replace(/=w\\d+-h\\d+/, '=w400-h300').replace(/=s\\d+/, '=s400');
  }

  return JSON.stringify({ responseTime, reviewSnippet, rating, reviewCount, hours: Object.keys(hoursObj).length >= 3 ? hoursObj : null, photoUrls, thumbnail });
})()
`;

async function scrapeGoogleMapsPlace(company: string, city: string): Promise<{
  responseTime?: string;
  reviewSnippet?: string;
  rating?: number;
  reviewCount?: number;
  hours?: Record<string, string>;
  photoUrls?: string[];
  thumbnail?: string;
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
      photoUrls:     Array.isArray(data.photoUrls) && data.photoUrls.length > 0 ? data.photoUrls : undefined,
      thumbnail:     typeof data.thumbnail === "string" && data.thumbnail.startsWith("http") ? data.thumbnail : undefined,
    };
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id     = url.searchParams.get("id");
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!env.ZYTE_API_KEY) {
    return NextResponse.json({ error: "ZYTE_API_KEY not configured" }, { status: 500 });
  }

  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: op } = await (db as any)
    .from("service_operators")
    .select("id, company, city, state, zip, address, website_url, jobs_completed, google_maps_rating, tagline, image_url")
    .eq("id", id)
    .maybeSingle();

  if (!op) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { last_scored_at: now, updated_at: now };

  // ── Step 1: Scrape vendor website ─────────────────────────────────────────
  if (op.website_url) {
    try {
      const { html } = await fetchWithZyte({ url: op.website_url, render: true });

      const { rating, count } = extractRating(html);
      const hoursJson         = extractHoursJson(html);
      const jobsCompleted     = extractJobsCompleted(html);
      const fleetDescription  = extractFleetDescription(html);
      const photoUrls         = extractPhotoUrls(html, op.website_url);
      const certifications    = extractCertifications(html);
      const testimonials      = extractTestimonials(html);
      const pricingTiers      = extractPricingTiers(html);
      const serviceAreaZips   = extractServiceAreaZips(html);
      const logoUrl           = extractLogoUrl(html, op.website_url);

      const schemaDesc    = extractSchemaOrgDescription(html);
      const schemaAddress = extractSchemaAddress(html);

      if (rating)                              update.google_maps_rating  = rating;
      if (count)                               update.google_review_count = count;
      if (hoursJson)                           update.hours_json          = hoursJson;
      if (!op.jobs_completed && jobsCompleted) update.jobs_completed      = jobsCompleted;
      if (fleetDescription)                    update.fleet_description   = fleetDescription;
      if (photoUrls.length > 0)               update.photo_urls          = photoUrls;
      if (certifications.length > 0)           update.certifications      = certifications;
      if (testimonials.length > 0)             update.testimonials        = testimonials;
      if (pricingTiers.length > 0)             update.pricing_tiers       = pricingTiers;
      if (serviceAreaZips.length > 0)          update.service_area_zips   = serviceAreaZips;
      if (logoUrl && !op.image_url)            update.image_url           = logoUrl;
      if (!op.tagline && schemaDesc)           update.tagline             = schemaDesc;
      if (!op.city    && schemaAddress.city)   update.city                = schemaAddress.city;
      if (!op.state   && schemaAddress.state)  update.state               = schemaAddress.state;
      if (!op.zip     && schemaAddress.zip)    update.zip                 = schemaAddress.zip;
      if (!op.address && schemaAddress.address) update.address            = schemaAddress.address;

      // Try dedicated pricing page
      const pricingLinkMatch = html.match(
        /href="([^"]*(?:pricing|rates?|cost)[^"]*)"(?:\s[^>]*)?>(?:[^<]*)?(?:Pricing|Rates?|Cost)/i
      );
      if (pricingLinkMatch && pricingTiers.length === 0) {
        try {
          let pUrl = pricingLinkMatch[1];
          if (pUrl.startsWith("/")) pUrl = new URL(pUrl, op.website_url).href;
          const { html: pHtml } = await fetchWithZyte({ url: pUrl, render: true });
          const extra = extractPricingTiers(pHtml);
          if (extra.length > 0) update.pricing_tiers = extra;
        } catch { /* ignore */ }
      }
    } catch { /* website unreachable — continue to Google step */ }
  }

  // ── Step 2: Scrape Google Maps for this operator ──────────────────────────
  const company = op.company ?? "junk removal";
  const city    = op.city    ?? "Orange County";
  try {
    const gmaps = await scrapeGoogleMapsPlace(company, city);
    if (gmaps) {
      // Google data always takes priority — it's more accurate than the website
      if (gmaps.responseTime)               update.google_response_time = gmaps.responseTime;
      if (gmaps.reviewSnippet)              update.review_snippet       = gmaps.reviewSnippet;
      if (gmaps.rating && !op.google_maps_rating) update.google_maps_rating = gmaps.rating;
      if (gmaps.reviewCount)                update.google_review_count  = gmaps.reviewCount;
      if (gmaps.hours && !update.hours_json) update.hours_json          = gmaps.hours;
      // Google Maps photos — merge with any website photos, deduplicate
      if (gmaps.photoUrls && gmaps.photoUrls.length > 0) {
        const existing: string[] = update.photo_urls ?? [];
        const merged = [...new Set([...gmaps.photoUrls, ...existing])].slice(0, 12);
        update.photo_urls = merged;
      }
      // Use Google Maps thumbnail as logo fallback if website logo not found
      if (gmaps.thumbnail && !update.image_url) {
        update.image_url = gmaps.thumbnail;
      }
    }
  } catch { /* Maps search failed — that's ok, website data still applied */ }

  // ── Write update ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("service_operators").update(update).eq("id", id);

  return NextResponse.json({
    ok: true,
    operatorId: id,
    fieldsUpdated: Object.keys(update).filter(k => k !== "last_scored_at" && k !== "updated_at"),
    timestamp: now,
  });
}
