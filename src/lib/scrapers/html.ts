import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

export function parseHtml(html: string): CheerioAPI {
  return load(html);
}

export function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function absoluteUrl(href: string | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function extractJsonLd($: CheerioAPI): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;

      if (Array.isArray(parsed)) {
        parsed.filter(isRecord).forEach((item) => items.push(item));
      } else if (isRecord(parsed)) {
        items.push(parsed);
      }
    } catch {
      // Invalid JSON-LD should not break scraping the rest of the page.
    }
  });

  return items;
}

export function firstText(node: Cheerio<AnyNode>, selectors: string[]): string {
  for (const selector of selectors) {
    const value = cleanText(node.find(selector).first().text());

    if (value) {
      return value;
    }
  }

  return "";
}

export function countImages(node: Cheerio<AnyNode>): number {
  return node.find("img, picture, source").length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
