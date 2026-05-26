import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

// Final round: parse Zillow (confirmed working) + one last Redfin attempt
const SOURCES = [
  {
    name: "zillow",
    url: "https://www.zillow.com/orange-county-ca/sold/",
    browser: false,
  },
  // Redfin: try a simple city-level recently-sold page (not the filter system)
  {
    name: "redfin_irvine",
    url: "https://www.redfin.com/city/11203/CA/Irvine/recently-sold",
    browser: true,
  },
];

async function diagnose(s: typeof SOURCES[0]) {
  const start = Date.now();
  try {
    const { html, status } = await zyteGet(KEY, { url: s.url, browserHtml: s.browser, httpResponseBody: !s.browser });
    const ms = Date.now() - start;

    const priceMatches = [...html.matchAll(/\$[\d,]{3,}/g)].map(m => m[0]);
    const rawCount = priceMatches.length;

    // Try to find embedded JSON (Zillow uses window.__data or __NEXT_DATA__)
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]{0,50000}?)<\/script>/i);
    const dataLayerMatch = html.match(/window\.__data\s*=\s*(\{[\s\S]{0,30000}?\});/i);

    let sampleListings: unknown[] = [];

    if (nextDataMatch) {
      try {
        const nd = JSON.parse(nextDataMatch[1]) as any;
        const results =
          nd?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults ??
          nd?.props?.pageProps?.gdpClientCache ??
          [];
        if (Array.isArray(results)) sampleListings = results.slice(0, 3);
      } catch { /* ignore */ }
    }

    const titleMatch = html.match(/<title[^>]*>([^<]{0,80})/i);
    const title = titleMatch ? titleMatch[1] : "(no title)";

    console.log(`\n── ${s.name} (${ms}ms, HTTP ${status})`);
    console.log(`   Title      : ${title}`);
    console.log(`   HTML len   : ${html.length} bytes`);
    console.log(`   $ prices   : ${rawCount} (sample: ${priceMatches.slice(0, 5).join(", ")})`);
    console.log(`   __NEXT_DATA: ${nextDataMatch ? "found" : "not found"}`);
    console.log(`   window.__data: ${dataLayerMatch ? "found" : "not found"}`);
    if (sampleListings.length > 0) {
      console.log(`   Sample leads:`);
      for (const l of sampleListings) {
        console.log(`     ${JSON.stringify(l).slice(0, 160)}`);
      }
    }
  } catch (e) {
    console.log(`\n── ${s.name} EXCEPTION: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function main() {
  console.log("Final round — parsing Zillow + Redfin city level...\n");
  for (const s of SOURCES) {
    await diagnose(s);
  }
}

main().catch(console.error);
