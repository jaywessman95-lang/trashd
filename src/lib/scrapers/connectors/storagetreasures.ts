import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const storageTreasuresConnector: SourceConnector = {
  source: "storagetreasures",
  buildSeedUrls: () => ["https://www.storagetreasures.com/auctions/ca/orange-county"],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("article, li, .auction, .card, [class*='unit'], [class*='auction']").each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());

      if (!listingUrl || seen.has(listingUrl) || !title || !listingUrl.includes("storagetreasures.com")) {
        return;
      }

      const text = cleanText(node.text());
      seen.add(listingUrl);
      candidates.push({
        source: "storagetreasures",
        title,
        description: text,
        city: firstText(node, [".city", "[class*='city']", "[class*='location']"]),
        state: "CA",
        url: listingUrl,
        imageCount: countImages(node),
        eventEnd: inferDate(firstText(node, ["time", "[class*='date']", "[class*='end']"])),
        rawData: {
          searchUrl: url,
          unitSize: text.match(/\b\d{1,2}\s?x\s?\d{1,2}\b/i)?.[0],
          htmlSnippet: text.slice(0, 1000)
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
