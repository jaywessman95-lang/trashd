import { zyteGet } from "./zyte-client";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

// Homesnap was acquired by CoStar/Homes.com in 2021 and redirects there
const URL = "https://www.homesnap.com/Orange-County-CA/sold";

export async function scrapeHomesnap(
  apiKey: string
): Promise<{ leads: Partial<SoldHomeLead>[]; rawCount: number }> {
  const { html, status } = await zyteGet(apiKey, { url: URL, browserHtml: true });

  const leads: Partial<SoldHomeLead>[] = [];

  const priceMatches = [...html.matchAll(/\$[\d,]{4,}/g)];
  const rawCount = priceMatches.length;

  const addressMatches = [
    ...html.matchAll(/\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Ln|Rd|Ct|Way|Pl)[^<"]{0,30}/g),
  ];

  const count = Math.min(priceMatches.length, addressMatches.length, 20);
  for (let i = 0; i < count; i++) {
    leads.push({
      address: addressMatches[i][0].trim(),
      salePrice: parseInt(priceMatches[i][0].replace(/[$,]/g, ""), 10),
      soldDate: new Date().toISOString(),
      source: "homesnap",
      saleType: "standard",
      priority: "good",
      score: 50,
    });
  }

  // Detect if it redirected to Homes.com (service deprecated)
  const redirected = html.toLowerCase().includes("homes.com") && !html.toLowerCase().includes("homesnap");

  return { leads, rawCount, ...(redirected ? { note: "redirects to homes.com" } : {}) } as any;
}
