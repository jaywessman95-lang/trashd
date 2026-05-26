import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const URLS = [
  "https://www.ezlocal.com/ca/orange/real-estate-agents",
  "https://www.ezlocal.com/ca/irvine/real-estate-agents",
  "https://www.ezlocal.com/ca/anaheim/real-estate-agents",
];

export async function scrapeEZlocal(): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;

  for (const url of URLS) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url, stealth: true }));
    } catch {
      continue;
    }

    const pageContacts = buildContacts(html, "ezlocal");
    contacts.push(...pageContacts);
    pagesScraped++;
  }

  return { source: "ezlocal", contacts, pagesScraped };
}
