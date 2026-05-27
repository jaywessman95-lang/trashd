import { fetchWithZyte } from "@/lib/integrations/zyte";
import { extractEmails, extractPhones, normalizePhone } from "./contacts/extractors";
import type { SoldHomeLead, PropertyType, SaleType, SoldHomePriority } from "../types";
import crypto from "crypto";

// Estately embeds sold listing data in __NEXT_DATA__ JSON — less blocked than HomeFinder
const OC_CITIES = [
  { name: "Irvine", slug: "Irvine" },
  { name: "Orange", slug: "Orange" },
  { name: "Anaheim", slug: "Anaheim" },
  { name: "Huntington Beach", slug: "Huntington-Beach" },
  { name: "Newport Beach", slug: "Newport-Beach" },
  { name: "Costa Mesa", slug: "Costa-Mesa" },
  { name: "Fullerton", slug: "Fullerton" },
  { name: "Tustin", slug: "Tustin" },
  { name: "Mission Viejo", slug: "Mission-Viejo" },
  { name: "Laguna Niguel", slug: "Laguna-Niguel" },
  { name: "Yorba Linda", slug: "Yorba-Linda" },
  { name: "Garden Grove", slug: "Garden-Grove" },
  { name: "Lake Forest", slug: "Lake-Forest" },
  { name: "Buena Park", slug: "Buena-Park" },
];

function soldUrl(slug: string): string {
  return `https://www.estately.com/CA/${slug}/sold`;
}

function mapPropertyType(raw: string | undefined): PropertyType {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s.includes("condo") || s.includes("condominium")) return "condo";
  if (s.includes("townhouse") || s.includes("townhome")) return "townhouse";
  if (s.includes("multi") || s.includes("duplex")) return "multi_family";
  if (s.includes("single") || s.includes("sfr") || s.includes("residential")) return "single_family";
  return "unknown";
}

function scoreLead(soldDate: string, salePrice: number, hasPhone: boolean, hasEmail: boolean): {
  score: number; priority: SoldHomePriority; scoreReason: string;
} {
  const daysSold = Math.floor((Date.now() - new Date(soldDate).getTime()) / 86_400_000);
  const recencyScore = daysSold <= 1 ? 35 : daysSold <= 3 ? 30 : daysSold <= 7 ? 25 : daysSold <= 14 ? 15 : 5;
  const contactScore = hasPhone && hasEmail ? 30 : hasEmail ? 20 : hasPhone ? 10 : 0;
  const priceScore = salePrice >= 1_000_000 ? 30 : salePrice >= 800_000 ? 25 : salePrice >= 600_000 ? 20 : salePrice >= 400_000 ? 15 : salePrice >= 200_000 ? 10 : 5;
  const score = recencyScore + contactScore + priceScore;
  const priority: SoldHomePriority = score >= 70 ? "hot_now" : score >= 50 ? "strong" : "good";
  const contactDesc = hasPhone && hasEmail ? "phone+email" : hasEmail ? "email only" : hasPhone ? "phone only" : "no contact";
  return { score, priority, scoreReason: `${daysSold}d ago · $${(salePrice / 1000).toFixed(0)}k · ${contactDesc}` };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromNextData(data: any, cityName: string): SoldHomeLead[] {
  const leads: SoldHomeLead[] = [];
  const seen = new Set<string>();

  // Estately nests listings under various pageProps keys
  const candidates = [
    data?.props?.pageProps?.listings,
    data?.props?.pageProps?.properties,
    data?.props?.pageProps?.soldHomes,
    data?.props?.pageProps?.results,
    data?.props?.pageProps?.data?.listings,
  ];

  let rawListings: unknown[] = [];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) { rawListings = c; break; }
  }

  // Deep search fallback
  if (rawListings.length === 0) {
    function deepSearch(obj: unknown, depth = 0): unknown[] | null {
      if (depth > 6 || !obj || typeof obj !== "object") return null;
      if (Array.isArray(obj) && obj.length >= 3) {
        const first = obj[0] as Record<string, unknown>;
        if (first && ("sold_date" in first || "soldDate" in first || "closedAt" in first || "close_date" in first)) return obj;
      }
      for (const val of Object.values(obj as Record<string, unknown>)) {
        const found = deepSearch(val, depth + 1);
        if (found) return found;
      }
      return null;
    }
    rawListings = deepSearch(data) ?? [];
  }

  for (const raw of rawListings as Record<string, unknown>[]) {
    const soldDate = String(
      raw.sold_date ?? raw.soldDate ?? raw.closedAt ?? raw.close_date ?? raw.closed_at ?? ""
    ).slice(0, 10);
    if (!soldDate || !/^\d{4}-\d{2}-\d{2}$/.test(soldDate)) continue;

    const price = Number(raw.price ?? raw.sale_price ?? raw.salePrice ?? raw.list_price ?? raw.closedPrice ?? 0);
    if (price <= 0) continue;

    const addrObj = raw.address as Record<string, unknown> | undefined;
    const address = String(addrObj?.street ?? addrObj?.line1 ?? raw.street_address ?? raw.streetAddress ?? raw.address ?? "");
    const city = String(addrObj?.city ?? raw.city ?? cityName);
    const state = String(addrObj?.state ?? raw.state ?? "CA");
    const zip = String(addrObj?.zip ?? addrObj?.postal_code ?? raw.zip ?? raw.zipCode ?? "");

    const agent = (raw.agent ?? raw.listing_agent ?? raw.listingAgent ?? {}) as Record<string, unknown>;
    const agentName = String(agent.name ?? agent.full_name ?? agent.fullName ?? "");
    const agentPhone = String(agent.phone ?? agent.mobile ?? "");
    const agentEmail = String(agent.email ?? "");
    const agentBrokerage = String(agent.company ?? agent.brokerage ?? agent.office ?? "");
    const listingUrl = String(raw.url ?? raw.listing_url ?? raw.permalink ?? raw.detailUrl ?? "");
    const bedroomsRaw = raw.beds ?? raw.bedrooms ?? agent.beds;
    const bedrooms = bedroomsRaw != null ? Number(bedroomsRaw) || undefined : undefined;

    const id = crypto.createHash("md5").update(`estately::${address}::${soldDate}`).digest("hex");
    if (seen.has(id)) continue;
    seen.add(id);

    const phone = agentPhone ? normalizePhone(agentPhone) : undefined;
    const email = agentEmail || undefined;
    const { score, priority, scoreReason } = scoreLead(soldDate, price, !!phone, !!email);

    leads.push({
      id,
      address,
      city,
      state,
      zip: zip || undefined,
      salePrice: price,
      soldDate,
      propertyType: mapPropertyType(String(raw.property_type ?? raw.propertyType ?? raw.homeType ?? "")),
      saleType: "standard" as SaleType,
      cashSale: false,
      score,
      priority,
      scoreReason,
      listingUrl: listingUrl || undefined,
      source: "estately",
      agentName: agentName || undefined,
      agentPhone: phone,
      agentEmail: email,
      agentBrokerage: agentBrokerage || undefined,
      scrapedAt: new Date().toISOString(),
      bedrooms,
    });
  }

  return leads;
}

function parseHtml(html: string, cityName: string): SoldHomeLead[] {
  // Try __NEXT_DATA__ first
  const jsonMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const leads = extractFromNextData(data, cityName);
      if (leads.length > 0) return leads;
    } catch { /* fall through */ }
  }

  // Regex fallback: find sold_date patterns and pair with nearby contacts
  const leads: SoldHomeLead[] = [];
  const seen = new Set<string>();
  const soldDateRe = /"(?:sold_date|soldDate|closedAt|close_date)"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g;
  const priceRe = /"(?:price|sale_price|closedPrice)"\s*:\s*(\d+)/;
  const addrRe = /"(?:street_address|streetAddress|address)"\s*:\s*"([^"]+)"/;

  let m: RegExpExecArray | null;
  while ((m = soldDateRe.exec(html)) !== null) {
    const soldDate = m[1];
    const window = html.slice(Math.max(0, m.index - 800), Math.min(html.length, m.index + 800));
    const price = Number(window.match(priceRe)?.[1] ?? 0);
    if (price <= 0) continue;
    const address = window.match(addrRe)?.[1] ?? "";
    const phones = extractPhones(window);
    const emails = extractEmails(window);
    const id = crypto.createHash("md5").update(`estately::${address}::${soldDate}`).digest("hex");
    if (seen.has(id)) continue;
    seen.add(id);
    const phone = phones[0] ? normalizePhone(phones[0]) : undefined;
    const email = emails[0];
    const { score, priority, scoreReason } = scoreLead(soldDate, price, !!phone, !!email);
    leads.push({
      id, address, city: cityName, state: "CA", salePrice: price, soldDate,
      propertyType: "unknown", saleType: "standard", score, priority, scoreReason,
      source: "estately", agentPhone: phone, agentEmail: email,
      scrapedAt: new Date().toISOString(),
    });
  }
  return leads;
}

export async function scrapeEstatlyListings(
  maxLeads = 50,
  maxCities = OC_CITIES.length
): Promise<SoldHomeLead[]> {
  const allLeads: SoldHomeLead[] = [];
  const citiesToScrape = OC_CITIES.slice(0, maxCities);

  for (const { name, slug } of citiesToScrape) {
    if (allLeads.length >= maxLeads) break;
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: soldUrl(slug), render: true }));
    } catch {
      continue;
    }
    const cityLeads = parseHtml(html, name);
    const remaining = maxLeads - allLeads.length;
    allLeads.push(...cityLeads.slice(0, remaining));
  }

  return allLeads;
}
