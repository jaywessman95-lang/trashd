import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const URL = "https://www.firstteam.com/agents/";

export async function scrapeFirstTeam(): Promise<ContactScrapeResult> {
  let html: string;
  try {
    ({ html } = await fetchWithZyte({ url: URL, stealth: true }));
  } catch (e) {
    return {
      source: "firstteam",
      contacts: [],
      pagesScraped: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const contacts = buildContacts(html, "firstteam", "First Team Real Estate");
  return { source: "firstteam", contacts, pagesScraped: 1 };
}
