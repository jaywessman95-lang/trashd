// Email-only probe: finds sources that expose actual business emails for movers/junk removers
// Strategy: individual profiles + association dirs + Google dorks + email-first directories

const ZYTE_API_KEY = "12b8e1a31f6f41f6adf66c4173750a70";
const ENDPOINT = "https://api.zyte.com/v1/extract";

const STEALTH_HEADERS = [
  { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
  { name: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" },
  { name: "Accept-Language", value: "en-US,en;q=0.9" },
  { name: "Referer", value: "https://www.google.com/search?q=junk+removal+orange+county+ca+email+contact" },
  { name: "sec-ch-ua", value: '"Google Chrome";v="125","Chromium";v="125","Not.A/Brand";v="24"' },
  { name: "sec-ch-ua-mobile", value: "?0" },
  { name: "sec-ch-ua-platform", value: '"Windows"' },
  { name: "Sec-Fetch-Dest", value: "document" },
  { name: "Sec-Fetch-Mode", value: "navigate" },
  { name: "Sec-Fetch-Site", value: "cross-site" },
  { name: "Upgrade-Insecure-Requests", value: "1" },
];

const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|sentry|@2x|privacy|legal|press|abuse@|webmaster@|\.png|\.jpg|\.js$|bbb\.org|bbbinc\.org|merchantcircle|mapquest|yelp\.com|google\.com|gstatic|googleapis|w3\.org|schema\.org|openstreetmap|cloudflare|sentry\.io|wix\.com|squarespace|godaddy|wordpress\.com|amazonaws|interactiveblue|parse\.hurdman/i;

function getPhones(html) {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 11 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7)) && !d.endsWith("0000000");
  });
}

function getEmails(html) {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(e =>
    !CORP_EMAIL_RE.test(e) &&
    e.includes(".") &&
    !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif") && !e.endsWith(".svg") &&
    e.split("@")[1]?.includes(".") &&
    e.length < 80
  );
}

async function fetchStealth(url) {
  const auth = Buffer.from(`${ZYTE_API_KEY}:`).toString("base64");
  const t0 = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, httpResponseBody: true, customHttpRequestHeaders: STEALTH_HEADERS }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { ok: false, status: res.status, ms, html: "" };
    const data = await res.json();
    const html = data.httpResponseBody ? Buffer.from(data.httpResponseBody, "base64").toString("utf8") : "";
    return { ok: true, status: data.statusCode ?? 200, ms, html };
  } catch (e) { return { ok: false, status: 0, ms: 0, html: "", err: e.message }; }
}

async function fetchBrowser(url) {
  const auth = Buffer.from(`${ZYTE_API_KEY}:`).toString("base64");
  const t0 = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, browserHtml: true }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { ok: false, status: res.status, ms, html: "" };
    const data = await res.json();
    return { ok: true, status: data.statusCode ?? 200, ms, html: data.browserHtml ?? "" };
  } catch (e) { return { ok: false, status: 0, ms: 0, html: "", err: e.message }; }
}

// --- Step 1: Extract real profile URLs from confirmed sites ---
async function getProfileUrls() {
  const profiles = [];

  // Hotfrog: extract individual biz URLs from search page
  console.log("  Extracting Hotfrog profile URLs...");
  const hf = await fetchStealth("https://www.hotfrog.com/search/orange%2Cca/junk-removal");
  const hfUrls = [...hf.html.matchAll(/href="(\/business\/ca\/[^"]+)"/g)]
    .map(m => "https://www.hotfrog.com" + m[1]).filter(u => !u.includes("/search"))
    .slice(0, 5);
  hfUrls.forEach(u => profiles.push({ label: "Hotfrog profile", url: u }));
  console.log(`    → ${hfUrls.length} Hotfrog profiles`);

  // Manta: extract individual biz URLs from search page
  console.log("  Extracting Manta profile URLs...");
  const mn = await fetchStealth("https://www.manta.com/c/mr42c2c/junk-removal?search=junk+removal&location=Orange+County%2C+CA");
  const mnUrls = [...mn.html.matchAll(/href="(\/c\/[^"?#]+)"/g)]
    .map(m => "https://www.manta.com" + m[1]).filter((u, i, a) => a.indexOf(u) === i && u.split("/").length >= 4)
    .slice(0, 5);
  mnUrls.forEach(u => profiles.push({ label: "Manta profile", url: u }));
  console.log(`    → ${mnUrls.length} Manta profiles`);

  // YellowPages: extract individual biz profile URLs
  console.log("  Extracting YellowPages profile URLs...");
  const yp = await fetchStealth("https://www.yellowpages.com/orange-ca/junk-removal-service");
  const ypUrls = [...yp.html.matchAll(/href="(\/[^"]+\/mip\/[^"?#]+)"/g)]
    .map(m => "https://www.yellowpages.com" + m[1]).filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, 5);
  ypUrls.forEach(u => profiles.push({ label: "YellowPages profile", url: u }));
  console.log(`    → ${ypUrls.length} YellowPages profiles`);

  // Superpages: extract individual biz URLs
  console.log("  Extracting Superpages profile URLs...");
  const sp = await fetchStealth("https://www.superpages.com/search?search_terms=junk+removal&geo_location_terms=Orange+County%2C+CA");
  const spUrls = [...sp.html.matchAll(/href="(\/bp\/[^"?#]+)"/g)]
    .map(m => "https://www.superpages.com" + m[1]).filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, 5);
  spUrls.forEach(u => profiles.push({ label: "Superpages profile", url: u }));
  console.log(`    → ${spUrls.length} Superpages profiles`);

  return profiles;
}

// --- Step 2: Static targets (email-first directories & association sites) ---
const STATIC_TARGETS = [
  // Moving & junk industry associations
  { label: "AMSA – find a mover",                url: "https://www.moving.org/find-a-mover/", browser: false },
  { label: "CMASA – CA movers",                  url: "https://www.cmasa.com/find-a-mover", browser: false },
  { label: "CAM – CA moving assoc",              url: "https://www.camover.org/find-a-mover", browser: false },

  // Google search dorks — email patterns
  { label: "Google dork – junk removal OC email",url: 'https://www.google.com/search?q=%22junk+removal%22+%22orange+county%22+%22%40gmail.com%22+OR+%22%40yahoo.com%22&num=20', browser: true },
  { label: "Google dork – movers OC email",      url: 'https://www.google.com/search?q=%22movers%22+%22orange+county+ca%22+%22email%22+%22%40%22&num=20', browser: true },
  { label: "Google dork – junk removal CA email",url: 'https://www.google.com/search?q=junk+removal+%22orange+county%22+site%3Ahotfrog.com+OR+site%3Amanta.com&num=20', browser: true },

  // Bark.com individual contractor profiles (deeper scrape)
  { label: "Bark – junk removal profile deep",   url: "https://www.bark.com/en/us/junk-removal/california/orange-county/", browser: false },
  { label: "Bark – movers OC",                   url: "https://www.bark.com/en/us/moving-companies/california/orange-county/", browser: false },
  { label: "Bark – junk removal LA",             url: "https://www.bark.com/en/us/junk-removal/california/los-angeles/", browser: false },

  // Thumbtack individual contractor pages
  { label: "Thumbtack – junk removal profile",   url: "https://www.thumbtack.com/ca/orange/junk-removal/", browser: true },
  { label: "Thumbtack – movers OC",              url: "https://www.thumbtack.com/ca/orange/movers/", browser: true },

  // Alignable — small biz social, often has emails
  { label: "Alignable – junk removal OC",        url: "https://www.alignable.com/orange-ca/junk-removal", browser: false },
  { label: "Alignable – movers OC",              url: "https://www.alignable.com/orange-ca/moving-companies", browser: false },

  // Clutch.co — B2B directory, emails on profiles
  { label: "Clutch – movers/junk OC",            url: "https://clutch.co/logistics/movers?client_focus=small_business&location_geocode=ChIJE9on3F3HwoAR9AhGJW_fL-I", browser: false },

  // Porch.com — correct URL patterns
  { label: "Porch – junk removal OC v2",         url: "https://porch.com/orange-ca/junk-removal-services/pp", browser: false },
  { label: "Porch – movers OC v2",               url: "https://porch.com/orange-ca/local-moving-services/pp", browser: false },

  // Houzz pros — correct URL
  { label: "Houzz – junk removal pros OC",       url: "https://www.houzz.com/professionals/junk-removal/orange-county-ca-probr0-bo~t_11793__nc__cp_", browser: false },

  // PRWeb / press releases — businesses include email in releases
  { label: "PRWeb – junk removal OC",            url: "https://www.prweb.com/releases/search?q=junk+removal+orange+county", browser: false },

  // Businesslist.us — has emails for small businesses
  { label: "BusinessList – junk removal OC",     url: "https://www.businesslist.us/category/junk-removal/ca/orange-county", browser: false },
  { label: "BusinessList – movers OC",           url: "https://www.businesslist.us/category/moving-companies/ca/orange-county", browser: false },

  // iBegin — business directory with emails
  { label: "iBegin – junk removal OC",           url: "https://ibegin.com/orangecounty-ca/junk-removal/", browser: false },

  // Yalwa — global biz directory, shows emails
  { label: "Yalwa – junk removal CA",            url: "https://www.yalwa.com/cat/Junk-Removal/s/Orange-County/California", browser: false },

  // Infobel — business directory, emails
  { label: "Infobel – junk removal OC",          url: "https://www.infobel.com/en/united_states/orange/orange_county/moving+companies", browser: false },

  // n49 — confirmed 200 but no emails before; try movers
  { label: "n49 – movers OC",                    url: "https://www.n49.com/biz/search/?q=movers&l=orange+county%2C+CA", browser: false },

  // GetFave — business directory
  { label: "GetFave – junk removal OC",          url: "https://www.getfave.com/search?q=junk+removal&location=orange%2C+ca", browser: false },

  // Cylex — had 520 before; try different URL
  { label: "Cylex – movers CA",                  url: "https://www.cylex.us.com/california/movers.html", browser: false },

  // WhoDoYou — local recommendations
  { label: "WhoDoYou – junk removal OC",         url: "https://www.whoyoudo.com/orange-ca/junk-removal/", browser: false },

  // NextDoor business posts
  { label: "Nextdoor biz – junk removal",        url: "https://nextdoor.com/pages/home-services/junk-removal/orange-ca/", browser: true },

  // Bid4Movers — moving quote site, has carrier contacts
  { label: "Bid4Movers – CA",                    url: "https://www.bid4movers.com/moving-companies/california/", browser: false },

  // Move Buddha directory
  { label: "MoveBuddha – OC movers",             url: "https://www.movebuddha.com/movers/orange-county-ca/", browser: false },

  // ChamberOfCommerce.com
  { label: "ChamberOfCommerce – movers OC",      url: "https://www.chamberofcommerce.com/united-states/california/orange/moving-companies", browser: false },

  // 411.com business
  { label: "411 – junk removal OC",              url: "https://www.411.com/business/junk-removal/orange-county--ca", browser: false },

  // EZlocal deeper — movers with email
  { label: "EZlocal – junk removal LA",          url: "https://www.ezlocal.com/ca/los-angeles/junk-removal", browser: false },
  { label: "EZlocal – movers LA",                url: "https://www.ezlocal.com/ca/los-angeles/movers", browser: false },
];

async function probe(t) {
  const fetcher = t.browser ? fetchBrowser : fetchStealth;
  const result = await fetcher(t.url);
  const emails = getEmails(result.html);
  const phones = getPhones(result.html);
  return { label: t.label, browser: !!t.browser, ...result, emails, phones };
}

async function runAll() {
  console.log("\n🔍 Extracting individual profile URLs from confirmed sites...");
  const profileTargets = await getProfileUrls();

  const allTargets = [...profileTargets, ...STATIC_TARGETS];
  console.log(`\n🚀 Probing ${allTargets.length} targets...\n`);

  const results = [];
  for (let i = 0; i < allTargets.length; i += 4) {
    const batch = allTargets.slice(i, i + 4);
    process.stdout.write(`  [${i+1}/${allTargets.length}] ${batch.map(t => t.label.split(" – ")[0]).join(", ")}...\n`);
    const br = await Promise.all(batch.map(probe));
    results.push(...br);
    if (i + 4 < allTargets.length) await new Promise(r => setTimeout(r, 1200));
  }

  console.log("\n\n═══════════════════════════════════════════════════════════════════════════════════");
  console.log("  EMAIL-FOCUSED PROBE RESULTS  (sorted: emails first, then phones)");
  console.log("═══════════════════════════════════════════════════════════════════════════════════\n");
  console.log("Site".padEnd(46) + "Mode     Status  Emails  Phones  KB");
  console.log("─".repeat(84));

  const sorted = [...results].sort((a, b) =>
    (b.emails.length * 5 + b.phones.length) - (a.emails.length * 5 + a.phones.length)
  );

  for (const r of sorted) {
    const mode = (r.browser ? "browser" : "stealth").padEnd(9);
    const status = r.ok ? String(r.status).padEnd(8) : `FAIL(${r.status||"err"})`.padEnd(8);
    const ec = String(r.emails?.length ?? 0).padEnd(8);
    const pc = String(r.phones?.length ?? 0).padEnd(8);
    const kb = Math.round((r.html?.length ?? 0) / 1024);
    const star = r.emails?.length > 2 ? " ⭐" : r.emails?.length > 0 ? " ✓" : "";
    console.log(`${(r.label + star).padEnd(48)}${mode}${status}${ec}${pc}${kb}KB`);
  }

  // Email winners
  const emailWinners = sorted.filter(r => r.emails?.length > 0);
  console.log(`\n📧 SITES WITH EMAILS (${emailWinners.length} total):`);
  for (const r of emailWinners) {
    console.log(`\n  ✉  ${r.label} → ${r.emails.length} emails, ${r.phones.length} phones`);
    console.log(`     Emails: ${r.emails.slice(0, 8).join(" | ")}`);
    if (r.phones.length) console.log(`     Phones: ${r.phones.slice(0, 4).join(" | ")}`);
  }

  if (emailWinners.length === 0) {
    console.log("  (none found — all emails were site/platform addresses)");
  }
}

runAll().catch(console.error);
