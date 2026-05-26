import { scrapeFastExpert } from "./fastexpert";
import { scrapeColdwellBankerHomes } from "./coldwell-banker-homes";
import { scrapeSevenGables } from "./seven-gables";
import { scrapeHomeFinder } from "./homefinder";
import { scrapeYellowPages } from "./yellowpages";
import { scrapeEZlocal } from "./ezlocal";
import { scrapeFirstTeam } from "./firstteam";
import type { ContactScrapeResult, RealtorContact } from "./types";

export type { RealtorContact, ContactScrapeResult };

export type RunContactScrapersOptions = {
  /** Which sources to run. Defaults to all. */
  sources?: string[];
  /** Max pages per paginated source */
  maxPages?: number;
  /** Max OC cities for HomeFinder */
  maxCities?: number;
};

export type ContactScraperRunSummary = {
  totalContacts: number;
  bySource: Record<string, { contacts: number; pages: number; error?: string }>;
  allContacts: RealtorContact[];
};

const ALL_SOURCES = [
  "fastexpert",
  "coldwellbankerhomes",
  "sevengables",
  "homefinder",
  "yellowpages",
  "ezlocal",
  "firstteam",
];

export async function runContactScrapers(
  opts: RunContactScrapersOptions = {}
): Promise<ContactScraperRunSummary> {
  const { sources = ALL_SOURCES, maxPages = 10, maxCities = 13 } = opts;

  const runners: Array<() => Promise<ContactScrapeResult>> = [];

  if (sources.includes("fastexpert"))
    runners.push(() => scrapeFastExpert(maxPages));
  if (sources.includes("coldwellbankerhomes"))
    runners.push(() => scrapeColdwellBankerHomes(maxPages));
  if (sources.includes("sevengables"))
    runners.push(() => scrapeSevenGables());
  if (sources.includes("homefinder"))
    runners.push(() => scrapeHomeFinder(maxCities));
  if (sources.includes("yellowpages"))
    runners.push(() => scrapeYellowPages(5));
  if (sources.includes("ezlocal"))
    runners.push(() => scrapeEZlocal());
  if (sources.includes("firstteam"))
    runners.push(() => scrapeFirstTeam());

  // Run sequentially to avoid hammering Zyte concurrency limits
  const results: ContactScrapeResult[] = [];
  for (const run of runners) {
    try {
      results.push(await run());
    } catch (e) {
      // Individual scraper failure doesn't abort the run
    }
  }

  const allContacts = results.flatMap((r) => r.contacts);
  const bySource: ContactScraperRunSummary["bySource"] = {};
  for (const r of results) {
    bySource[r.source] = {
      contacts: r.contacts.length,
      pages: r.pagesScraped,
      error: r.error,
    };
  }

  return { totalContacts: allContacts.length, bySource, allContacts };
}
