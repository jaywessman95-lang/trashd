import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

// BHHS California has an agent finder with static HTML — one page per OC area
const OC_QUERIES = [
  "orange",
  "irvine",
  "newport+beach",
  "huntington+beach",
  "laguna+niguel",
  "mission+viejo",
  "anaheim",
  "fullerton",
  "costa+mesa",
  "yorba+linda",
];

function agentUrl(query: string): string {
  return `https://www.bhhscalifornia.com/agents/?query=${query}+CA`;
}

export async function scrapeBerkshireHathaway(): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (const query of OC_QUERIES) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: agentUrl(query), stealth: true }));
    } catch {
      continue;
    }

    const pageContacts = buildContacts(html, "bhhscalifornia", "Berkshire Hathaway HomeServices California");
    if (pageContacts.length > 0) {
      contacts.push(...pageContacts);
      pagesScraped++;
    }
  }

  return { source: "bhhscalifornia", contacts, pagesScraped };
}
