import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

const searchTerms = ["moving", "must go", "free furniture", "garage cleanout", "downsizing", "take all"];

export const offerupConnector: SourceConnector = {
  source: "offerup",
  buildSeedUrls: () => searchTerms.map((term) => `https://offerup.com/search?q=${encodeURIComponent(term)}`),
  async extract(html, url) {
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

function isLikelyOfferUpListing(url: string): boolean {
  return /offerup\.com\/item\/|offerup\.com\/p\//.test(url);
}
