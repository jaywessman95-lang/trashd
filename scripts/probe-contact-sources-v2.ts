/**
 * Extended probe — large-volume sold-home sites + agent directories.
 * Looking for: sold dates, phone numbers, emails for OC realtors/homeowners.
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-contact-sources-v2.ts
 *
 * PROBE RESULTS — 2026-05-22
 * NOTE: Many sites show inflated phone counts with obfuscated decimal-format numbers
 *       like "688 274.8203" — those are NOT real phone numbers and are filtered below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Source                 HTTP   RealPhones  RealEmails  True Verdict
 * ─────────────────────────────────────────────────────────────────────────────
 * homefinder_sold        200    3 (714/949)  48          ✅ USABLE — best new source
 * seven_gables           200    33 (714/949) 32          ✅ USABLE — OC brokerage, real contacts
 * har_sold               200    0 real       0 real      ❌ UNUSABLE — obfuscated nums, corporate email only
 * har_agents             404    0            0           ❌ UNUSABLE — 404
 * homes_com_sold         TIMEOUT —           —           ❌ UNUSABLE — Zyte timeout
 * realtor_com_sold       BANNED  —           —           ❌ UNUSABLE — Zyte 520 ban
 * realtor_com_agents     BANNED  —           —           ❌ UNUSABLE — Zyte 520 ban
 * realtor_com_agent_profile BANNED —         —           ❌ UNUSABLE — Zyte 520 ban
 * compass_agents         200    1 real       0           ❌ UNUSABLE — NY corp number, no emails
 * compass_sold           404    0            0           ❌ UNUSABLE — 404 + wrong URL
 * remax_agents           200    0 real       0           ❌ UNUSABLE — obfuscated only
 * century21_agents       404    0 real       0           ❌ UNUSABLE — 404 page
 * coldwellbanker_agents  500    0 real       0           ❌ UNUSABLE — server error
 * bhhs_agents            200    0            0           ❌ UNUSABLE — empty page
 * kw_agents              200    0 real       0           ❌ UNUSABLE — 412 obfuscated only
 * sothebys_agents        404    0 real       0           ❌ UNUSABLE — 404
 * propertyshark_sold     404    0 real       0           ❌ UNUSABLE — 404
 * realtytrac_sold        200    0 real       0           ❌ UNUSABLE — 98 obfuscated only
 * xome_sold              404    0            0 real      ❌ UNUSABLE — 404 + corporate email
 * point2homes_sold       404    0            0           ❌ UNUSABLE — 404
 * listingbook            500    0            0           ❌ UNUSABLE — server error
 * agent_com              404    0            0           ❌ UNUSABLE — 404
 * ratemyagent            404    3            2           ❌ UNUSABLE — 404 + john.smith@gmail.com placeholder
 * topagentsranked        404    0            0           ❌ UNUSABLE — 404
 * pacific_sothebys       202    0            0           ❌ UNUSABLE — challenge page (202)
 * cb_oc_office           500    0            0           ❌ UNUSABLE — server error
 * homesmart_agents       200    0 real       0           ❌ UNUSABLE — obfuscated only
 * exp_realty_agents      SSL ERR —           —           ❌ UNUSABLE — SSL error
 * ─────────────────────────────────────────────────────────────────────────────
 * USABLE sources overall (both probes combined):
 *   1. fastexpert.com     — 134 phones + 89 agent emails (from v1)
 *   2. homefinder.com     — 3 real OC phones + 48 agent emails
 *   3. sevengables.com    — 33 real OC phones + 32 agent emails (OC brokerage)
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

const PHONE_RE = /(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOLD_DATE_RE = /\b(?:sold|closed|last sold)\s*:?\s*(?:on\s+)?([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi;

const SOURCES = [
  // ── LARGE PORTALS WITH SOLD DATA ──────────────────────────────────────────

  // HAR.com — result: obfuscated phones, only mlsqa@har.com (corporate). UNUSABLE.
  {
    name: "har_sold",
    url: "https://www.har.com/mls/recently_sold?county=orange&state=CA",
    browser: true,
    category: "portal",
    usable: false,
  },
  // HAR agents — 404 page. UNUSABLE.
  {
    name: "har_agents",
    url: "https://www.har.com/find-real-estate-agents/orange-county-ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Homes.com — Zyte timeout. UNUSABLE.
  {
    name: "homes_com_sold",
    url: "https://www.homes.com/orange-county-ca/sold/",
    browser: true,
    category: "portal",
    usable: false,
  },

  // Realtor.com sold — Zyte 520 ban. UNUSABLE.
  {
    name: "realtor_com_sold",
    url: "https://www.realtor.com/realestateandhomes-search/Orange-County_CA/show-recently-sold/pg-1",
    browser: true,
    category: "portal",
    usable: false,
  },

  // Realtor.com agents — Zyte 520 ban. UNUSABLE.
  {
    name: "realtor_com_agents",
    url: "https://www.realtor.com/realestateagents/orange-county_ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Compass agents — NY corp phone only, no emails. UNUSABLE.
  {
    name: "compass_agents",
    url: "https://www.compass.com/agents/orange-county-ca/",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Compass sold — 404. UNUSABLE.
  {
    name: "compass_sold",
    url: "https://www.compass.com/listing/orange-county-ca/closed/",
    browser: true,
    category: "portal",
    usable: false,
  },

  // RE/MAX — obfuscated phones only, no emails. UNUSABLE.
  {
    name: "remax_agents",
    url: "https://www.remax.com/real-estate-agents/orange-county-ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Century 21 — 404 page. UNUSABLE.
  {
    name: "century21_agents",
    url: "https://www.century21.com/real-estate/orange-county_ca/agents/",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Coldwell Banker — HTTP 500. UNUSABLE.
  {
    name: "coldwellbanker_agents",
    url: "https://www.coldwellbanker.com/real-estate-agents/CA/orange-county",
    browser: true,
    category: "agents",
    usable: false,
  },

  // BHHS — empty 1.5KB page. UNUSABLE.
  {
    name: "bhhs_agents",
    url: "https://www.bhhscalifornia.com/agents/?searchCity=orange+county",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Keller Williams — 412 obfuscated decimal-format phones, no emails. UNUSABLE.
  {
    name: "kw_agents",
    url: "https://www.kw.com/agent/search?location=Orange+County%2C+CA",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Sotheby's International — 404. UNUSABLE.
  {
    name: "sothebys_agents",
    url: "https://www.sothebysrealty.com/eng/associateoffice/search?searchterm=orange+county+ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // ── SOLD DATA / PUBLIC RECORDS ──────────────────────────────────────────

  // PropertyShark — 404. UNUSABLE.
  {
    name: "propertyshark_sold",
    url: "https://www.propertyshark.com/Real-Estate-Reports/sold-homes/US/CA/Orange-County/",
    browser: true,
    category: "records",
    usable: false,
  },

  // RealtyTrac — 98 obfuscated decimal phones, no emails. UNUSABLE.
  {
    name: "realtytrac_sold",
    url: "https://www.realtytrac.com/mapsearch/#?center=33.7175,-117.8311&zoom=10&type=sold&months=3",
    browser: true,
    category: "records",
    usable: false,
  },

  // Xome — 404, only corporate Xome email. UNUSABLE.
  {
    name: "xome_sold",
    url: "https://www.xome.com/real-estate/sold/orange-county-ca",
    browser: true,
    category: "portal",
    usable: false,
  },

  // HomeFinder — ✅ USABLE: 3 real OC phones (714/949) + 48 real agent emails.
  {
    name: "homefinder_sold",
    url: "https://homefinder.com/CA/Orange-County/recently-sold",
    browser: true,
    category: "portal",
    usable: true,
  },

  // Point2Homes — 404. UNUSABLE.
  {
    name: "point2homes_sold",
    url: "https://www.point2homes.com/US/Real-Estate/CA/Orange-County/Recently-Sold.html",
    browser: true,
    category: "portal",
    usable: false,
  },

  // ListingBook — HTTP 500. UNUSABLE.
  {
    name: "listingbook",
    url: "https://www.listingbook.com/search/recently-sold/CA/Orange-County/",
    browser: true,
    category: "portal",
    usable: false,
  },

  // ── AGENT DIRECTORIES ────────────────────────────────────────────────────

  // Agent.com — 404. UNUSABLE.
  {
    name: "agent_com",
    url: "https://www.agent.com/realtors/orange-county-ca/",
    browser: true,
    category: "agents",
    usable: false,
  },

  // RateMyAgent — 404 + placeholder john.smith@gmail.com. UNUSABLE.
  {
    name: "ratemyagent",
    url: "https://www.ratemyagent.com/real-estate-agent/orange-county-ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // TopAgentsRanked — 404. UNUSABLE.
  {
    name: "topagentsranked",
    url: "https://www.topagentsranked.com/agents/orange-county-ca",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Realtor.com agent profile — Zyte 520 ban. UNUSABLE.
  {
    name: "realtor_com_agent_profile",
    url: "https://www.realtor.com/realestateagents/orange-county_ca/pg-1",
    browser: false,
    category: "agents",
    usable: false,
  },

  // ── OC-SPECIFIC / LOCAL ───────────────────────────────────────────────────

  // Pacific Sotheby's — HTTP 202 challenge page, no content. UNUSABLE.
  {
    name: "pacific_sothebys",
    url: "https://www.pacificsothebysrealty.com/our-agents/",
    browser: true,
    category: "agents",
    usable: false,
  },

  // Seven Gables Real Estate — ✅ USABLE: 33 real OC phones (714/949) + 32 agent emails.
  {
    name: "seven_gables",
    url: "https://www.sevengables.com/agents/",
    browser: true,
    category: "agents",
    usable: true,
  },

  // Coldwell Banker OC office — HTTP 500. UNUSABLE.
  {
    name: "cb_oc_office",
    url: "https://www.coldwellbanker.com/real-estate-offices/CA/orange-county",
    browser: true,
    category: "agents",
    usable: false,
  },

  // HomeSmart — obfuscated phones only. UNUSABLE.
  {
    name: "homesmart_agents",
    url: "https://www.homesmart.com/real-estate-agents/?city=Orange+County&state=CA",
    browser: true,
    category: "agents",
    usable: false,
  },

  // eXp Realty — SSL error. UNUSABLE.
  {
    name: "exp_realty_agents",
    url: "https://search.exprealty.com/agents?location=Orange+County%2C+CA",
    browser: true,
    category: "agents",
    usable: false,
  },
];

// Corporate/spam emails to filter out
const CORPORATE_EMAIL_RE = /example\.|schema\.|\.png|\.jpg|\.js$|sentry|@2x|noreply|no-reply|privacy|legal|press|media|support@(?:zillow|redfin|realtor|trulia|yelp|google|facebook)/i;

// Filter toll-free, obfuscated, and placeholder phone numbers.
// Many sites use CSS digit-scrambling that Zyte renders as decimal-format numbers
// like "688 274.8203" or "919993.3320" — these contain a period and are not real phones.
function isLikelyCorporatePhone(p: string): boolean {
  if (p.includes(".")) return true; // decimal-format = obfuscated by CSS trick
  const digits = p.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return true;
  return digits.startsWith("800") || digits.startsWith("844") || digits.startsWith("855") ||
    digits.startsWith("866") || digits.startsWith("877") || digits.startsWith("888") ||
    digits === "1231231234" || digits.endsWith("0000000");
}

async function probe(s: typeof SOURCES[0]) {
  const start = Date.now();
  try {
    const { html, status } = await zyteGet(KEY, {
      url: s.url,
      browserHtml: s.browser,
      httpResponseBody: !s.browser,
    });
    const ms = Date.now() - start;

    const allPhones = [...html.matchAll(PHONE_RE)].map(m => m[0]);
    const realPhones = [...new Set(allPhones)].filter(p => !isLikelyCorporatePhone(p));

    const allEmails = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
    const realEmails = [...new Set(allEmails)].filter(e => !CORPORATE_EMAIL_RE.test(e));

    const soldDates = [...html.matchAll(SOLD_DATE_RE)].map(m => m[0]);

    const titleMatch = html.match(/<title[^>]*>([^<]{0,80})/i);
    const title = titleMatch?.[1] ?? "(no title)";

    const hasAgentSection = /agent[_\-. ]?name|agentName|listingAgent|"agent"|agentPhone|agentEmail/i.test(html);
    const listingCount = (html.match(/\$[\d,]{4,}/g) ?? []).length;

    const verdict = realPhones.length > 2 || realEmails.length > 1
      ? "✅ USABLE"
      : realPhones.length > 0 || realEmails.length > 0
        ? "⚠️  PARTIAL"
        : "❌ UNUSABLE";

    console.log(`\n── [${s.category.toUpperCase()}] ${s.name} (${ms}ms, HTTP ${status})  ${verdict}`);
    console.log(`   Title      : ${title}`);
    console.log(`   HTML       : ${html.length.toLocaleString()} bytes  |  ~${listingCount} price refs`);
    console.log(`   Real phones: ${realPhones.length}  | ${realPhones.slice(0, 5).join("  ") || "none"}`);
    console.log(`   Real emails: ${realEmails.length}  | ${realEmails.slice(0, 4).join("  ") || "none"}`);
    console.log(`   Sold dates : ${soldDates.length}  | ${soldDates.slice(0, 3).join("  ") || "none"}`);
    console.log(`   Agent data : ${hasAgentSection ? "YES" : "no"}`);

  } catch (e) {
    console.log(`\n── [${s.category.toUpperCase()}] ${s.name}  ❌ EXCEPTION: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }
  console.log(`Probing ${SOURCES.length} sites for sold dates + agent phone/email...\n`);
  for (const s of SOURCES) {
    await probe(s);
  }
  console.log("\n═══ DONE ═══\n");
}

main().catch(console.error);
