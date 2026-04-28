import { env } from "@/lib/env";

export type ZyteFetchRequest = {
  url: string;
  render?: boolean;
};

export type ZyteFetchResult = {
  url: string;
  html: string;
  statusCode?: number;
};

type ZyteExtractResponse = {
  browserHtml?: string;
  httpResponseBody?: string;
  statusCode?: number;
  url?: string;
};

const zyteEndpoint = "https://api.zyte.com/v1/extract";

export async function fetchWithZyte(request: ZyteFetchRequest): Promise<ZyteFetchResult> {
  if (!env.ZYTE_API_KEY) {
    throw new Error("Missing ZYTE_API_KEY.");
  }

  const auth = Buffer.from(`${env.ZYTE_API_KEY}:`).toString("base64");
  const useBrowserHtml = request.render ?? true;
  const response = await fetch(zyteEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept-Encoding": "br, gzip, deflate"
    },
    body: JSON.stringify(
      useBrowserHtml
        ? {
            url: request.url,
            browserHtml: true
          }
        : {
            url: request.url,
            httpResponseBody: true
          }
    )
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
    statusCode: data.statusCode
  };
}

function decodeHttpResponseBody(body: string | undefined): string | undefined {
  if (!body) return undefined;
  return Buffer.from(body, "base64").toString("utf8");
}
