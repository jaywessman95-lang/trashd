/**
 * Probe batch 5 — fix bad URLs from batch 4, more OC brokerages,
 * correct YP/BBB geography, and new categories not yet tried.
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-batch5.ts
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

const PHONE_RE  = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const EMAIL_RE  = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_RE = /(?:facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com)\/(?!i18n|pixel|static)[A-Za-z0-9._\-@%/]{3,60}/g;

const CORP_PHONE = new Set(["800","844","855","866","877","888"]);
function isRealPhone(p: string): boolean {
  if (p.includes(".")) return false;
  const d = p.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  return !CORP_PHONE.has(d.slice(-10, -7)) && !d.endsWith("0000000");
}
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|\.png|\.jpg|\.js$|sentry|@2x|privacy|legal|press|abuse@|webmaster@|info@(?:bbb|manta|yp\.|yellow)/i;

const SOURCES = [
  // ── FIX BAD URLS FROM BATCH 4 ─────────────────────────────────────────────

  // First Team — try root agents page
  { name: "firstteam_root",    url: "https://www.firstteam.com/agents/",        browser: true,  cat: "brokerage" },
  { name: "firstteam_find",    url: "https://www.firstteam.com/find-an-agent/",  browser: true,  cat: "brokerage" },
  { name: "firstteam_search",  url: "https://www.firstteam.com/search-agents/",  browser: true,  cat: "brokerage" },
  // YP — use proper OC metro URL
  { name: "yp_oc_realtors",    url: "https://www.yellowpages.com/orange-ca/real-estate-agents", browser: true, cat: "directory" },
  { name: "yp_irvine_agents",  url: "https://www.yellowpages.com/irvine-ca/real-estate-agents", browser: true, cat: "directory" },
  // BBB — use proper location param
  { name: "bbb_oc_correct",    url: "https://www.bbb.org/search?find_text=real+estate+agent&find_loc=Irvine%2C+CA+92618", browser: true, cat: "directory" },

  // ── MORE OC BROKERAGES ────────────────────────────────────────────────────

  // Coldwell Banker Homes — get more pages
  { name: "cbhomes_pg2",       url: "https://www.coldwellbankerhomes.com/ca/orange-county/agents/?page=2", browser: true, cat: "brokerage" },
  // Pacific Sotheby's correct URL
  { name: "pacific_sothebys2", url: "https://www.pacificsothebysrealty.com/our-agents/?location=orange-county", browser: true, cat: "brokerage" },
  { name: "pacific_sothebys3", url: "https://www.pacificsothebysrealty.com/agents/",                             browser: true, cat: "brokerage" },
  // Berkshire Hathaway HomeServices — correct CA URL
  { name: "bhhs_ca",           url: "https://www.bhhscalifornia.com/agents/",                                   browser: true, cat: "brokerage" },
  { name: "bhhs_irvine",       url: "https://www.bhhscalifornia.com/agents/?searchCity=irvine",                 browser: true, cat: "brokerage" },
  // Arbor Real Estate — OC boutique brokerage
  { name: "arbor_re",          url: "https://www.arborre.com/agents/",                                          browser: true, cat: "brokerage" },
  // Regency Real Estate Brokers — OC-specific
  { name: "regency_re",        url: "https://regency.realestatecareers.com/agents",                              browser: true, cat: "brokerage" },
  // Bullock Russell RE — OC boutique
  { name: "bullock_russell",   url: "https://www.bullockrealestate.com/meet-the-team/",                          browser: true, cat: "brokerage" },
  // Anvil Real Estate — boutique OC
  { name: "anvil_re",          url: "https://www.anvil.homes/agents/",                                          browser: true, cat: "brokerage" },
  // T.N.G. Real Estate Consultants
  { name: "tng_re",            url: "https://www.tngre.com/agents/",                                            browser: true, cat: "brokerage" },
  // Star Real Estate — OC independent
  { name: "star_re",           url: "https://www.starrealestate.com/agents/",                                    browser: true, cat: "brokerage" },
  // Keller Williams OC — correct local office URL
  { name: "kw_oc_office",      url: "https://www.kwoc.com/agents/",                                             browser: true, cat: "brokerage" },
  // Re/Max Masters — OC local office
  { name: "remax_masters",     url: "https://www.remaxmasters.com/agents/",                                      browser: true, cat: "brokerage" },

  // ── FSBO / DIRECT HOMEOWNER ───────────────────────────────────────────────

  // ForSaleByOwner.com — homeowner phone/email direct
  { name: "fsbo_oc",           url: "https://www.forsalebyowner.com/real-estate/ca/orange-county/",             browser: true,  cat: "fsbo" },
  // Fizber — FSBO listings with owner contact
  { name: "fizber_oc",         url: "https://www.fizber.com/ca/orange-county/",                                  browser: true,  cat: "fsbo" },
  // ByOwner.com
  { name: "byowner_oc",        url: "https://www.byowner.com/rent/california/orange-county/",                    browser: true,  cat: "fsbo" },
  // FSBO.com
  { name: "fsbo_com",          url: "https://fsbo.com/listings/ca/orange-county/",                               browser: true,  cat: "fsbo" },

  // ── NICHE / ESTATE & PROBATE ──────────────────────────────────────────────

  // US Probate Leads — estate leads with executor contact
  { name: "us_probate_leads",  url: "https://www.usprobateleads.com/probate-listings/orange-county-ca/",        browser: true,  cat: "niche" },
  // NAELA member directory — estate attorneys (referral path)
  { name: "naela_dir",         url: "https://www.naela.org/eweb/StartPage.aspx?Site=naela&WebCode=Member_Dir", browser: true,  cat: "niche" },

  // ── RENTAL / PROPERTY MANAGER ─────────────────────────────────────────────

  // Apartments.com property managers — often have email
  { name: "apartments_pm",     url: "https://www.apartments.com/orange-county-ca/property-managers/",           browser: true,  cat: "rental" },
  // Buildium marketplace — PM software directory
  { name: "buildium_pm",       url: "https://www.buildium.com/property-management/orange-county-ca/",           browser: true,  cat: "rental" },
  // Avail — small landlord platform, some public listings
  { name: "avail_oc",          url: "https://www.avail.co/landlords/orange-county-ca",                          browser: true,  cat: "rental" },

  // ── GOOGLE MY BUSINESS ADJACENT ───────────────────────────────────────────

  // Local.com — local business directory with phone
  { name: "local_com_realtors",url: "https://www.local.com/business/results/orange-county-ca/real-estate-agents/", browser: true, cat: "directory" },
  // EZlocal — local biz directory
  { name: "ezlocal_realtors",  url: "https://www.ezlocal.com/ca/orange/real-estate-agents",                     browser: true,  cat: "directory" },
  // Judy's Book — local reviews with phone
  { name: "judysbook_realtors",url: "https://www.judysbook.com/Real-Estate-Agents/orange-ca.htm",               browser: false, cat: "directory" },
  // n49 — Canadian + US local biz dir
  { name: "n49_realtors",      url: "https://www.n49.com/search/23/0/real-estate-agent/orange-county-ca/",      browser: false, cat: "directory" },

  // ── CREDENTIALING / REVIEW SITES ─────────────────────────────────────────

  // ProveSource / Birdeye — business reviews with contact
  { name: "birdeye_realtors",  url: "https://birdeye.com/real-estate-agents/orange-county-ca",                  browser: true,  cat: "review" },
  // Expertise.com — professional directory with phone + website
  { name: "expertise_realtors",url: "https://expertise.com/ca/orange-county/real-estate-agents",                browser: true,  cat: "review" },
  // Top Rated Local — business reviews with phone
  { name: "topratedlocal",     url: "https://www.topratedlocal.com/real-estate-agents-reviews/california/orange-county", browser: true, cat: "review" },
  // Clutch.co — B2B directory (has real estate firms)
  { name: "clutch_realtors",   url: "https://clutch.co/real-estate/agents?locations%5B%5D=orange-county-ca",   browser: true,  cat: "review" },
];

async function probe(s: typeof SOURCES[0]) {
  const start = Date.now();
  try {
    const { html, status } = await zyteGet(KEY, { url: s.url, browserHtml: s.browser, httpResponseBody: !s.browser });
    const ms = Date.now() - start;

    const realPhones = [...new Set([...html.matchAll(PHONE_RE)].map(m => m[0]))].filter(isRealPhone);
    const realEmails = [...new Set([...html.matchAll(EMAIL_RE)].map(m => m[0]))].filter(e => !CORP_EMAIL_RE.test(e));
    const socialLinks = [...new Set([...html.matchAll(SOCIAL_RE)].map(m => m[0]))].filter(s => !s.includes("pixel") && !s.includes("i18n")).slice(0, 5);
    const title = html.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim() ?? "(no title)";

    const verdict =
      realEmails.length >= 3 || realPhones.length >= 3  ? "✅ USABLE" :
      realEmails.length > 0  || realPhones.length > 0   ? "⚠️  PARTIAL" :
      socialLinks.length >= 3                           ? "🔗 SOCIAL" :
                                                          "❌ UNUSABLE";

    console.log(`\n── [${s.cat.toUpperCase()}] ${s.name}  ${verdict}`);
    console.log(`   HTTP ${status} | ${ms}ms | ${html.length.toLocaleString()} bytes`);
    console.log(`   Title  : ${title.slice(0, 72)}`);
    console.log(`   Phones : ${realPhones.length}  ${realPhones.slice(0, 5).join("  ") || "none"}`);
    console.log(`   Emails : ${realEmails.length}  ${realEmails.slice(0, 4).join("  ") || "none"}`);
    if (socialLinks.length) console.log(`   Social : ${socialLinks.join("  ")}`);
  } catch (e) {
    console.log(`\n── [${s.cat.toUpperCase()}] ${s.name}  ❌ EXCEPTION: ${e instanceof Error ? e.message.slice(0, 140) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }
  console.log(`Probing ${SOURCES.length} sites...\n`);
  for (const s of SOURCES) await probe(s);
  console.log("\n═══ DONE ═══\n");
}
main().catch(console.error);
