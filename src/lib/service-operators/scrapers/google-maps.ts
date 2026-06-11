import { fetchWithZyte } from "@/lib/integrations/zyte";
import { detectServiceType, isStorageCompany } from "../types";
import type { ServiceOperator } from "../types";
import crypto from "crypto";

// OC-centered queries covering all service types realtors need
const MAPS_QUERIES = [
  "junk removal orange county ca",
  "estate cleanout service orange county ca",
  "junk hauling orange county ca",
  "furniture removal orange county ca",
  "moving company orange county ca",
  "trash hauling orange county ca",
  "house cleanout orange county ca",
];

// JavaScript injected into the rendered Google Maps page to extract listing data.
// This mirrors what worked in the Playwright browser scrape.
const EXTRACT_JS = `
(async () => {
  // Wait for listing cards to appear
  let attempts = 0;
  while (attempts < 15) {
    if (document.querySelectorAll('.Nv2PK').length > 3) break;
    await new Promise(r => setTimeout(r, 700));
    attempts++;
  }

  // Scroll the results panel to load more
  const panel = document.querySelector('[role="feed"]') || document.querySelector('.m6QErb');
  if (panel) {
    panel.scrollTop += 2000;
    await new Promise(r => setTimeout(r, 1500));
    panel.scrollTop += 2000;
    await new Promise(r => setTimeout(r, 1000));
  }

  const cards = document.querySelectorAll('.Nv2PK');
  const results = [];

  cards.forEach((card) => {
    const name = card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.textContent?.trim() || '';
    if (!name || name.length < 4) return;

    const allText = [...card.querySelectorAll('.W4Efsd span, .UY7F9')].map(s => s.textContent.trim()).filter(Boolean);
    const combined = allText.join(' ');

    const ratingEl = card.querySelector('[aria-label*="stars"]');
    const rating = parseFloat(ratingEl?.getAttribute('aria-label')?.match(/[\\d.]+/)?.[0] || '0') || 0;
    const reviewMatch = combined.match(/\\(([0-9,]+)\\)/);
    const reviewCount = parseInt((reviewMatch?.[1] || '0').replace(/,/g, ''), 10);
    const phoneMatch = combined.match(/\\(?\\d{3}\\)?[\\s\\-]?\\d{3}[\\s\\-]\\d{4}/);
    const phone = phoneMatch?.[0] || '';
    const is24h = /open 24 hours/i.test(combined);
    const hoursMatch = combined.match(/(?:Open 24 hours|Closes?\\s+\\d+(?::\\d+)?\\s*[AP]M|Opens?\\s+\\d+)/i);
    const hours = hoursMatch?.[0] || '';

    // Get address text
    const addrParts = combined.match(/·\\s*([0-9]+\\s+[^·|]+(?:Ave|Blvd|St|Rd|Dr|Way|Ln|Ct|Pl)[^·|]*)/i);
    const address = addrParts?.[1]?.trim() || '';

    if (rating >= 3.5 || reviewCount >= 5) {
      results.push({ name, rating, reviewCount, phone, is24h, hours, address });
    }
  });

  return JSON.stringify(results);
})()
`;

function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = raw.replace(/\D/g, "").slice(-10);
  if (d.length < 10) return undefined;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function cityFromAddress(address: string | undefined): string {
  if (!address) return "Orange County";
  const parts = address.split(/,\s*/);
  const last = parts[parts.length - 1]?.trim().split(/\s+/)[0] ?? "";
  return last || "Orange County";
}

export type MapsListing = {
  name: string;
  rating: number;
  reviewCount: number;
  phone?: string;
  address?: string;
  is24h: boolean;
  hours?: string;
  serviceType: ServiceOperator["serviceType"];
  id: string;
};

export async function scrapeGoogleMapsVendors(
  queries: string[] = MAPS_QUERIES
): Promise<MapsListing[]> {
  const seen = new Map<string, MapsListing>();

  for (const query of queries) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@33.7175,-117.8311,11z`;

    let jsResult: string | undefined;
    try {
      const resp = await fetchWithZyte({ url, render: true, javascript: EXTRACT_JS });
      jsResult = resp.jsResult;
    } catch {
      continue;
    }

    if (!jsResult) continue;

    let listings: Array<{ name: string; rating: number; reviewCount: number; phone: string; is24h: boolean; hours: string; address: string }>;
    try {
      listings = JSON.parse(jsResult);
    } catch {
      continue;
    }

    for (const l of listings) {
      // Skip storage/self-storage facilities
      if (isStorageCompany(l.name)) continue;

      // Deduplicate by normalized name
      const key = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) continue;

      const phone = normalizePhone(l.phone);
      const serviceType = detectServiceType(query + " " + l.name);
      const id = crypto
        .createHash("md5")
        .update(`gmaps::${key}`)
        .digest("hex");

      seen.set(key, {
        name: l.name,
        rating: l.rating,
        reviewCount: l.reviewCount,
        phone,
        address: l.address || undefined,
        is24h: l.is24h,
        hours: l.hours || undefined,
        serviceType,
        id,
      });
    }

    // Polite delay between queries
    await new Promise(r => setTimeout(r, 1200));
  }

  return [...seen.values()].sort((a, b) => b.reviewCount - a.reviewCount);
}
