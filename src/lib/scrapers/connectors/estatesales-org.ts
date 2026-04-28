import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const estateSalesOrgConnector: SourceConnector = {
  source: "estatesales_org",
  buildSeedUrls: () => ["https://estatesales.org/estate-sales/ca/orange-county"],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("article, li, .card, [class*='sale']").each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());

      if (!listingUrl || seen.has(listingUrl) || !title || !listingUrl.includes("estatesales.org")) {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "estatesales_org",
        title,
        description: firstText(node, ["p", ".description", "[class*='description']"]),
        city: firstText(node, [".city", "[class*='city']", "[class*='location']"]),
        state: "CA",
        url: listingUrl,
        imageCount: countImages(node),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(node.text()).slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};
