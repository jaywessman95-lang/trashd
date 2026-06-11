import { zyteGet } from "./zyte-client";
import type { SoldHomeLead, SaleType } from "@/lib/sold-homes/types";

const URL = "https://www.zillow.com/orange-county-ca/sold/";

type ZillowListing = {
  zpid: number | string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipcode?: string;
  unformattedPrice?: number;
  beds?: number;
  homeType?: string;
  brokerName?: string;
  detailUrl?: string;
  statusType?: string;
  hdpData?: {
    homeInfo?: {
      dateSold?: number;
      homeType?: string;
      bedrooms?: number;
    };
  };
};

function toSaleType(homeType: string | undefined): SaleType {
  return "standard";
}

function toPropertyType(homeType: string | undefined) {
  const t = (homeType ?? "").toLowerCase();
  if (t.includes("condo") || t.includes("apartment")) return "condo" as const;
  if (t.includes("townhouse")) return "townhouse" as const;
  if (t.includes("multi") || t.includes("duplex")) return "multi_family" as const;
  return "single_family" as const;
}

export async function scrapeZillow(
  apiKey: string,
  maxDaysSold = 15
): Promise<SoldHomeLead[]> {
  const { html } = await zyteGet(apiKey, { url: URL, httpResponseBody: true });

  const ndMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
  if (!ndMatch) throw new Error("__NEXT_DATA__ not found in Zillow page");

  const nd = JSON.parse(ndMatch[1]) as any;
  const state = nd?.props?.pageProps?.searchPageState;
  const listResults: ZillowListing[] = state?.cat1?.searchResults?.listResults ?? [];
  const mapResults: ZillowListing[]  = state?.cat1?.searchResults?.mapResults  ?? [];
  const all = [...listResults, ...mapResults];

  const cutoff = Date.now() - maxDaysSold * 24 * 60 * 60 * 1000;
  const leads: SoldHomeLead[] = [];

  for (const l of all) {
    if (!l.addressStreet || !l.unformattedPrice) continue;

    const soldMs = l.hdpData?.homeInfo?.dateSold ?? 0;
    if (!soldMs || soldMs < cutoff) continue;

    const soldDate = new Date(soldMs).toISOString().slice(0, 10);
    const homeType = l.hdpData?.homeInfo?.homeType ?? l.homeType;
    const bedrooms = l.beds ?? l.hdpData?.homeInfo?.bedrooms;
    const score = scoreZillowLead(l, soldMs);

    leads.push({
      id: `zillow-${l.zpid}`,
      address: l.addressStreet,
      city: l.addressCity ?? "",
      state: l.addressState ?? "CA",
      zip: l.addressZipcode,
      salePrice: l.unformattedPrice,
      soldDate,
      propertyType: toPropertyType(homeType),
      saleType: toSaleType(homeType),
      cashSale: false,
      score,
      priority: score >= 70 ? "hot_now" : score >= 50 ? "strong" : "good",
      listingUrl: l.detailUrl ?? undefined,
      source: "zillow",
      agentBrokerage: l.brokerName,
      bedrooms,
    });
  }

  return leads;
}

function scoreZillowLead(l: ZillowListing, soldMs: number): number {
  let s = 40;
  const price = l.unformattedPrice ?? 0;
  if (price >= 1000000) s += 15;
  else if (price >= 600000) s += 10;
  else if (price >= 400000) s += 5;

  const daysAgo = (Date.now() - soldMs) / 86400000;
  if (daysAgo <= 1) s += 20;
  else if (daysAgo <= 3) s += 15;
  else if (daysAgo <= 7) s += 8;

  const homeType = l.hdpData?.homeInfo?.homeType ?? l.homeType ?? "";
  if (homeType.includes("SINGLE_FAMILY")) s += 10;

  return Math.min(s, 99);
}
