import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { searchAreasForCities } from "@/lib/config/territories";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

const searchTerms = [
  "moving sale",
  "must go",
  "free furniture",
  "garage cleanout",
  "downsizing",
  "take all",
  "curb alert",
  "garage sale"
];

type OfferUpListing = {
  listingId?: string;
  title?: string;
  locationName?: string;
  price?: string | number | null;
  flags?: string[];
  image?: {
    url?: string;
  } | null;
};

export const offerupConnector: SourceConnector = {
  source: "offerup",
  render: false,
  buildSeedUrls: ({ cities, radiusMiles }) => {
    const areas = searchAreasForCities(cities);
    const searchAreas = areas.length ? areas : [{ city: "Anaheim", slug: "anaheim", zipCode: "92805" }];
    const radius = Math.min(Math.max(radiusMiles, 5), 50);

    return searchAreas.flatMap((area) => searchTerms.map((term) => buildSearchUrl(term, radius, area.city)));
  },
  async fetch(url) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`OfferUp direct fetch failed (${response.status}).`);
    }

    return {
      url: response.url,
      html: await response.text()
    };
  },
  async extract(html, url) {
    const structuredCandidates = extractStructuredListings(html, url);

    if (structuredCandidates.length || html.includes('"__typename":"ModularFeedListing"')) {
      return structuredCandidates;
    }

    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("a[href]").each((_, element) => {
      const node = $(element);
      const href = node.attr("href");
      const listingUrl = absoluteUrl(href, url);

      if (!listingUrl || seen.has(listingUrl) || !isLikelyOfferUpListing(listingUrl)) {
        return;
      }

      const container = node.closest("article, li, div");
      const title = cleanText(node.attr("aria-label") ?? node.text() ?? firstText(container, ["h1", "h2", "h3", "[data-testid*='title']"]));

      if (!title) {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "offerup",
        title,
        description: firstText(container, ["[data-testid*='description']", "p"]),
        city: firstText(container, ["[data-testid*='location']", "[class*='location']"]),
        url: listingUrl,
        price: firstText(container, ["[data-testid*='price']", "[class*='price']"]),
        imageCount: countImages(container),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(container.text()).slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};

function buildSearchUrl(term: string, radiusMiles: number, location: string | undefined): string {
  const targetedTerm = location ? `${term} ${location}` : term;
  const params = new URLSearchParams({
    q: targetedTerm,
    radius: String(radiusMiles),
    delivery_param: "p"
  });

  return `https://offerup.com/search?${params.toString()}`;
}

function extractStructuredListings(html: string, searchUrl: string): NormalizedLeadCandidate[] {
  const candidates: NormalizedLeadCandidate[] = [];
  const seen = new Set<string>();
  const targetCity = inferTargetCityFromQuery(searchUrl);
  const matches = html.matchAll(/"listing":(\{"__typename":"ModularFeedListing"[\s\S]*?"vehicleMiles":[^}]*\})/g);

  for (const match of matches) {
    const listing = parseListing(match[1]);

    if (!listing?.listingId || !listing.title) {
      continue;
    }

    const city = parseCity(listing.locationName);

    if (targetCity && city?.toLowerCase() !== targetCity) {
      continue;
    }

    const listingUrl = `https://offerup.com/item/detail/${listing.listingId}`;

    if (seen.has(listingUrl)) {
      continue;
    }

    seen.add(listingUrl);
    candidates.push({
      source: "offerup",
      sourceListingId: listing.listingId,
      title: cleanText(listing.title),
      description: buildDescription(listing),
      city,
      state: parseState(listing.locationName),
      url: listingUrl,
      price: formatPrice(listing.price),
      imageCount: listing.image?.url ? 1 : 0,
      rawData: {
        searchUrl,
        flags: listing.flags ?? [],
        locationName: cleanText(listing.locationName),
        imageUrl: cleanText(listing.image?.url)
      }
    });
  }

  return candidates;
}

function parseListing(value: string): OfferUpListing | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildDescription(listing: OfferUpListing): string {
  return [
    listing.flags?.includes("LOCAL_PICKUP") ? "Local pickup listing." : "",
    listing.locationName ? `Location: ${listing.locationName}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function parseCity(value: string | undefined): string | undefined {
  return cleanText(value).split(",")[0]?.trim() || undefined;
}

function parseState(value: string | undefined): string | undefined {
  return cleanText(value).split(",")[1]?.trim().slice(0, 2).toUpperCase() || undefined;
}

function inferTargetCityFromQuery(searchUrl: string): string | undefined {
  const query = new URL(searchUrl).searchParams.get("q")?.toLowerCase() ?? "";
  const matchingTerm = [...searchTerms]
    .sort((a, b) => b.length - a.length)
    .find((term) => query.startsWith(`${term.toLowerCase()} `));

  return matchingTerm ? query.slice(matchingTerm.length).trim() || undefined : undefined;
}

function formatPrice(value: string | number | null | undefined): string | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  const price = cleanText(String(value));

  if (!price) {
    return undefined;
  }

  return price.startsWith("$") ? price : `$${price}`;
}

function isLikelyOfferUpListing(url: string): boolean {
  return /offerup\.com\/item\/|offerup\.com\/p\//.test(url);
}

function isRecord(value: unknown): value is OfferUpListing {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
