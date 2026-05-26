import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const URL = "https://www.sevengables.com/agents/";

export async function scrapeSevenGables(): Promise<ContactScrapeResult> {
  let html: string;
  try {
    ({ html } = await fetchWithZyte({ url: URL, stealth: true }));
  } catch (e) {
    return {
      source: "sevengables",
      contacts: [],
      pagesScraped: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const contacts = buildContacts(html, "sevengables", "Seven Gables Real Estate");
  return { source: "sevengables", contacts, pagesScraped: 1 };
}
