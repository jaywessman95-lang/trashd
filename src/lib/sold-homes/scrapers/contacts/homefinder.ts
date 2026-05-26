import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

// OC cities with enough CRMLS listing volume
const OC_CITIES = [
  "Irvine",
  "Orange",
  "Anaheim",
  "Fullerton",
  "Huntington-Beach",
  "Newport-Beach",
  "Costa-Mesa",
  "Tustin",
  "Mission-Viejo",
  "Laguna-Niguel",
  "Yorba-Linda",
  "Lake-Forest",
  "Aliso-Viejo",
];

function cityUrl(city: string): string {
  return `https://www.homefinder.com/CA/${city}/recently-sold`;
}

export async function scrapeHomeFinder(maxCities = OC_CITIES.length): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;
  const citiesToScrape = OC_CITIES.slice(0, maxCities);

  for (const city of citiesToScrape) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: cityUrl(city), render: true }));
    } catch {
      continue;
    }

    const cityContacts = buildContacts(html, "homefinder");
    contacts.push(...cityContacts);
    pagesScraped++;
  }

  return { source: "homefinder", contacts, pagesScraped };
}
