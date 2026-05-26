import { zyteGet } from "./zyte-client";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

// Redfin "sold in last 7 days" for Orange County, CA
const URL =
  "https://www.redfin.com/county/28/CA/Orange-County/filter/property-type=house+condo+townhouse,include=sold-3mo,max-days-on-market=7";

export async function scrapeRedfin(
  apiKey: string
): Promise<{ leads: Partial<SoldHomeLead>[]; rawCount: number }> {
  const { html } = await zyteGet(apiKey, { url: URL, browserHtml: true });

  const leads: Partial<SoldHomeLead>[] = [];

  // Each listing card: data-rf-test-name="mapHomeCard"
  const cardPattern =
    /<div[^>]*data-rf-test-name="mapHomeCard"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  const cards = [...html.matchAll(cardPattern)];

  for (const card of cards) {
    const block = card[0];

    const address = extractText(block, /<div[^>]*class="[^"]*homeAddressV2[^"]*"[^>]*>(.*?)<\/div>/i);
    const price = extractText(block, /\$[\d,]+/);
    const soldDate = extractText(block, /Sold\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);

    if (address && price) {
      leads.push({
        address: address.trim(),
        salePrice: parseDollars(price),
        soldDate: soldDate ? new Date(soldDate).toISOString() : new Date().toISOString(),
        source: "redfin",
        saleType: "standard",
        priority: "good",
        score: 50,
      });
    }
  }

  // Fallback: try simpler price + address pattern if cards not found
  if (leads.length === 0) {
    const prices = [...html.matchAll(/\$[\d,]{3,}/g)].map((m) => m[0]);
    return { leads, rawCount: prices.length };
  }

  return { leads, rawCount: cards.length };
}

function extractText(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? m[1]?.replace(/<[^>]+>/g, "").trim() ?? m[0] : null;
}

function parseDollars(s: string): number {
  return parseInt(s.replace(/[$,]/g, ""), 10) || 0;
}
