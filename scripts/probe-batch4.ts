/**
 * Probe batch 4 — business directories, local OC brokerages, professional marketplaces,
 * government license DBs, and sites that expose social-media / website links.
 * Scoring: emails OR phones → USABLE. Social/website links → NOTE.
 * Run: ZYTE_API_KEY=... npx tsx scripts/probe-batch4.ts
 */
import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

const PHONE_RE   = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_RE  = /(?:facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com)\/[A-Za-z0-9._\-@%/]{3,60}/g;
const WEBSITE_RE = /(?:website|homepage|profile.?url|agentUrl|personalUrl|profileUrl|siteUrl)["\s:]+(?:https?:\/\/[^\s"',<>]{8,60})/gi;

const CORP_PHONE = new Set(["800","844","855","866","877","888"]);
function isRealPhone(p: string): boolean {
  if (p.includes(".")) return false;
  const d = p.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  return !CORP_PHONE.has(d.slice(-10, -7)) && !d.endsWith("0000000");
}
const CORP_EMAIL = /example\.|schema\.|noreply|no-reply|\.png|\.jpg|\.js$|sentry|@2x|privacy|legal|press|abuse@|info@(?:yellow|bbb|manta|bark|thumb|dre\.|car\.org|nar\.)|support@(?:zillow|redfin|trulia|google|facebook|homefinder|fastexpert)/i;

const SOURCES = [
  // ── BUSINESS DIRECTORIES ────────────────────────────────────────────────────

  {
    name: "yellowpages_realtors",
    url: "https://www.yellowpages.com/orange-county-ca/real-estate-agents",
    browser: true,
    cat: "directory",
    note: "YP — historically reliable phone numbers for licensed agents",
  },
  {
    name: "bbb_realtors",
    url: "https://www.bbb.org/search?find_text=real+estate+agent&find_loc=Orange+County%2C+CA",
    browser: true,
    cat: "directory",
    note: "BBB — licensed business listings with phone + website",
  },
  {
    name: "manta_realtors",
    url: "https://www.manta.com/c/mmlnm7j/real-estate-agents-orange-county-ca",
    browser: true,
    cat: "directory",
    note: "Manta — small business directory, often has email + website",
  },
  {
    name: "superpages_realtors",
    url: "https://www.superpages.com/orange-county-ca/bpp/real-estate-agents",
    browser: true,
    cat: "directory",
    note: "Superpages — local business listings with phone",
  },
  {
    name: "whitepages_realtors",
    url: "https://www.whitepages.com/business/real-estate-orange-county-ca",
    browser: true,
    cat: "directory",
    note: "Whitepages — business directory with phone",
  },
  {
    name: "alignable_realtors",
    url: "https://www.alignable.com/orange-ca/real-estate",
    browser: true,
    cat: "directory",
    note: "Alignable — small biz social network, agents often post email + social",
  },
  {
    name: "mapquest_realtors",
    url: "https://www.mapquest.com/search/results?query=real+estate+agents&location=Orange+County%2C+CA",
    browser: true,
    cat: "directory",
    note: "MapQuest local search — often shows phone + website",
  },
  {
    name: "citysearch_realtors",
    url: "https://www.citysearch.com/search/orange-county-ca/real-estate-agents",
    browser: true,
    cat: "directory",
    note: "Citysearch — local business directory",
  },

  // ── PROFESSIONAL MARKETPLACES ────────────────────────────────────────────────

  {
    name: "bark_realtors",
    url: "https://www.bark.com/en/us/real-estate-agent/orange-county-ca/",
    browser: true,
    cat: "marketplace",
    note: "Bark — pros marketplace, agents list phone/email to get clients",
  },
  {
    name: "thumbtack_realtors",
    url: "https://www.thumbtack.com/ca/orange/real-estate-agent/",
    browser: true,
    cat: "marketplace",
    note: "Thumbtack — verified pro profiles with contact + social links",
  },
  {
    name: "homeadvisor_realtors",
    url: "https://www.homeadvisor.com/task.Real-Estate-Agent.html",
    browser: true,
    cat: "marketplace",
    note: "HomeAdvisor — professional listings with phone + website",
  },
  {
    name: "angis_realtors",
    url: "https://www.angi.com/companylist/us/ca/orange-county/real-estate-agents.htm",
    browser: true,
    cat: "marketplace",
    note: "Angi (formerly Angie's List) — professional ratings with contact",
  },

  // ── GOVERNMENT / LICENSING ───────────────────────────────────────────────────

  {
    name: "dre_ca_licensee",
    url: "https://www2.dre.ca.gov/publicASP/pplinfo.asp?License_id=&Name=&Zip_Code=92618&License_Type=S&AddressType=B&more=Y",
    browser: true,
    cat: "gov",
    note: "CA DRE licensee search — official license DB with broker name + address",
  },
  {
    name: "dre_ca_broker_search",
    url: "https://www2.dre.ca.gov/publicASP/pplinfo.asp?License_id=&Name=&Zip_Code=92618&License_Type=R&AddressType=B&more=Y",
    browser: false,
    cat: "gov",
    note: "CA DRE broker license search Irvine 92618 — no-JS should work",
  },

  // ── ZILLOW / TRULIA AGENT FINDERS ────────────────────────────────────────────

  {
    name: "zillow_agent_finder",
    url: "https://www.zillow.com/agent-finder/real-estate-agent-reviews/orange-county-ca/",
    browser: true,
    cat: "agents",
    note: "Zillow Agent Finder — different from home listings, exposes phone",
  },
  {
    name: "zillow_agent_finder_http",
    url: "https://www.zillow.com/agent-finder/real-estate-agent-reviews/orange-county-ca/",
    browser: false,
    cat: "agents",
    note: "Zillow Agent Finder — HTTP mode, check if __NEXT_DATA__ has phones",
  },

  // ── OC-SPECIFIC BROKERAGES NOT YET TESTED ────────────────────────────────────

  {
    name: "firstteam_agents",
    url: "https://www.firstteam.com/agent-search/",
    browser: true,
    cat: "brokerage",
    note: "First Team RE — biggest OC independent brokerage, full agent directory",
  },
  {
    name: "johnhart_agents",
    url: "https://www.johnhart.com/agent-directory/",
    browser: true,
    cat: "brokerage",
    note: "JohnHart — large SoCal independent, OC agents with direct contact",
  },
  {
    name: "remax_oc_office",
    url: "https://www.remax.com/offices/orange-ca/remax-select-one/100209070",
    browser: true,
    cat: "brokerage",
    note: "RE/MAX OC office agent roster — individual agent profiles with phone",
  },
  {
    name: "century21_oc_office",
    url: "https://www.century21.com/real-estate-offices/orange-county-ca-century-21-affiliated",
    browser: true,
    cat: "brokerage",
    note: "Century 21 OC office — agent profiles with direct phone/email",
  },
  {
    name: "coldwell_oc_agents",
    url: "https://www.coldwellbankerhomes.com/ca/orange-county/agents/",
    browser: true,
    cat: "brokerage",
    note: "Coldwell Banker Homes OC (different domain from coldwellbanker.com)",
  },
  {
    name: "realty_one_group",
    url: "https://www.realtyonegroup.com/find-an-agent/?state=CA&city=Irvine",
    browser: true,
    cat: "brokerage",
    note: "Realty ONE Group — large OC-founded brokerage, agent directory",
  },
  {
    name: "douglas_elliman_agents",
    url: "https://www.elliman.com/real-estate-agents/search/California",
    browser: true,
    cat: "brokerage",
    note: "Douglas Elliman CA agent directory with direct phone",
  },
  {
    name: "compass_oc_agents",
    url: "https://www.compass.com/agents/orange-county-ca/?page=2",
    browser: true,
    cat: "brokerage",
    note: "Compass OC agents page 2 — try deeper page for more agent data",
  },

  // ── CAR / NAR MEMBER DIRECTORIES ─────────────────────────────────────────────

  {
    name: "car_member_search",
    url: "https://www.car.org/en/findarealtorform",
    browser: true,
    cat: "association",
    note: "California Association of Realtors — member finder",
  },
  {
    name: "nar_member_search",
    url: "https://www.nar.realtor/find-a-realtor",
    browser: true,
    cat: "association",
    note: "National Association of Realtors — public member search",
  },

  // ── SOCIAL-MEDIA-ADJACENT ─────────────────────────────────────────────────────

  {
    name: "facebook_oc_realtors",
    url: "https://www.facebook.com/public/orange-county-realtor",
    browser: true,
    cat: "social",
    note: "Facebook public pages — agents often list phone in page info",
  },
  {
    name: "linkedin_oc_realtors",
    url: "https://www.linkedin.com/search/results/people/?keywords=realtor+orange+county+CA&network=%5B%22F%22%2C%22S%22%5D",
    browser: true,
    cat: "social",
    note: "LinkedIn — public profiles sometimes show email + phone",
  },

  // ── MISC HIGH-QUALITY LEADS ───────────────────────────────────────────────────

  {
    name: "realtorpro_search",
    url: "https://www.realtor.com/realestateagents/orange-county_ca/pg-1?recommended=1",
    browser: true,
    cat: "portal",
    note: "Realtor.com agent search — different URL variant, testing if ban applies",
  },
  {
    name: "homes_com_agents",
    url: "https://www.homes.com/real-estate-agents/orange-county-ca/",
    browser: true,
    cat: "portal",
    note: "Homes.com agent directory — different from sold listings page",
  },
  {
    name: "opcity_agents",
    url: "https://www.opcity.com/find-an-agent/orange-county-ca",
    browser: true,
    cat: "portal",
    note: "OpCity (Realtor.com leads) — agent directory with contact",
  },
  {
    name: "redfin_agents_oc",
    url: "https://www.redfin.com/real-estate-agents/orange-county-ca",
    browser: true,
    cat: "portal",
    note: "Redfin OC agent directory — public profiles with phone",
  },
  {
    name: "houzeo_agents",
    url: "https://www.houzeo.com/real-estate-agents/ca/orange-county/",
    browser: true,
    cat: "portal",
    note: "Houzeo agent directory — flat-fee brokerage with agent contact",
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

    const realPhones = [...new Set([...html.matchAll(PHONE_RE)].map(m => m[0]))]
      .filter(isRealPhone);
    const realEmails = [...new Set([...html.matchAll(EMAIL_RE)].map(m => m[0]))]
      .filter(e => !CORP_EMAIL.test(e));
    const socialLinks = [...new Set([...html.matchAll(SOCIAL_RE)].map(m => m[0]))].slice(0, 6);
    const websiteLinks = [...new Set([...html.matchAll(WEBSITE_RE)].map(m => m[0].replace(/.*(?:https?:\/\/)/, "https://").slice(0, 60)))].slice(0, 4);
    const priceRefs = (html.match(/\$[\d,]{4,}/g) ?? []).length;
    const title = html.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim() ?? "(no title)";

    const verdict =
      realEmails.length >= 3 || realPhones.length >= 3 ? "✅ USABLE" :
      realEmails.length > 0 || realPhones.length > 0   ? "⚠️  PARTIAL" :
      socialLinks.length >= 3                          ? "🔗 SOCIAL LINKS" :
      websiteLinks.length >= 2                         ? "🌐 WEBSITE LINKS" :
                                                         "❌ UNUSABLE";

    console.log(`\n── [${s.cat.toUpperCase()}] ${s.name}  ${verdict}`);
    console.log(`   HTTP ${status} | ${ms}ms | ${html.length.toLocaleString()} bytes | ~${priceRefs} prices`);
    console.log(`   Title  : ${title.slice(0, 70)}`);
    console.log(`   Phones : ${realPhones.length}  → ${realPhones.slice(0, 5).join("  ") || "none"}`);
    console.log(`   Emails : ${realEmails.length}  → ${realEmails.slice(0, 4).join("  ") || "none"}`);
    if (socialLinks.length)   console.log(`   Social : ${socialLinks.slice(0, 4).join("  ")}`);
    if (websiteLinks.length)  console.log(`   Websites: ${websiteLinks.join("  ")}`);

  } catch (e) {
    console.log(`\n── [${s.cat.toUpperCase()}] ${s.name}  ❌ EXCEPTION: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
  }
}

async function main() {
  if (!KEY) { console.error("Missing ZYTE_API_KEY"); process.exit(1); }
  console.log(`Probing ${SOURCES.length} new sites — emails, phones, social links, website URLs...\n`);
  for (const s of SOURCES) {
    await probe(s);
  }
  console.log("\n═══ DONE ═══\n");
}

main().catch(console.error);
