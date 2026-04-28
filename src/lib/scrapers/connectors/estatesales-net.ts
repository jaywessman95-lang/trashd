import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const estateSalesNetConnector: SourceConnector = {
  source: "estatesales_net",
  buildSeedUrls: () => ["https://www.estatesales.net/CA/Los-Angeles-Orange-County"],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("article, li, .sale, .card, [class*='sale']").each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());

      if (!listingUrl || seen.has(listingUrl) || !title || !listingUrl.includes("estatesales.net")) {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "estatesales_net",
        title,
        description: firstText(node, ["p", ".description", "[class*='description']"]),
        city: inferCity(firstText(node, [".city", "[class*='city']", "[class*='location']"])),
        state: "CA",
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
