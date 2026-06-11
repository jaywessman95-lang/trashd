import { env } from "@/lib/env";

export type ZyteFetchRequest = {
  url: string;
  render?: boolean;
  stealth?: boolean;
  javascript?: string; // JS snippet executed after render; result returned in browserJsResult
};

export type ZyteFetchResult = {
  url: string;
  html: string;
  jsResult?: string;
  statusCode?: number;
};

type ZyteExtractResponse = {
  browserHtml?: string;
  httpResponseBody?: string;
  browserJsResult?: string;
  statusCode?: number;
  url?: string;
};

const zyteEndpoint = "https://api.zyte.com/v1/extract";

// Chrome 125 fingerprint headers — only usable with httpResponseBody (NOT browserHtml)
const STEALTH_HEADERS = [
  { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
  { name: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" },
  { name: "Accept-Language", value: "en-US,en;q=0.9" },
  { name: "Referer", value: "https://www.google.com/search?q=orange+county+real+estate+agents" },
  { name: "sec-ch-ua", value: '"Google Chrome";v="125","Chromium";v="125","Not.A/Brand";v="24"' },
  { name: "sec-ch-ua-mobile", value: "?0" },
  { name: "sec-ch-ua-platform", value: '"Windows"' },
  { name: "Sec-Fetch-Dest", value: "document" },
  { name: "Sec-Fetch-Mode", value: "navigate" },
  { name: "Sec-Fetch-Site", value: "cross-site" },
  { name: "Upgrade-Insecure-Requests", value: "1" },
];

export async function fetchWithZyte(request: ZyteFetchRequest): Promise<ZyteFetchResult> {
  if (!env.ZYTE_API_KEY) {
    throw new Error("Missing ZYTE_API_KEY.");
  }

  const auth = Buffer.from(`${env.ZYTE_API_KEY}:`).toString("base64");

  let body: Record<string, unknown>;
  if (request.stealth) {
    body = {
      url: request.url,
      httpResponseBody: true,
      customHttpRequestHeaders: STEALTH_HEADERS,
    };
  } else if (request.render ?? true) {
    body = request.javascript
      ? { url: request.url, browserHtml: true, javascript: request.javascript }
      : { url: request.url, browserHtml: true };
  } else {
    body = { url: request.url, httpResponseBody: true };
  }

  const response = await fetch(zyteEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept-Encoding": "br, gzip, deflate"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zyte request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ZyteExtractResponse;

  const html = data.browserHtml ?? decodeHttpResponseBody(data.httpResponseBody);

  if (!html) {
    throw new Error("Zyte response did not include HTML.");
  }

  return {
    url: data.url ?? request.url,
    html,
    jsResult: data.browserJsResult,
    statusCode: data.statusCode
  };
}

function decodeHttpResponseBody(body: string | undefined): string | undefined {
  if (!body) return undefined;
  return Buffer.from(body, "base64").toString("utf8");
}
