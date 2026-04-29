import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { slugsForCities } from "@/lib/config/territories";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";
import type { CheerioAPI } from "cheerio";

export const estateSalesOrgConnector: SourceConnector = {
  source: "estatesales_org",
  render: false,
  buildSeedUrls: ({ cities }) => {
    const citySlugs = slugsForCities(cities);

    if (!citySlugs.length) {
      return ["https://estatesales.org/estate-sales/ca/orange-county"];
    }

    return citySlugs.map((citySlug) => `https://estatesales.org/estate-sales/ca/${citySlug}`);
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
      throw new Error(`EstateSales.org direct fetch failed (${response.status}).`);
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

    $("a[href*='/estate-sales/ca/']").each((_, element) => {
      const link = $(element);
      const listingUrl = absoluteUrl(link.attr("href"), url);

      if (!listingUrl || seen.has(listingUrl) || !isSaleListingUrl(listingUrl)) {
        return;
      }

      const node = findSaleContainer(link);
      const title = inferTitle($, link, node);

      if (!title) {
        return;
      }

      const location = parseLocationFromUrl(listingUrl);
      seen.add(listingUrl);
      candidates.push({
        source: "estatesales_org",
        sourceListingId: inferListingId(listingUrl),
        title,
        description: inferDescription(node),
        city: location.city,
        state: "CA",
        url: listingUrl,
        imageCount: inferPhotoCount(node) ?? countImages(node),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(node.text()).slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};

function findSaleContainer(link: ReturnType<ReturnType<typeof parseHtml>>): ReturnType<ReturnType<typeof parseHtml>> {
  const containers = ["article", "li", ".card", "[class*='sale']", "[class*='result']", "div"];

  for (const selector of containers) {
    const container = link.closest(selector);

    if (cleanText(container.text()).length > cleanText(link.text()).length + 30) {
      return container;
    }
  }

  return link.parent();
}

function inferTitle(
  $: CheerioAPI,
  link: ReturnType<CheerioAPI>,
  node: ReturnType<CheerioAPI>
): string {
  const linkText = cleanText(link.text());

  if (linkText && !isListingMetaText(linkText)) {
    return linkText;
  }

  const titleLink = node
    .find("a[href*='/estate-sales/ca/']")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .find((text) => text && !isListingMetaText(text));

  return titleLink ?? firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]);
}

function inferDescription(node: ReturnType<ReturnType<typeof parseHtml>>): string | undefined {
  const text = cleanText(node.text())
    .replace(/\b\d+\s+photos?\b/gi, "")
    .replace(/\b(?:Online auction|In-person estate sale)\b/gi, "")
    .trim();

  return text ? text.slice(0, 800) : undefined;
}

function inferPhotoCount(node: ReturnType<ReturnType<typeof parseHtml>>): number | undefined {
  const match = cleanText(node.text()).match(/\b(\d+)\s+photos?\b/i);
  return match?.[1] ? Number(match[1]) : undefined;
}

function parseLocationFromUrl(url: string): { city?: string; zip?: string } {
  const match = url.match(/\/estate-sales\/ca\/([^/]+)\/(\d{5})\//);

  return {
    city: match?.[1] ? toTitleCase(decodeURIComponent(match[1]).replace(/-/g, " ")) : undefined,
    zip: match?.[2]
  };
}

function inferListingId(url: string): string | undefined {
  return url.match(/-(\d+)(?:\/)?$/)?.[1];
}

function isSaleListingUrl(url: string): boolean {
  return /^https:\/\/estatesales\.org\/estate-sales\/ca\/[^/]+\/\d{5}\/[^/#]+-\d+\/?$/.test(url);
}

function isListingMetaText(value: string): boolean {
  return /^\d+\s+photos?$/i.test(value) || /^(online auction|in-person estate sale)$/i.test(value) || /^[A-Za-z .'-]+,\s*CA\s*\d{5}$/i.test(value);
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
