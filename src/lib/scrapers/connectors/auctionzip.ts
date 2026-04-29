import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { absoluteUrl, cleanText, countImages, firstText, parseHtml } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

export const auctionZipConnector: SourceConnector = {
  source: "auctionzip",
  render: false,
  buildSeedUrls: () => ["https://www.auctionzip.com/ca.html"],
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
      throw new Error(`AuctionZip direct fetch failed (${response.status}).`);
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

    $("a[href*='/Listings/']").each((_, element) => {
      const link = $(element);
      const listingUrl = absoluteUrl(link.attr("href"), url);

      if (!listingUrl || seen.has(listingUrl) || !isListingUrl(listingUrl)) {
        return;
      }

      const node = findListingContainer(link);
      const text = cleanText(node.text());
      const title = inferTitle(link, text);

      if (!title || isNavigationTitle(title)) {
        return;
      }

      const location = inferLocation(text, listingUrl);
      seen.add(listingUrl);
      candidates.push({
        source: "auctionzip",
        sourceListingId: inferListingId(listingUrl),
        title,
        description: inferDescription(text),
        city: location.city,
        state: "CA",
        url: listingUrl,
        imageCount: countImages(node),
        eventStart: inferDate(text),
        rawData: {
          searchUrl: url,
          htmlSnippet: text.slice(0, 1000)
        }
      });
    });

    return candidates;
  }
};

function findListingContainer(link: ReturnType<ReturnType<typeof parseHtml>>): ReturnType<ReturnType<typeof parseHtml>> {
  const containers = ["li", ".row", ".auction", ".card", "tr", "td", "div"];

  for (const selector of containers) {
    const container = link.closest(selector);

    if (cleanText(container.text()).length > cleanText(link.text()).length + 20) {
      return container;
    }
  }

  return link.parent();
}

function inferTitle(link: ReturnType<ReturnType<typeof parseHtml>>, text: string): string {
  const linkText = cleanText(link.text()).replace(/^View Listing\s*/i, "");

  if (linkText && !/^view listing$/i.test(linkText)) {
    return linkText;
  }

  return (
    firstText(link.parent(), ["h1", "h2", "h3", "h4", "strong", "b"]) ||
    text
      .replace(/^View Listing\s*/i, "")
      .split(/\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+[A-Z][a-z]{2}\s+\d{1,2}/)[0]
      .trim()
  );
}

function inferDescription(text: string): string | undefined {
  return text
    .replace(/\s*View Listing\s*/gi, " ")
    .replace(/\s*View Full Photo Gallery\s*/gi, " ")
    .replace(/\s*Bid Now\s*/gi, " ")
    .trim()
    .slice(0, 800);
}

function inferLocation(text: string, listingUrl: string): { city?: string } {
  const match = text.match(/\b([A-Z][A-Za-z .'-]+),\s*CA\b/);

  if (match?.[1]) {
    return { city: cleanText(match[1]) };
  }

  const urlMatch = listingUrl.match(/-\s*([^,-]+),?\s*CA/i);
  return { city: urlMatch?.[1] ? cleanText(urlMatch[1]) : undefined };
}

function inferDate(value: string): string | undefined {
  const match = value.match(/\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{1,2}:\d{2}(?:AM|PM)?/i);
  const timestamp = Date.parse(match?.[0] ?? value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function inferListingId(url: string): string | undefined {
  return url.match(/\/Listings\/(\d+)\.html/)?.[1];
}

function isListingUrl(url: string): boolean {
  return /^https:\/\/www\.auctionzip\.com\/Listings\/\d+\.html/.test(url);
}

function isNavigationTitle(title: string): boolean {
  return /^(view listing|bid now|view full photo gallery|online bidding|auctioneer directory)$/i.test(title);
}
