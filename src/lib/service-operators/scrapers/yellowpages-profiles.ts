import { fetchWithZyte } from "@/lib/integrations/zyte";
import { scoreOperator, isCustomDomain, detectServiceType, isStorageCompany } from "../types";
import { computeVendorScore, tierToPriority } from "../scoring";
import type { ServiceOperator } from "../types";
import crypto from "crypto";

const OC_LA_SLUGS = [
  { city: "Orange", slug: "orange-ca" },
  { city: "Irvine", slug: "irvine-ca" },
  { city: "Anaheim", slug: "anaheim-ca" },
  { city: "Huntington Beach", slug: "huntington-beach-ca" },
  { city: "Santa Ana", slug: "santa-ana-ca" },
  { city: "Fullerton", slug: "fullerton-ca" },
  { city: "Newport Beach", slug: "newport-beach-ca" },
  { city: "Costa Mesa", slug: "costa-mesa-ca" },
  { city: "Tustin", slug: "tustin-ca" },
  { city: "Mission Viejo", slug: "mission-viejo-ca" },
  { city: "Los Angeles", slug: "los-angeles-ca" },
  { city: "Long Beach", slug: "long-beach-ca" },
  { city: "Pasadena", slug: "pasadena-ca" },
];

const CATEGORIES = ["junk-removal-service", "movers"];

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const BAD_EMAIL_RE = /noreply|no-reply|sentry|privacy|legal|press|abuse@|webmaster@|example\.|schema\.|yellowpages|superpages|yp\.com|google\.|cloudflare|amazonaws|\.png|\.jpg|\.js$/i;

function extractEmail(html: string): string | undefined {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  const clean = [...new Set(raw)].filter(e =>
    !BAD_EMAIL_RE.test(e) &&
    !e.includes("%") &&
    e.split("@")[1]?.includes(".") &&
    e.length < 80
  );
  return clean[0];
}

function extractPhone(html: string): string | undefined {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  const clean = raw.filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7));
  });
  if (!clean[0]) return undefined;
  const d = clean[0].replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const AGGREGATOR_RE = /yelp\.com|google\.|facebook\.|twitter\.com|instagram\.com|linkedin\.com|bbb\.org|yp\.com|angi(e?s?list)?\.com|homeadvisor|thumbtack|bark\.com|houzz\.|nextdoor\.|tripadvisor|manta\.|superpages|dexknows|foursquare|citysearch|whitepages|yellowpages|porch\.com|buildzoom|networx|servicemagic|cloudflare|amazonaws|googleapis|gstatic|cdn\.|\.png|\.jpg|\.gif|\.js$|\.css$/i;

function isRealBusinessUrl(url: string): boolean {
  return url.startsWith("http") && !AGGREGATOR_RE.test(url) && url.length < 200;
}

function extractWebsite(html: string): string | undefined {
  // Priority 1: JSON-LD structured data "url" field
  for (const m of html.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]{5,150})"/g)) {
    if (isRealBusinessUrl(m[1])) return m[1].split("?")[0].replace(/\/$/, "") || m[1];
  }

  // Priority 2: itemprop="url"
  const itemprop = html.match(/itemprop="url"[^>]*(?:content|href)="(https?:\/\/[^"]{5,150})"/);
  if (itemprop?.[1] && isRealBusinessUrl(itemprop[1])) return itemprop[1];

  // Priority 3: href near "website" or "web" anchor text
  const nearWebsite = html.match(/href="(https?:\/\/[^"]{5,150})"[^>]*>[^<]{0,30}(?:website|visit site|web)<\/a>/i)
    ?? html.match(/(?:website|visit site|web)[^<]{0,60}href="(https?:\/\/[^"]{5,150})"/i);
  if (nearWebsite?.[1] && isRealBusinessUrl(nearWebsite[1])) return nearWebsite[1];

  return undefined;
}

function extractCompany(html: string): string | undefined {
  const m = html.match(/<h1[^>]*>([^<]{3,80})<\/h1>/) ??
            html.match(/<title>([^|<]{3,60})/);
  return m?.[1]?.trim().replace(/\s*-\s*.+$/, "").trim();
}

function extractAddress(html: string): { address?: string; city?: string; zip?: string } {
  const m = html.match(/itemprop="streetAddress"[^>]*>([^<]+)</) ??
            html.match(/"streetAddress"\s*:\s*"([^"]+)"/);
  const city = html.match(/itemprop="addressLocality"[^>]*>([^<]+)</) ??
               html.match(/"addressLocality"\s*:\s*"([^"]+)"/);
  const zip = html.match(/itemprop="postalCode"[^>]*>([^<]+)</) ??
              html.match(/"postalCode"\s*:\s*"([^"]+)"/);
  return {
    address: m?.[1]?.trim(),
    city: city?.[1]?.trim(),
    zip: zip?.[1]?.trim(),
  };
}

function extractRating(html: string): { rating?: number; reviewCount?: number } {
  // schema.org JSON-LD: "ratingValue":"4.5","reviewCount":"38"
  const rv = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/)?.[1];
  const rc = html.match(/"reviewCount"\s*:\s*"?(\d+)"?/)?.[1] ??
             html.match(/"ratingCount"\s*:\s*"?(\d+)"?/)?.[1];
  // itemprop fallbacks
  const rvFb = html.match(/itemprop="ratingValue"[^>]*content="([\d.]+)"/)?.[1] ??
               html.match(/itemprop="ratingValue"[^>]*>([\d.]+)</)?.[1];
  const rcFb = html.match(/itemprop="reviewCount"[^>]*content="(\d+)"/)?.[1] ??
               html.match(/itemprop="reviewCount"[^>]*>(\d+)</)?.[1];
  const rating = parseFloat(rv ?? rvFb ?? "");
  const reviewCount = parseInt(rc ?? rcFb ?? "", 10);
  return {
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : undefined,
  };
}

function extractHours(html: string): string | undefined {
  // Look for open/close patterns near "hours" text
  const m = html.match(/(?:Open|Closes?)\s+(?:24\s*[Hh]ours|24\/7|\d{1,2}(?::\d{2})?\s*[APap][Mm])/);
  return m?.[0]?.trim();
}

function extractHasInsured(html: string): boolean {
  return /licensed|insured|bonded|liability/i.test(html);
}

async function scrapeSearchPage(slug: string, category: string, page: number): Promise<string[]> {
  const base = `https://www.yellowpages.com/${slug}/${category}`;
  const url = page === 1 ? base : `${base}?page=${page}`;
  let html: string;
  try {
    ({ html } = await fetchWithZyte({ url, stealth: true }));
  } catch {
    return [];
  }
  const profileUrls = [...html.matchAll(/href="(\/[^"]+\/mip\/[^"?#]+)"/g)]
    .map(m => "https://www.yellowpages.com" + m[1])
    .filter((u, i, a) => a.indexOf(u) === i);
  return profileUrls;
}

async function scrapeProfile(
  profileUrl: string,
  city: string,
  category: string
): Promise<ServiceOperator | null> {
  let html: string;
  try {
    ({ html } = await fetchWithZyte({ url: profileUrl, stealth: true }));
  } catch {
    return null;
  }

  const email = extractEmail(html);
  const phone = extractPhone(html);
  if (!email && !phone) return null;

  const { address, city: profileCity, zip } = extractAddress(html);
  const company = extractCompany(html);
  if (company && isStorageCompany(company)) return null;

  const websiteUrl = extractWebsite(html);
  const customDomain = email ? isCustomDomain(email) : false;
  const serviceType = detectServiceType(category + " " + (company ?? ""));
  const { rating, reviewCount } = extractRating(html);
  const hoursDescription = extractHours(html);
  const hasLicensedInsured = extractHasInsured(html);

  const id = crypto.createHash("md5").update(`yp::${email ?? phone ?? profileUrl}`).digest("hex");

  // Use 3-pillar scoring when we have rating/review data; fall back to contact-based
  let score: number;
  let priority: ServiceOperator["priority"];
  let availabilityScore: number | undefined;
  let reliabilityScore: number | undefined;
  let professionalismScore: number | undefined;
  let confidenceTier: ServiceOperator["confidenceTier"] | undefined;

  if (rating !== undefined && reviewCount !== undefined) {
    const result = computeVendorScore({
      hoursDescription,
      googleReviewCount: reviewCount,
      googleMapsRating: rating,
      hasLicensedInsured,
      websiteUrl,
      phone,
      email,
    });
    score = result.scores.total;
    priority = tierToPriority(result.tier) as ServiceOperator["priority"];
    availabilityScore = result.scores.availability;
    reliabilityScore = result.scores.reliability;
    professionalismScore = result.scores.professionalism;
    confidenceTier = result.tier;
  } else {
    const base = scoreOperator(!!email, !!phone, customDomain);
    score = base.score + (hasLicensedInsured ? 5 : 0) + (websiteUrl ? 5 : 0);
    score = Math.min(100, score);
    priority = base.priority;
  }

  return {
    id,
    company: company ?? undefined,
    phone,
    email,
    address,
    city: profileCity ?? city,
    state: "CA",
    zip,
    serviceType,
    websiteUrl,
    source: "yellowpages_profile",
    score,
    priority,
    profileStatus: "unverified",
    scrapedAt: new Date().toISOString(),
    googleMapsRating: rating,
    googleReviewCount: reviewCount,
    hoursDescription,
    availabilityScore,
    reliabilityScore,
    professionalismScore,
    confidenceTier,
  };
}

export async function scrapeYellowPagesProfiles(
  maxProfiles = 60,
  maxCities = OC_LA_SLUGS.length,
  targetCities?: string[]
): Promise<ServiceOperator[]> {
  const results: ServiceOperator[] = [];
  const seenIds = new Set<string>();
  const citiesToScrape = targetCities?.length
    ? targetCities.flatMap((c) =>
        OC_LA_SLUGS.filter((s) => s.city.toLowerCase() === c.toLowerCase())
      )
    : OC_LA_SLUGS.slice(0, maxCities);

  for (const { city, slug } of citiesToScrape) {
    if (results.length >= maxProfiles) break;

    for (const category of CATEGORIES) {
      if (results.length >= maxProfiles) break;

      const profileUrls = await scrapeSearchPage(slug, category, 1);

      for (const url of profileUrls) {
        if (results.length >= maxProfiles) break;
        const op = await scrapeProfile(url, city, category);
        if (!op || seenIds.has(op.id)) continue;
        seenIds.add(op.id);
        results.push(op);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  return results;
}
