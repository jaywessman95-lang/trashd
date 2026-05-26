/**
 * Final targeted check:
 * - Redfin detail page: does it expose agent phone/email on a sold listing?
 * - Redfin zip 92620 sold list: are SOLD dates visible in card text?
 * - HomeFinder listing detail: is sold date on the detail page?
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-detail-pages.ts
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

function phones(html: string) {
  return [...new Set([...html.matchAll(/\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4}/g)].map(m => m[0]))]
    .filter(p => !p.includes(".") && !/^[08]/.test(p.replace(/\D/g,"").slice(0,1)) )
    .slice(0, 8);
}
function emails(html: string) {
  return [...new Set([...html.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map(m => m[0]))]
    .filter(e => !/noreply|no-reply|support@(?:redfin|homefinder|zillow)|\.png|\.js$/i.test(e))
    .slice(0, 8);
}
function around(html: string, re: RegExp, ctx = 80, max = 6) {
  return [...html.matchAll(re)].slice(0, max).map(m =>
    html.slice(Math.max(0, m.index! - 20), m.index! + ctx).replace(/\s+/g, " ").trim()
  );
}

async function run(label: string, url: string, browser: boolean) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`► ${label}`);
  console.log(`  ${url}`);
  try {
    const { html, status } = await zyteGet(KEY, { url, browserHtml: browser, httpResponseBody: !browser });
    console.log(`  HTTP ${status} | ${html.length.toLocaleString()} bytes`);
    console.log(`  Title: ${html.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim()}`);

    const ph = phones(html);
    const em = emails(html);
    console.log(`  Phones : ${ph.length} → ${ph.slice(0,5).join("  ") || "none"}`);
    console.log(`  Emails : ${em.length} → ${em.slice(0,4).join("  ") || "none"}`);

    // Sold date formats
    const soldUpperCase = [...html.matchAll(/SOLD [A-Z]{3} \d{1,2}, \d{4}/g)].map(m => m[0]).slice(0, 6);
    const soldTitleCase = [...html.matchAll(/Sold [A-Z][a-z]+ \d{1,2},? \d{4}/g)].map(m => m[0]).slice(0, 6);
    const soldSlash    = [...html.matchAll(/(?:sold|closed)[^<]{0,20}\d{1,2}\/\d{1,2}\/\d{2,4}/gi)].map(m => m[0].slice(0,40)).slice(0,6);
    const soldIso      = [...html.matchAll(/"(?:soldDate|dateSold|saleDate|closedDate|lastSoldDate)"\s*:\s*"([^"]{6,20})"/gi)].map(m => m[1]).slice(0,6);
    const soldRelative = [...html.matchAll(/(?:sold|closed)\s+\d+\s+(?:day|week|month|year)/gi)].map(m => m[0]).slice(0,4);
    console.log(`  Sold (ALL-CAPS)  : ${soldUpperCase.join("  ") || "none"}`);
    console.log(`  Sold (TitleCase) : ${soldTitleCase.join("  ") || "none"}`);
    console.log(`  Sold (slash date): ${soldSlash.join("  ") || "none"}`);
    console.log(`  Sold (ISO JSON)  : ${soldIso.join("  ") || "none"}`);
    console.log(`  Sold (relative)  : ${soldRelative.join("  ") || "none"}`);

    // Agent section
    const agentSnips = around(html, /listing.?agent|listed.?by|agent.?name|agent.?phone|DRE#?\s*\d/gi, 100, 4);
    if (agentSnips.length) {
      console.log(`  Agent snippets:`);
      agentSnips.forEach(s => console.log(`    → ${s}`));
    }

    // Any phone in JSON
    const jsonPhones = [...html.matchAll(/"(?:phone|phoneNumber|agentPhone)"\s*:\s*"([^"]{7,15})"/gi)].map(m => m[1]).slice(0,4);
    if (jsonPhones.length) console.log(`  JSON phones: ${jsonPhones.join("  ")}`);

  } catch (e) {
    console.log(`  EXCEPTION: ${e instanceof Error ? e.message.slice(0,200) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }

  // Redfin sold list — do cards show SOLD dates?
  await run(
    "Redfin 92620 recently-sold LIST (browser)",
    "https://www.redfin.com/zipcode/92620/recently-sold",
    true
  );

  // Redfin sold detail page — agent phone/email visible?
  await run(
    "Redfin sold DETAIL page (browser)",
    "https://www.redfin.com/CA/Irvine/100-Tall-Reed/home/4513408",
    true
  );

  // HomeFinder recently-sold list — are sold dates in the listing cards?
  await run(
    "HomeFinder Irvine recently-sold LIST",
    "https://homefinder.com/CA/Irvine/recently-sold",
    true
  );

  // Zillow sold list — __NEXT_DATA__ has soldDate, show a few raw entries
  await run(
    "Zillow Irvine sold LIST (HTTP, fast)",
    "https://www.zillow.com/irvine-ca/sold/",
    false
  );

  console.log("\n═══ DONE ═══");
}

main().catch(console.error);
