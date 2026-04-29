import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { searchAreasForCities } from "@/lib/config/territories";
import { absoluteUrl, cleanText, countImages, extractJsonLd, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const estateSalesNetConnector: SourceConnector = {
  source: "estatesales_net",
  render: false,
  buildSeedUrls: ({ cities }) => {
    const areas = searchAreasForCities(cities).filter((area) => area.zipCode);

    if (!areas.length) {
      return ["https://www.estatesales.net/CA/Los-Angeles-Orange-County"];
    }

    return areas.map(
      (area) => `https://www.estatesales.net/CA/${encodeURIComponent(area.city.replace(/\s+/g, "-"))}/${area.zipCode}`
    );
  },
  async fetch(url) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`EstateSales.net direct fetch failed (${response.status}).`);
    }

    return {
      url: response.url,
      html: await response.text()
    };
  },
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    for (const item of extractJsonLd($)) {
      const candidate = mapSaleEvent(item, url);

      if (!candidate || seen.has(candidate.url) || candidate.state !== "CA") {
        continue;
      }

      seen.add(candidate.url);
      candidates.push(candidate);
    }

    $("app-sale-row, a.sale-row, [class*='sale-row']").each((_, element) => {
      const node = $(element);
      const link = node.is("a[href]") ? node : node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());
      const state = inferStateFromUrl(listingUrl);

      if (!listingUrl || seen.has(listingUrl) || !title || !isSaleListingUrl(listingUrl) || state !== "CA") {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "estatesales_net",
        title,
        description: firstText(node, ["p", ".description", "[class*='description']"]),
        city: inferCity(firstText(node, [".city", "[class*='city']", "[class*='location']"])),
        state,
        url: listingUrl,
        imageCount: countImages(node),
        eventEnd: inferDate(firstText(node, ["time", "[class*='date']", "[class*='ends']"])),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(node.text()).slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};

function inferCity(value: string): string | undefined {
  return value.split(",")[0]?.trim() || undefined;
}

function inferDate(value: string): string | undefined {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function mapSaleEvent(item: Record<string, unknown>, baseUrl: string): NormalizedLeadCandidate | null {
  if (item["@type"] !== "SaleEvent") {
    return null;
  }

  const listingUrl = absoluteUrl(asString(item.url), baseUrl);
  const title = cleanText(asString(item.name));

  if (!listingUrl || !title || !isSaleListingUrl(listingUrl)) {
    return null;
  }

  const location = isRecord(item.location) ? item.location : undefined;
  const address = location && isRecord(location.address) ? location.address : undefined;
  const organizer = isRecord(item.organizer) ? item.organizer : undefined;
  const images = Array.isArray(item.image) ? item.image : item.image ? [item.image] : [];
  const state = asString(address?.addressRegion) || inferStateFromUrl(listingUrl);

  return {
    source: "estatesales_net",
    title,
    description: cleanText(asString(item.description)),
    city: cleanText(asString(address?.addressLocality) || asString(location?.name)).split(",")[0]?.trim() || inferCityFromUrl(listingUrl),
    state,
    url: listingUrl,
    imageCount: images.length,
    eventStart: inferDate(asString(item.startDate)),
    eventEnd: inferDate(asString(item.endDate)),
    rawData: {
      companyName: asString(organizer?.name),
      searchUrl: baseUrl
    }
  };
}

function isSaleListingUrl(url: string): boolean {
  return /^https:\/\/www\.estatesales\.net\/[A-Z]{2}\/[^/]+\/\d+\/\d+/.test(url);
}

function inferStateFromUrl(url: string | undefined): string | undefined {
  return url?.match(/^https:\/\/www\.estatesales\.net\/([A-Z]{2})\//)?.[1];
}

function inferCityFromUrl(url: string | undefined): string | undefined {
  const city = url?.match(/^https:\/\/www\.estatesales\.net\/[A-Z]{2}\/([^/]+)\//)?.[1];
  return city ? decodeURIComponent(city).replaceAll("-", " ") : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
