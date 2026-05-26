import { fetchWithZyte } from "@/lib/integrations/zyte";
import { buildContacts } from "./extractors";
import type { ContactScrapeResult } from "./types";

const OC_CITIES = [
  "orange",
  "orange-county",
  "irvine",
  "huntington-beach",
  "anaheim",
  "santa-ana",
  "fullerton",
  "newport-beach",
  "costa-mesa",
  "brea",
  "mission-viejo",
  "lake-forest",
  "tustin",
  "yorba-linda",
  "laguna-hills",
  "laguna-niguel",
  "san-clemente",
  "aliso-viejo",
  "buena-park",
  "placentia",
  "garden-grove",
  "seal-beach",
  "la-habra",
  "cypress",
  "stanton",
  "westminster",
];

function agentsUrl(city: string): string {
  return `https://www.coldwellbankerhomes.com/ca/${city}/agents/`;
}

export async function scrapeColdwellBankerHomes(maxCities = OC_CITIES.length): Promise<ContactScrapeResult> {
  const contacts = [];
  let pagesScraped = 0;
  const citiesToScrape = OC_CITIES.slice(0, maxCities);

  for (const city of citiesToScrape) {
    let html: string;
    try {
      ({ html } = await fetchWithZyte({ url: agentsUrl(city), stealth: true }));
    } catch {
      continue;
    }

    const cityContacts = buildContacts(html, "coldwellbankerhomes", "Coldwell Banker Realty");
    if (cityContacts.length > 0) {
      contacts.push(...cityContacts);
      pagesScraped++;
    }
  }

  return { source: "coldwellbankerhomes", contacts, pagesScraped };
}
