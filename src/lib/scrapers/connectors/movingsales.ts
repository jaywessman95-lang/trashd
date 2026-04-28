import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const movingSalesConnector: SourceConnector = {
  source: "movingsales",
  buildSeedUrls: () => [
    "https://www.garagesalefinder.com/yard-sales/orange-county-ca/",
    "https://gsalr.com/garage-sales-orange-county-ca.html"
  ],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("article, li, .sale, .card, [class*='sale']").each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());

      if (!listingUrl || seen.has(listingUrl) || !title) {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "movingsales",
        title,
        description: firstText(node, ["p", ".description", "[class*='description']"]),
        city: firstText(node, [".city", "[class*='city']", "[class*='location']"]),
        state: "CA",
        url: listingUrl,
        imageCount: countImages(node),
        eventEnd: inferDate(firstText(node, ["time", "[class*='date']", "[class*='end']"])),
        rawData: {
          searchUrl: url,
          htmlSnippet: cleanText(node.text()).slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};

function inferDate(value: string): string | undefined {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}
