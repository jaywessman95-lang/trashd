/**
 * Probe v3 — volume + sold dates + contact info (all three required).
 * Fixes: Redfin URL (was 404), longer timeout for Homes.com.
 * New candidates: Estately, Homesnap, local OC IDX sites, CRMLS portal.
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-volume-sold-dates.ts
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

// Phones — real only (no decimal-obfuscated)
const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
// Emails
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
// Sold date patterns
const SOLD_RE = /(?:sold|closed|last.?sold)\s*[:\-]?\s*(\w+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi;
// Listing card count heuristics
const LISTING_CARD_RE = /"listingId"|"zpid"|"property_id"|"listing_id"|data-id="[0-9]|class="[^"]*card[^"]*"/gi;

const SOURCES = [
  // ── KNOWN WINNERS — verify sold dates ──────────────────────────────────────

  // HomeFinder recently-sold — confirmed 48 emails. Does it show sold dates?
  {
    name: "homefinder_sold",
    url: "https://homefinder.com/CA/Orange-County/recently-sold",
    browser: true,
    note: "Confirmed 48 emails. Checking for sold dates.",
  },
  // HomeFinder individual listing — check if sold date + contact on detail page
  {
    name: "homefinder_listing",
    url: "https://homefinder.com/CA/Irvine/recently-sold",
    browser: true,
    note: "City-level recently-sold — often denser listings.",
  },

  // Seven Gables — confirmed 32 emails. Does it have sold listings with dates?
  {
    name: "seven_gables_sold",
    url: "https://www.sevengables.com/properties/?status=sold",
    browser: true,
    note: "Checking for sold listings with dates on this OC brokerage.",
  },

  // FastExpert — confirmed 89 emails. Does it show sold volume or dates?
  {
    name: "fastexpert_agent_detail",
    url: "https://www.fastexpert.com/top-real-estate-agents/irvine-ca/",
    browser: true,
    note: "City-level page — checking sold volume per agent + any dates.",
  },

  // ── REDFIN — FIX URL ────────────────────────────────────────────────────

  // Redfin OC sold (correct filter URL — previous was 404)
  {
    name: "redfin_oc_sold",
    url: "https://www.redfin.com/county/28/CA/Orange-County/filter/include=sold-3mo",
    browser: true,
    note: "Fixed URL. High volume, structured data, agent listed.",
  },
  // Redfin Irvine sold
  {
    name: "redfin_irvine_sold",
    url: "https://www.redfin.com/city/9900/CA/Irvine/filter/include=sold-3mo",
    browser: true,
    note: "City-level recently sold. More density.",
  },

  // ── NEW HIGH-VOLUME CANDIDATES ───────────────────────────────────────────

  // Homes.com — previously timed out; try again
  {
    name: "homes_com_sold",
    url: "https://www.homes.com/orange-county-ca/sold/",
    browser: true,
    note: "Large portal — retrying with standard 60s timeout.",
  },

  // Estately — MLS-connected, shows sold date + listing agent
  {
    name: "estately_oc_sold",
    url: "https://www.estately.com/CA/Orange_County/sold",
    browser: true,
    note: "MLS aggregator known to show agent info + sold dates.",
  },
  {
    name: "estately_irvine_sold",
    url: "https://www.estately.com/CA/Irvine/sold",
    browser: true,
    note: "City-level sold listings.",
  },

  // Homesnap — MLS-connected, shows agent on listing card
  {
    name: "homesnap_sold",
    url: "https://www.homesnap.com/real-estate/sold/CA/Orange-County",
    browser: true,
    note: "MLS-connected portal, agents listed on cards.",
  },

  // Windermere — regional brokerage with public sold listings + agent contact
  {
    name: "windermere_sold",
    url: "https://www.windermere.com/recently-sold?city=Irvine&state=CA",
    browser: true,
    note: "Regional brokerage — sold listings with agent contact.",
  },

  // Gateway Real Estate — OC local brokerage IDX
  {
    name: "gateway_realestate",
    url: "https://gateway.realestate/sold-homes/orange-county-ca/",
    browser: true,
    note: "OC-specific brokerage IDX with sold data.",
  },

  // Coldwell Banker agent SOLD page (individual agent with IDX sold history)
  {
    name: "cb_agent_sold",
    url: "https://www.coldwellbanker.com/sold/CA/orange-county",
    browser: true,
    note: "CB sold listings page — agent attribution expected.",
  },

  // Pacific Premier Realty — large OC brokerage, IDX sold data
  {
    name: "pacific_premier_realty",
    url: "https://www.pacific-premier-realty.com/sold-homes/orange-county/",
    browser: true,
    note: "OC brokerage with IDX sold data.",
  },

  // OC Realtors MLS public search
  {
    name: "ocrealtors_search",
    url: "https://www.ocrealtors.org/find-a-home",
    browser: true,
    note: "OC Association of Realtors — MLS public search.",
  },

  // ListHub — MLS syndication aggregator
  {
    name: "listhub",
    url: "https://www.listhub.com/find-an-agent.html?market=Orange+County%2C+CA",
    browser: true,
    note: "MLS syndication platform — agent directory with market data.",
  },

  // Inhabit.com — luxury real estate, OC sold with agent contact
  {
    name: "inhabit_sold",
    url: "https://www.inhabit.com/search#/?location=Orange%20County%2C%20CA&status=sold",
    browser: true,
    note: "Luxury portal with sold listings + agent contact.",
  },

  // Alain Pinel / Christie's International — OC luxury brokerage
  {
    name: "christies_oc",
    url: "https://www.christiesrealestate.com/eng/sales/search.html?State=California&County=Orange",
    browser: true,
    note: "Christie's luxury listings — OC sold with agent attribution.",
  },

  // Douglas Elliman — OC office, shows sold listings with agent
  {
    name: "elliman_oc_sold",
    url: "https://www.elliman.com/california/search/sold-homes/search-by-map#center=33.7175,-117.8311&zoom=10",
    browser: true,
    note: "Douglas Elliman sold map — OC area.",
  },

  // HomesByMarco — local OC IDX site with full sold data
  {
    name: "homesbymarco",
    url: "https://www.homesbymarco.com/sold-homes/orange-county-ca/",
    browser: true,
    note: "Local IDX site — full MLS sold data with agent contact.",
  },

  // OC Home Search — local IDX portal
  {
    name: "oc_home_search",
    url: "https://www.ochomesearch.com/sold/",
    browser: true,
    note: "OC-specific IDX site.",
  },
];

const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|\.png|\.jpg|\.js$|sentry|@2x|privacy|legal|press|support@(?:redfin|zillow|trulia|google|facebook|compass|homefinder)/i;

function isRealPhone(p: string): boolean {
  if (p.includes(".")) return false; // obfuscated decimal-format
  const digits = p.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return false;
  const area = digits.slice(-10, -7);
  // filter toll-free
  if (["800","844","855","866","877","888"].includes(area)) return false;
  if (digits.endsWith("0000000")) return false;
  return true;
}

async function probe(s: typeof SOURCES[0]) {
  const start = Date.now();
  try {
    const { html, status } = await zyteGet(KEY, {
      url: s.url,
      browserHtml: true,
    });
    const ms = Date.now() - start;

    const phones = [...new Set([...html.matchAll(PHONE_RE)].map(m => m[0]))].filter(isRealPhone);
    const emails = [...new Set([...html.matchAll(EMAIL_RE)].map(m => m[0]))].filter(e => !CORP_EMAIL_RE.test(e));
    const soldDates = [...html.matchAll(SOLD_RE)].map(m => m[0]);
    const uniqueSoldDates = [...new Set(soldDates)];

    // Count listing cards by several heuristics
    const cardMatches = html.match(LISTING_CARD_RE) ?? [];
    const priceRefs = (html.match(/\$[\d,]{4,}/g) ?? []).length;

    const title = html.match(/<title[^>]*>([^<]{0,80})/i)?.[1] ?? "(no title)";

    // Verdict: needs volume (5+ price refs OR 3+ sold dates) AND contact
    const hasVolume = priceRefs >= 5 || uniqueSoldDates.length >= 3;
    const hasContact = phones.length > 0 || emails.length > 0;
    const hasDates = uniqueSoldDates.length > 0;

    const verdict =
      hasVolume && hasContact && hasDates ? "✅ ALL THREE" :
      hasContact && hasDates             ? "⚠️  contact+dates (low volume)" :
      hasVolume && hasContact            ? "⚠️  volume+contact (no dates)" :
      hasVolume && hasDates              ? "⚠️  volume+dates (no contact)" :
      hasContact                         ? "📧 contact only" :
      hasDates                           ? "📅 dates only" :
                                           "❌ UNUSABLE";

    console.log(`\n── ${s.name} (${ms}ms, HTTP ${status})  ${verdict}`);
    console.log(`   Title      : ${title.trim().slice(0, 70)}`);
    console.log(`   HTML       : ${html.length.toLocaleString()} bytes`);
    console.log(`   Price refs : ${priceRefs}  |  Card signals: ${cardMatches.length}`);
    console.log(`   Sold dates : ${uniqueSoldDates.length}  | ${uniqueSoldDates.slice(0, 3).join("  ") || "none"}`);
    console.log(`   Real phones: ${phones.length}  | ${phones.slice(0, 4).join("  ") || "none"}`);
    console.log(`   Real emails: ${emails.length}  | ${emails.slice(0, 4).join("  ") || "none"}`);

  } catch (e) {
    console.log(`\n── ${s.name}  ❌ EXCEPTION: ${e instanceof Error ? e.message.slice(0, 180) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }
  console.log(`Probing ${SOURCES.length} sites for VOLUME + SOLD DATES + CONTACT...\n`);
  for (const s of SOURCES) {
    await probe(s);
  }
  console.log("\n═══ DONE ═══\n");
}

main().catch(console.error);
