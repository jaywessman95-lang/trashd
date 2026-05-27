import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

// Pacific Sotheby's International Realty — OC luxury market, server-rendered agent pages
const OC_OFFICE_PAGES = [
  "https://www.pacificsir.com/agents/",
  "https://www.pacificsir.com/agents/?page=2",
  "https://www.pacificsir.com/agents/?page=3",
];

export async function scrapePacificSothebys(): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (const url of OC_OFFICE_PAGES) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url, stealth: true }));
    } catch {
      continue;
    }

    const pageContacts = buildContacts(html, "pacificsir", "Pacific Sotheby's International Realty");
    if (pageContacts.length === 0 && pagesScraped > 0) break;

    if (pageContacts.length > 0) {
      contacts.push(...pageContacts);
      pagesScraped++;
    }
  }

  return { source: "pacificsir", contacts, pagesScraped };
}
