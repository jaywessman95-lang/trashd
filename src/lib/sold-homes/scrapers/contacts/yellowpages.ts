import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const AREAS = [
  { slug: "orange-ca", label: "Orange" },
  { slug: "irvine-ca", label: "Irvine" },
  { slug: "anaheim-ca", label: "Anaheim" },
  { slug: "santa-ana-ca", label: "Santa Ana" },
];

function pageUrl(slug: string, page: number): string {
  const base = `https://www.yellowpages.com/${slug}/real-estate-agents`;
  return page === 1 ? base : `${base}?page=${page}`;
}

export async function scrapeYellowPages(maxPagesPerArea = 5): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (const area of AREAS) {
    for (let page = 1; page <= maxPagesPerArea; page++) {
      let html: string;
      try {
        ({ html } = await fetchWithZyte({ url: pageUrl(area.slug, page), stealth: true }));
      } catch {
        break;
      }

      const pageContacts = buildContacts(html, "yellowpages");
      if (pageContacts.length === 0) break;

      contacts.push(...pageContacts);
      pagesScraped++;

      if (pageContacts.length < 10) break;
    }
  }

  return { source: "yellowpages", contacts, pagesScraped };
}
