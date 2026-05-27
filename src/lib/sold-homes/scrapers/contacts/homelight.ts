import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

// HomeLight lists top OC agents with phone numbers in server-rendered HTML
const BASE = "https://www.homelight.com/agents/orange-county-ca";

function pageUrl(page: number): string {
  return page === 1 ? BASE : `${BASE}?page=${page}`;
}

export async function scrapeHomeLight(maxPages = 8): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (let page = 1; page <= maxPages; page++) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: pageUrl(page), stealth: true }));
    } catch {
      break;
    }

    const pageContacts = buildContacts(html, "homelight");
    if (pageContacts.length === 0 && page > 1) break;

    contacts.push(...pageContacts);
    pagesScraped++;

    if (pageContacts.length < 5) break;
  }

  return { source: "homelight", contacts, pagesScraped };
}
