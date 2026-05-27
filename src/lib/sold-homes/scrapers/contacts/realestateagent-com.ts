import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

// RealEstateAgent.com — static HTML directory, phones are visible on agent cards
const BASE = "https://www.realestateagent.com/real-estate-agents/california/orange-county/";

function pageUrl(page: number): string {
  return page === 1 ? BASE : `${BASE}?p=${page}`;
}

export async function scrapeRealEstateAgentCom(maxPages = 8): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (let page = 1; page <= maxPages; page++) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: pageUrl(page), stealth: true }));
    } catch {
      break;
    }

    const pageContacts = buildContacts(html, "realestateagent_com");
    if (pageContacts.length === 0 && page > 1) break;

    contacts.push(...pageContacts);
    pagesScraped++;

    if (pageContacts.length < 5) break;
  }

  return { source: "realestateagent_com", contacts, pagesScraped };
}
