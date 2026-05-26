/**
 * Targeted deep-check:
 * 1. Estately — dump raw HTML snippets around "sold" to find actual date format
 * 2. Redfin — try several correct OC/Irvine URL patterns (city ID 9900 was Kirksville MO)
 * 3. Zillow sold map — high volume, known sold dates in JSON
 * 4. OC public assessor recent transfers
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-deep-check.ts
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|\.png|\.jpg|\.js$|sentry|@2x|privacy|legal|press|support@(?:redfin|zillow|trulia|google|facebook|estately|homefinder)/i;

function isRealPhone(p: string): boolean {
  if (p.includes(".")) return false;
  const d = p.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  const area = d.slice(-10, -7);
  if (["800","844","855","866","877","888"].includes(area)) return false;
  return !d.endsWith("0000000");
}

/** Dump 40 chars before + after every occurrence of a keyword */
function snippetsAround(html: string, keyword: RegExp, maxSnippets = 10): string[] {
  const snippets: string[] = [];
  for (const m of html.matchAll(keyword)) {
    if (snippets.length >= maxSnippets) break;
    const start = Math.max(0, m.index! - 40);
    const end = Math.min(html.length, m.index! + 80);
    snippets.push(html.slice(start, end).replace(/\s+/g, " ").trim());
  }
  return snippets;
}

async function probe(name: string, url: string, browser: boolean, note: string) {
  const start = Date.now();
  console.log(`\n── ${name}`);
  console.log(`   URL  : ${url}`);
  console.log(`   Note : ${note}`);
  try {
    const { html, status } = await zyteGet(KEY, { url, browserHtml: browser, httpResponseBody: !browser });
    const ms = Date.now() - start;
    const title = html.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim() ?? "(no title)";
    const priceRefs = (html.match(/\$[\d,]{4,}/g) ?? []).length;
    const phones = [...new Set([...html.matchAll(PHONE_RE)].map(m => m[0]))].filter(isRealPhone);
    const emails = [...new Set([...html.matchAll(EMAIL_RE)].map(m => m[0]))].filter(e => !CORP_EMAIL_RE.test(e));

    // Look for any date-like strings near "sold"
    const soldSnippets = snippetsAround(html, /\bsold\b/gi, 8);
    // Also look for ISO dates in JSON
    const isoMatches = [...html.matchAll(/"(?:soldDate|lastSoldDate|dateSold|closedDate|saleDate)"\s*:\s*"([^"]{6,20})"/gi)].map(m => m[1]).slice(0, 6);
    // Look for "Sold [Month]" or "Sold [mm/dd]"
    const datePhrases = [...html.matchAll(/\bsold\b[^<]{0,60}/gi)].map(m => m[0].slice(0, 60).replace(/\s+/g, " ").trim()).slice(0, 6);

    console.log(`   HTTP : ${status}  |  ${ms}ms  |  ${html.length.toLocaleString()} bytes`);
    console.log(`   Title: ${title.slice(0, 70)}`);
    console.log(`   Prices: ${priceRefs}  |  Phones: ${phones.length} ${phones.slice(0,3).join("  ")}  |  Emails: ${emails.length} ${emails.slice(0,2).join("  ")}`);
    console.log(`   ISO sold dates in JSON : ${isoMatches.length ? isoMatches.join("  ") : "none"}`);
    console.log(`   "Sold ..." text phrases: ${datePhrases.length ? datePhrases.join(" | ") : "none"}`);
    if (soldSnippets.length) {
      console.log(`   Sold snippets (raw):`);
      soldSnippets.forEach(s => console.log(`     > ${s}`));
    }
  } catch (e) {
    console.log(`   EXCEPTION: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }

  // ── ESTATELY: find actual sold date format ─────────────────────────────────
  await probe(
    "estately_oc_sold",
    "https://www.estately.com/CA/Orange_County/sold",
    true,
    "1.8MB page confirmed. Checking raw sold date format in HTML/JSON."
  );

  // ── REDFIN: correct URL formats for OC ────────────────────────────────────
  // Redfin uses /county/{id}/{state}/{county} — OC county ID is 1286 in their system
  await probe(
    "redfin_oc_county",
    "https://www.redfin.com/county/1286/CA/Orange-County/recently-sold",
    true,
    "Redfin county ID 1286 for Orange County CA."
  );
  await probe(
    "redfin_irvine_correct",
    "https://www.redfin.com/CA/Irvine/92618/recently-sold",
    true,
    "Redfin by city+zip (no numeric ID needed)."
  );
  await probe(
    "redfin_oc_zip",
    "https://www.redfin.com/zipcode/92620/recently-sold",
    true,
    "Redfin by OC zip code (Irvine 92620) — most direct sold URL."
  );

  // ── ZILLOW sold with correct JSON path ─────────────────────────────────────
  await probe(
    "zillow_oc_sold",
    "https://www.zillow.com/orange-county-ca/sold/",
    false,
    "Zillow OC sold (HTTP mode). Known to embed sold dates + agent in __NEXT_DATA__."
  );
  await probe(
    "zillow_irvine_sold",
    "https://www.zillow.com/irvine-ca/sold/",
    false,
    "Zillow Irvine sold — city level, denser listings."
  );

  // ── OC ASSESSOR / PUBLIC RECORDS ──────────────────────────────────────────
  await probe(
    "oc_assessor_transfers",
    "https://ocassessor.gov/property-search/property-transfer",
    true,
    "Orange County Assessor — recent transfers with date + address."
  );
  await probe(
    "oc_recorder",
    "https://www.ocrecorder.com/services/real-property-records",
    true,
    "OC Recorder — deed/transfer records with date."
  );

  // ── NEW HIGH-QUALITY CANDIDATES ────────────────────────────────────────────
  await probe(
    "landwatch_oc",
    "https://www.landwatch.com/orange-county-california-land-for-sale",
    true,
    "LandWatch — land + farms, sometimes shows seller contact."
  );
  await probe(
    "opendoor_oc_sold",
    "https://www.opendoor.com/w/homes/orange-county-ca?status=sold",
    true,
    "Opendoor sold — they buy+sell, structured sold data."
  );
  await probe(
    "offerpad_sold",
    "https://www.offerpad.com/homes/sold",
    true,
    "Offerpad sold listings — iBuyer with structured data."
  );
  await probe(
    "houwzer_sold",
    "https://houwzer.com/homes/sold/orange-county-ca",
    true,
    "Houwzer — discount brokerage, OC sold with agent contact."
  );

  console.log("\n═══ DONE ═══\n");
}

main().catch(console.error);
