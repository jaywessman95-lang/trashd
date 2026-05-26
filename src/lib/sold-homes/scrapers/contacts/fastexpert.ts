import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const BASE_URL = "https://www.fastexpert.com/top-real-estate-agents/orange-county-ca/";

function pageUrl(page: number): string {
  return page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
}

export async function scrapeFastExpert(maxPages = 10): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (let page = 1; page <= maxPages; page++) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: pageUrl(page), stealth: true }));
    } catch (e) {
      break;
    }

    const pageContacts = buildContacts(html, "fastexpert");
    if (pageContacts.length === 0) break;

    contacts.push(...pageContacts);
    pagesScraped++;

    // If fewer than 10 contacts on a page, likely the last page
    if (pageContacts.length < 10) break;
  }

  return { source: "fastexpert", contacts, pagesScraped };
}
