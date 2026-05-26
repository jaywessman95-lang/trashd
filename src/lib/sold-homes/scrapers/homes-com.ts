import { zyteGet } from "./zyte-client";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

const URL = "https://www.homes.com/recently-sold/?county=orange-ca&days=7";

export async function scrapeHomesCom(
  apiKey: string
): Promise<{ leads: Partial<SoldHomeLead>[]; rawCount: number }> {
  const { html } = await zyteGet(apiKey, { url: URL, browserHtml: true });

  const leads: Partial<SoldHomeLead>[] = [];

  // Homes.com listing cards use placard__content or similar
  const priceMatches = [...html.matchAll(/\$[\d,]{4,}/g)];
  const addressMatches = [
    ...html.matchAll(/\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Ln|Rd|Ct|Way|Pl)[^<"]{0,30}/g),
  ];

  const rawCount = priceMatches.length;

  const count = Math.min(priceMatches.length, addressMatches.length, 20);
  for (let i = 0; i < count; i++) {
    leads.push({
      address: addressMatches[i][0].trim(),
      salePrice: parseInt(priceMatches[i][0].replace(/[$,]/g, ""), 10),
      soldDate: new Date().toISOString(),
      source: "homes_com",
      saleType: "standard",
      priority: "good",
      score: 50,
    });
  }

  return { leads, rawCount };
}
