/**
 * Probe each candidate site for agent phone/email scrapability.
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-contact-sources.ts
 *
 * PROBE RESULTS — 2026-05-22
 * ─────────────────────────────────────────────────────────────────
 * Source                  HTTP  Phones  Emails  Usable?
 * ─────────────────────────────────────────────────────────────────
 * zillow_detail           200   9       0       PARTIAL (phones only; some obfuscated by Zillow)
 * zillow_detail_browser   200   18      0       PARTIAL (more phones w/ browser; still no emails)
 * trulia_sold             ERR   -       -       UNUSABLE — fetch exception (Zyte blocked)
 * trulia_sold_browser     200   0       0       UNUSABLE — 0 contacts returned
 * movoto_sold             200   5       0       UNUSABLE — corporate/fake numbers only, no emails
 * redfin_listing          404   0       0       UNUSABLE — URL returned 404, no contacts
 * homelight_agents        404   1       1       UNUSABLE — 404 + only corporate PR contact
 * fastexpert_agents       200   134     89      ✅ USABLE — real agent emails + direct phones
 * realestateagent_com     404   0       0       UNUSABLE — 404 page, no contacts
 * yelp_realtors           ERR   -       -       UNUSABLE — Zyte ban (520)
 * ─────────────────────────────────────────────────────────────────
 * FastExpert is the only viable contact source.
 * Sample FastExpert emails: homes@sold-by-frank.com, Christian@sbluxurygroup.com, brittany@mcluregroup.com
 * Sample FastExpert phones: (562) 754-2099, (800) 319-0511
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

// Phone: (949) 555-1234 / 949-555-1234 / 9495551234 / +1 949...
const PHONE_RE = /(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4})/g;
// Email
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SOURCES = [
  // Zillow detail page for a confirmed OC sold listing
  // RESULT: PARTIAL — phones found (9 HTTP / 18 browser), no emails. Zillow obfuscates some numbers.
  {
    name: "zillow_detail",
    url: "https://www.zillow.com/homedetails/3182-Brimhall-Dr-Los-Alamitos-CA-90720/25166394_zpid/",
    browser: false,
    usable: false, // phones only, obfuscated, no emails
  },
  {
    name: "zillow_detail_browser",
    url: "https://www.zillow.com/homedetails/3182-Brimhall-Dr-Los-Alamitos-CA-90720/25166394_zpid/",
    browser: true,
    usable: false, // more phones but still no emails
  },
  // Trulia — Zillow-owned, OC sold
  // RESULT: UNUSABLE — HTTP mode blocked by Zyte; browser mode returns 0 phones and 0 emails
  {
    name: "trulia_sold",
    url: "https://www.trulia.com/sold/orange_county,ca/",
    browser: false,
    usable: false, // fetch exception — Zyte blocked
  },
  {
    name: "trulia_sold_browser",
    url: "https://www.trulia.com/sold/orange_county,ca/",
    browser: true,
    usable: false, // 0 phones, 0 emails
  },
  // Movoto — independent portal
  // RESULT: UNUSABLE — 5 phones all corporate/fake (844 numbers + 123-123-1234), 0 emails
  {
    name: "movoto_sold",
    url: "https://www.movoto.com/orange-county-ca/sold/",
    browser: true,
    usable: false, // corporate numbers only, no emails
  },
  // Redfin recently-sold page
  // RESULT: UNUSABLE — URL returned 404, no real contacts found
  {
    name: "redfin_listing",
    url: "https://www.redfin.com/CA/Irvine/recently-sold",
    browser: true,
    usable: false, // 404 + no contacts
  },
  // HomeLight agent directory (OC) — agents list public phones
  // RESULT: UNUSABLE — URL returned 404; only pr@homelight.com and corporate 855 number found
  {
    name: "homelight_agents",
    url: "https://www.homelight.com/orange-county-ca-real-estate-agents",
    browser: true,
    usable: false, // 404 + corporate contact only
  },
  // FastExpert — agent directory with ratings & contact
  // RESULT: ✅ USABLE — 134 phones + 89 real agent emails (e.g. homes@sold-by-frank.com)
  {
    name: "fastexpert_agents",
    url: "https://www.fastexpert.com/top-real-estate-agents/orange-county-ca/",
    browser: true,
    usable: true, // 134 phones, 89 agent emails — best source
  },
  // RealEstateAgent.com — public agent directory
  // RESULT: UNUSABLE — returned 404, only 866 toll-free number found
  {
    name: "realestateagent_com",
    url: "https://www.realestateagent.com/real-estate-agents/california/orange-county.html",
    browser: false,
    usable: false, // 404 page, no contacts
  },
  // Yelp — real estate agents OC (often has phone numbers)
  // RESULT: UNUSABLE — Zyte 520 ban, could not retrieve page
  {
    name: "yelp_realtors",
    url: "https://www.yelp.com/search?find_desc=Real+Estate+Agents&find_loc=Orange+County%2C+CA",
    browser: true,
    usable: false, // Zyte ban (520)
  },
];

async function probe(s: typeof SOURCES[0]) {
  const start = Date.now();
  try {
    const { html, status } = await zyteGet(KEY, {
      url: s.url,
      browserHtml: s.browser,
      httpResponseBody: !s.browser,
    });
    const ms = Date.now() - start;

    const phones = [...html.matchAll(PHONE_RE)].map(m => m[0]);
    const emails = [...html.matchAll(EMAIL_RE)]
      .map(m => m[0])
      .filter(e => !e.includes("example") && !e.includes("schema") && !e.includes(".png") && !e.includes(".jpg") && !e.endsWith(".js") && !e.includes("sentry") && !e.includes("@2x"));

    const titleMatch = html.match(/<title[^>]*>([^<]{0,80})/i);
    const title = titleMatch?.[1] ?? "(no title)";

    // Look for agent-specific patterns
    const hasAgentSection = /listing.agent|agent.name|agentName|listingAgent|agent_name|"agent"/i.test(html);
    const hasPhoneInJson = /"phone"\s*:\s*"([^"]{7,20})"/g;
    const jsonPhones = [...html.matchAll(hasPhoneInJson)].map(m => m[1]).filter(p => /\d{7,}/.test(p));

    console.log(`\n── ${s.name} (${ms}ms, HTTP ${status}) [${s.usable ? "✅ USABLE" : "❌ UNUSABLE"}]`);
    console.log(`   Title    : ${title}`);
    console.log(`   HTML len : ${html.length.toLocaleString()} bytes`);
    console.log(`   Phones   : ${phones.length} found  | sample: ${[...new Set(phones)].slice(0, 5).join("  ")}`);
    console.log(`   Emails   : ${emails.length} found  | sample: ${[...new Set(emails)].slice(0, 4).join("  ")}`);
    console.log(`   JSON phones: ${jsonPhones.slice(0, 4).join("  ") || "none"}`);
    console.log(`   Agent section: ${hasAgentSection ? "YES" : "no"}`);

  } catch (e) {
    console.log(`\n── ${s.name} EXCEPTION [❌ UNUSABLE]: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }
  console.log("Probing candidate sites for agent phone/email...\n");
  for (const s of SOURCES) {
    await probe(s);
  }
  console.log("\nDone.");
}

main().catch(console.error);
