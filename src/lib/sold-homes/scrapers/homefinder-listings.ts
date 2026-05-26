import { fetchWithZyte } from "@/lib/integrations/zyte";
import { extractEmails, extractPhones, normalizePhone } from "./contacts/extractors";
import type { SoldHomeLead, PropertyType, SaleType, SoldHomePriority } from "../types";
import crypto from "crypto";

const OC_CITIES = [
  "Irvine",
  "Orange",
  "Anaheim",
  "Fullerton",
  "Huntington-Beach",
  "Newport-Beach",
  "Costa-Mesa",
  "Tustin",
  "Mission-Viejo",
  "Laguna-Niguel",
  "Yorba-Linda",
  "Lake-Forest",
  "Aliso-Viejo",
  "Garden-Grove",
  "Buena-Park",
  "Westminster",
  "La-Habra",
  "Seal-Beach",
  "Brea",
];

function cityUrl(city: string): string {
  return `https://www.homefinder.com/CA/${city}/recently-sold`;
}

function mapPropertyType(raw: string | undefined): PropertyType {
  if (!raw) return "unknown";
  const s = raw.toUpperCase();
  if (s.includes("CONDO") || s.includes("CONDOMINIUM")) return "condo";
  if (s.includes("TOWNHOUSE") || s.includes("TOWNHOME")) return "townhouse";
  if (s.includes("MULTI") || s.includes("DUPLEX") || s.includes("TRIPLEX")) return "multi_family";
  if (s.includes("SINGLE") || s.includes("SFR") || s.includes("RESIDENTIAL")) return "single_family";
  return "unknown";
}

function scoreLead(soldDate: string, salePrice: number, hasPhone: boolean, hasEmail: boolean): {
  score: number;
  priority: SoldHomePriority;
  scoreReason: string;
} {
  const daysSold = Math.floor((Date.now() - new Date(soldDate).getTime()) / 86_400_000);

  let recencyScore = 0;
  if (daysSold <= 0) recencyScore = 40;
  else if (daysSold <= 1) recencyScore = 35;
  else if (daysSold <= 3) recencyScore = 30;
  else if (daysSold <= 7) recencyScore = 25;
  else if (daysSold <= 14) recencyScore = 15;
  else recencyScore = 5;

  const contactScore = hasPhone && hasEmail ? 30 : hasEmail ? 20 : hasPhone ? 10 : 0;

  let priceScore = 0;
  if (salePrice >= 1_000_000) priceScore = 30;
  else if (salePrice >= 800_000) priceScore = 25;
  else if (salePrice >= 600_000) priceScore = 20;
  else if (salePrice >= 400_000) priceScore = 15;
  else if (salePrice >= 200_000) priceScore = 10;
  else priceScore = 5;

  const score = recencyScore + contactScore + priceScore;
  const priority: SoldHomePriority = score >= 70 ? "hot_now" : score >= 50 ? "strong" : "good";
  const contactDesc = hasPhone && hasEmail ? "phone+email" : hasEmail ? "email only" : hasPhone ? "phone only" : "no contact";
  const scoreReason = `${daysSold}d ago · $${(salePrice / 1000).toFixed(0)}k · ${contactDesc}`;

  return { score, priority, scoreReason };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractListings(data: any): any[] {
  const candidates = [
    data?.props?.pageProps?.listings,
    data?.props?.pageProps?.properties,
    data?.props?.pageProps?.soldListings,
    data?.props?.pageProps?.recentlySold,
    data?.props?.pageProps?.data?.listings,
    data?.props?.pageProps?.data?.properties,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }

  // Deep search: look for first array with 5+ items containing sold_date
  function deepSearch(obj: unknown, depth = 0): unknown[] | null {
    if (depth > 5 || !obj || typeof obj !== "object") return null;
    if (Array.isArray(obj) && obj.length >= 5) {
      const first = obj[0];
      if (first && typeof first === "object" && ("sold_date" in first || "soldDate" in first || "closingDate" in first)) {
        return obj;
      }
    }
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = deepSearch(val, depth + 1);
      if (found) return found;
    }
    return null;
  }

  return deepSearch(data) ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOneListing(raw: any, city: string): Omit<SoldHomeLead, "score" | "priority" | "scoreReason"> | null {
  const soldDate: string =
    raw.sold_date ?? raw.soldDate ?? raw.closing_date ?? raw.closingDate ?? raw.sold ?? "";
  if (!soldDate || !/\d{4}-\d{2}-\d{2}/.test(soldDate)) return null;

  const price = Number(raw.price ?? raw.sale_price ?? raw.salePrice ?? raw.list_price ?? 0);
  if (price <= 0) return null;

  const address =
    raw.address?.street ?? raw.address?.line1 ?? raw.street_address ?? raw.streetAddress ?? raw.address ?? "";
  const rawCity =
    raw.address?.city ?? raw.city ?? city.replace(/-/g, " ");
  const state = raw.address?.state ?? raw.state ?? "CA";
  const zip = raw.address?.zip ?? raw.address?.postal_code ?? raw.zip ?? raw.zipCode ?? undefined;

  const agent = raw.agent ?? raw.listing_agent ?? raw.listingAgent ?? raw.realtor ?? {};
  const agentName = agent.name ?? agent.full_name ?? agent.fullName ?? undefined;
  const agentPhone = agent.phone ?? agent.mobile ?? agent.cell ?? undefined;
  const agentEmail = agent.email ?? undefined;
  const agentBrokerage = agent.company ?? agent.brokerage ?? agent.office ?? undefined;
  const agentImage = agent.photo ?? agent.image ?? agent.avatar ?? agent.photo_url ?? undefined;
  const listingUrl = raw.url ?? raw.listing_url ?? raw.listingUrl ?? raw.permalink ?? undefined;

  const id = crypto
    .createHash("md5")
    .update(`homefinder::${address}::${soldDate}`)
    .digest("hex");

  return {
    id,
    address: String(address),
    city: String(rawCity),
    state: String(state),
    zip: zip ? String(zip) : undefined,
    salePrice: price,
    soldDate: soldDate.slice(0, 10),
    propertyType: mapPropertyType(raw.property_type ?? raw.propertyType ?? raw.home_type),
    saleType: "standard" as SaleType,
    cashSale: raw.cash_sale ?? raw.cashSale ?? false,
    listingUrl: listingUrl ? String(listingUrl) : undefined,
    source: "homefinder",
    agentName: agentName ? String(agentName) : undefined,
    agentPhone: agentPhone ? normalizePhone(String(agentPhone)) : undefined,
    agentEmail: agentEmail ? String(agentEmail) : undefined,
    agentBrokerage: agentBrokerage ? String(agentBrokerage) : undefined,
    agentImageUrl: agentImage ? String(agentImage) : undefined,
    scrapedAt: new Date().toISOString(),
  };
}

function parseHtml(html: string, city: string): SoldHomeLead[] {
  const leads: SoldHomeLead[] = [];
  const seen = new Set<string>();

  // Primary: __NEXT_DATA__ JSON
  const jsonMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const rawListings = extractListings(data);
      for (const raw of rawListings) {
        const partial = parseOneListing(raw, city);
        if (!partial || seen.has(partial.id)) continue;
        seen.add(partial.id);
        const { score, priority, scoreReason } = scoreLead(
          partial.soldDate,
          partial.salePrice,
          !!partial.agentPhone,
          !!partial.agentEmail
        );
        leads.push({ ...partial, score, priority, scoreReason });
      }
    } catch {
      // fall through to regex
    }
  }

  // Regex fallback: extract sold_date patterns and pair with nearby contacts
  if (leads.length === 0) {
    const soldDateRe = /"sold_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g;
    const priceRe = /"(?:price|sale_price)"\s*:\s*(\d+)/;
    const addressRe = /"(?:street_address|streetAddress|address)"\s*:\s*"([^"]+)"/;

    let m: RegExpExecArray | null;
    while ((m = soldDateRe.exec(html)) !== null) {
      const soldDate = m[1];
      const window = html.slice(Math.max(0, m.index - 800), Math.min(html.length, m.index + 800));

      const priceMatch = window.match(priceRe);
      const price = priceMatch ? Number(priceMatch[1]) : 0;
      if (price <= 0) continue;

      const addrMatch = window.match(addressRe);
      const address = addrMatch ? addrMatch[1] : "";

      const phones = extractPhones(window);
      const emails = extractEmails(window);

      const id = crypto
        .createHash("md5")
        .update(`homefinder::${address}::${soldDate}`)
        .digest("hex");
      if (seen.has(id)) continue;
      seen.add(id);

      const agentPhone = phones[0] ? normalizePhone(phones[0]) : undefined;
      const agentEmail = emails[0];

      const { score, priority, scoreReason } = scoreLead(soldDate, price, !!agentPhone, !!agentEmail);
      leads.push({
        id,
        address,
        city: city.replace(/-/g, " "),
        state: "CA",
        salePrice: price,
        soldDate,
        propertyType: "unknown",
        saleType: "standard",
        score,
        priority,
        scoreReason,
        source: "homefinder",
        agentPhone,
        agentEmail,
        scrapedAt: new Date().toISOString(),
      });
    }
  }

  return leads;
}

export async function scrapeHomeFinderListings(
  maxLeads = 50,
  maxCities = OC_CITIES.length
): Promise<SoldHomeLead[]> {
  const allLeads: SoldHomeLead[] = [];
  const citiesToScrape = OC_CITIES.slice(0, maxCities);

  for (const city of citiesToScrape) {
    if (allLeads.length >= maxLeads) break;

    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: cityUrl(city), stealth: true }));
    } catch {
      continue;
    }

    const cityLeads = parseHtml(html, city);
    const remaining = maxLeads - allLeads.length;
    allLeads.push(...cityLeads.slice(0, remaining));
  }

  return allLeads;
}
