import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import type { CheerioAPI } from "cheerio";
import { absoluteUrl, cleanText, extractJsonLd, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

const searchSections = ["zip", "gms", "fua"];
const searchTerms = ["moving", "must go", "free", "everything", "take all", "garage sale", "estate", "cleanout"];

export const craigslistConnector: SourceConnector = {
  source: "craigslist",
  render: false,
  buildSeedUrls: () => [
    ...searchSections.map((section) => `https://orangecounty.craigslist.org/search/${section}`),
    ...searchSections.flatMap((section) =>
      searchTerms.map((term) => `https://orangecounty.craigslist.org/search/${section}?query=${encodeURIComponent(term)}`)
    )
  ],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const listingSelectors = ["li.cl-search-result", "li.result-row", ".result-info", ".cl-static-search-result"];
    const seenUrls = new Set<string>();

    $(listingSelectors.join(",")).each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const href = link.attr("href");
      const title = cleanText(
        node.find(".titlestring, .result-title, .title").first().text() || link.text() || node.text().split("\n")[0]
      );

      if (!href || !title) {
        return;
      }

      const absoluteUrlValue = absoluteUrl(href, url);

      if (!absoluteUrlValue || seenUrls.has(absoluteUrlValue)) {
        return;
      }

      seenUrls.add(absoluteUrlValue);

      candidates.push({
        source: "craigslist",
        sourceListingId: inferCraigslistId(absoluteUrlValue),
        title,
        description: cleanText(node.find(".result-hood, .location, .meta").text()),
        city: inferCity(node.find(".result-hood, .location").text()),
        state: "CA",
        url: absoluteUrlValue,
        price: cleanText(node.find(".price, .result-price").first().text()),
        imageCount: countCraigslistImages(node),
        postedAt: node.find("time").attr("datetime"),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(node.text()).slice(0, 1000)
        }
      });
    });

    for (const item of extractCraigslistJsonLd($, url)) {
      if (seenUrls.has(item.url)) {
        continue;
      }

      seenUrls.add(item.url);
      candidates.push(item);
    }

    return candidates;
  }
};

function inferCraigslistId(url: string): string | undefined {
  return url.match(/\/(\d+)\.html/)?.[1];
}

function inferCity(value: string): string | undefined {
  const cleaned = cleanText(value).replace(/[()]/g, "");
  return cleaned || undefined;
}

function countCraigslistImages(node: ReturnType<CheerioAPI>): number {
  const ids = node.attr("data-ids") ?? node.find("[data-ids]").attr("data-ids");

  if (ids) {
    return ids.split(",").filter(Boolean).length;
  }

  return node.find("img, picture").length;
}

function extractCraigslistJsonLd($: CheerioAPI, url: string): NormalizedLeadCandidate[] {
  const candidates: NormalizedLeadCandidate[] = [];
  const jsonLd = extractJsonLd($);

  for (const block of jsonLd) {
    const itemList = Array.isArray(block.itemListElement) ? block.itemListElement : [];

    for (const entry of itemList) {
      if (!isRecord(entry) || !isRecord(entry.item)) {
        continue;
      }

      const item = entry.item;
      const title = typeof item.name === "string" ? item.name : "";

      if (!title) {
        continue;
      }

      const offer = isRecord(item.offers) ? item.offers : undefined;
      const place = offer && isRecord(offer.availableAtOrFrom) ? offer.availableAtOrFrom : undefined;
      const address = place && isRecord(place.address) ? place.address : undefined;
      const images = Array.isArray(item.image) ? item.image : [];
      const position = typeof entry.position === "string" || typeof entry.position === "number" ? String(entry.position) : String(candidates.length);
      const listingUrl = typeof item.url === "string" ? item.url : `${url}#jsonld-${position}`;

      candidates.push({
        source: "craigslist",
        sourceListingId: inferCraigslistId(listingUrl) ?? `jsonld-${position}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
        title,
        description: typeof item.description === "string" ? item.description : undefined,
        city: address && typeof address.addressLocality === "string" ? address.addressLocality : undefined,
        state: address && typeof address.addressRegion === "string" ? address.addressRegion : "CA",
        url: listingUrl,
        price: offer && typeof offer.price === "string" ? offer.price : undefined,
        imageCount: images.length,
        rawData: {
          searchUrl: url,
          jsonLdPosition: position
        }
      });
    }
  }

  return candidates;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
