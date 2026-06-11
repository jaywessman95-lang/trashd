import { fetchWithZyte } from "@/lib/integrations/zyte";
import { scoreOperator, isCustomDomain, detectServiceType, isStorageCompany } from "../types";
import type { ServiceOperator } from "../types";
import crypto from "crypto";

// Queries that reliably surface business emails per prior Zyte probe tests
const QUERY_TEMPLATES = [
  (city: string) => `"junk removal" "${city}" "@gmail.com" OR "@yahoo.com"`,
  (city: string) => `"movers" "${city} ca" "@gmail.com" OR "@yahoo.com"`,
  (city: string) => `"junk removal" "${city}" "contact" "@"`,
  (city: string) => `"hauling" "${city}" "orange county" "@gmail.com"`,
];

const OC_LA_CITIES = [
  "Orange County", "Irvine", "Anaheim", "Santa Ana", "Huntington Beach",
  "Newport Beach", "Costa Mesa", "Fullerton", "Tustin", "Mission Viejo",
  "Laguna Niguel", "Yorba Linda", "Lake Forest", "Garden Grove", "Brea",
  "Los Angeles", "Long Beach", "Pasadena", "Glendale", "Burbank",
];

const NATIONAL_CITIES = [
  "Dallas TX", "Houston TX", "Austin TX",
  "Phoenix AZ", "Las Vegas NV",
  "Denver CO", "Seattle WA", "Portland OR",
  "Chicago IL", "Atlanta GA", "Miami FL",
  "New York NY", "Boston MA", "Philadelphia PA",
];

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;

// Strict filter: no URL encoding, no platform emails, no image extensions
const BAD_EMAIL_RE = /[%+=]|example\.|schema\.|noreply|no-reply|sentry|privacy|legal|press|abuse@|webmaster@|\.png|\.jpg|\.gif|\.js$|google\.|gstatic|googleapis|yelp\.|bbb\.org|yellowpages|superpages|manta\.|hotfrog|ezlocal|tripadvisor|dexknows|whitepages|bark\.com|thumbtack|cloudflare|amazonaws|w3\.org|sitemap/i;

function extractEmails(html: string): string[] {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(e =>
    !BAD_EMAIL_RE.test(e) &&
    e.includes("@") &&
    e.split("@")[1]?.includes(".") &&
    !e.includes("%") &&
    !e.includes("+") &&
    e.length < 80 &&
    !e.startsWith(".")
  );
}

function extractPhones(html: string): string[] {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7));
  });
}

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function buildUrl(query: string, page = 1): string {
  const start = (page - 1) * 10;
  const encoded = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encoded}&num=20${start > 0 ? `&start=${start}` : ""}`;
}

export async function scrapeGoogleDorkEmails(
  maxLeads = 100,
  scope: "oc_la" | "national" | "both" = "oc_la"
): Promise<ServiceOperator[]> {
  const cities = scope === "national"
    ? NATIONAL_CITIES
    : scope === "both"
    ? [...OC_LA_CITIES, ...NATIONAL_CITIES]
    : OC_LA_CITIES;

  const results: ServiceOperator[] = [];
  const seenEmails = new Set<string>();

  for (const city of cities) {
    if (results.length >= maxLeads) break;

    for (const queryFn of QUERY_TEMPLATES) {
      if (results.length >= maxLeads) break;

      const query = queryFn(city);
      let html: string;
      try {
        ({ html } = await fetchWithZyte({ url: buildUrl(query), render: true }));
      } catch {
        continue;
      }

      const emails = extractEmails(html);
      const phones = extractPhones(html);

      for (let i = 0; i < emails.length; i++) {
        if (results.length >= maxLeads) break;
        const email = emails[i].toLowerCase();
        if (seenEmails.has(email)) continue;
        seenEmails.add(email);

        const phone = phones[i] ? normalizePhone(phones[i]) : undefined;
        const customDomain = isCustomDomain(email);
        const { score, priority } = scoreOperator(true, !!phone, customDomain);
        const serviceType = detectServiceType(query + " " + email);

        // Try to infer company name from email local part
        const localPart = email.split("@")[0];
        const company = localPart
          .replace(/[._\-]/g, " ")
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim() || undefined;

        // Skip storage/self-storage facilities
        if (isStorageCompany(company ?? "", email)) continue;

        const id = crypto.createHash("md5").update(`googledork::${email}`).digest("hex");

        results.push({
          id,
          company,
          email,
          phone,
          city: city.split(" ")[0],
          state: city.includes(",") ? city.split(",")[1]?.trim() : city.split(" ").slice(-1)[0] ?? "CA",
          serviceType,
          source: "google_dork",
          score,
          priority,
          profileStatus: "unverified",
          scrapedAt: new Date().toISOString(),
        });
      }

      // Small delay between Google queries to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return results;
}
