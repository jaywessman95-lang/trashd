const ZYTE_ENDPOINT = "https://api.zyte.com/v1/extract";

export type ZyteRequest = {
  url: string;
  browserHtml?: boolean;
  httpResponseBody?: boolean;
  geolocation?: string;
};

export type ZyteResult = {
  browserHtml?: string;
  httpResponseBody?: string; // base64
  statusCode?: number;
};

export async function zyteGet(
  apiKey: string,
  req: ZyteRequest
): Promise<{ html: string; status: number }> {
  const body: Record<string, unknown> = {
    url: req.url,
    geolocation: req.geolocation ?? "US",
  };

  // Use browserHtml for JS-heavy sites, httpResponseBody for lightweight
  if (req.browserHtml) {
    body.browserHtml = true;
  } else {
    body.httpResponseBody = true;
    body.httpResponseHeaders = true;
  }

  const res = await fetch(ZYTE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zyte ${res.status}: ${err}`);
  }

  const data = (await res.json()) as ZyteResult;

  let html = "";
  if (data.browserHtml) {
    html = data.browserHtml;
  } else if (data.httpResponseBody) {
    html = Buffer.from(data.httpResponseBody, "base64").toString("utf8");
  }

  return { html, status: data.statusCode ?? res.status };
}
