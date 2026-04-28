import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const auctionZipConnector: SourceConnector = {
  source: "auctionzip",
  buildSeedUrls: () => ["https://www.auctionzip.com/CA-Auctioneers/Orange-County.html", "https://www.auctionzip.com/cgi-bin/auctionlist.cgi?state=CA"],
  async extract(html, url) {
    const $ = parseHtml(html);
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    $("article, tr, li, .auction, .card, [class*='auction']").each((_, element) => {
      const node = $(element);
      const link = node.find("a[href]").first();
      const listingUrl = absoluteUrl(link.attr("href"), url);
      const title = firstText(node, ["h1", "h2", "h3", ".title", "[class*='title']"]) || cleanText(link.text());

      if (!listingUrl || seen.has(listingUrl) || !title || !listingUrl.includes("auctionzip.com")) {
        return;
      }

      seen.add(listingUrl);
      candidates.push({
        source: "auctionzip",
        title,
        description: firstText(node, ["p", ".description", "[class*='description']", "td"]),
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
