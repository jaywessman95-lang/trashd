// Probe mover/junk-remover directories for email+phone contact yield
// Run: node scripts/probe-operator-sites.mjs

const ZYTE_API_KEY = "12b8e1a31f6f41f6adf66c4173750a70";
const ENDPOINT = "https://api.zyte.com/v1/extract";

const STEALTH_HEADERS = [
  { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
  { name: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" },
  { name: "Accept-Language", value: "en-US,en;q=0.9" },
  { name: "Referer", value: "https://www.google.com/search?q=junk+removal+orange+county" },
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
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|sentry|@2x|privacy|legal|press|abuse@|webmaster@|\.png|\.jpg|\.js$/i;

function countPhones(html) {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7));
  }).length;
}

function countEmails(html) {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(e => !CORP_EMAIL_RE.test(e)).length;
}

async function fetchStealth(url) {
  const auth = Buffer.from(`${ZYTE_API_KEY}:`).toString("base64");
  const t0 = Date.now();
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
}

const TARGETS = [
  // --- OC/LA specific ---
  { label: "YellowPages – junk removal OC",         url: "https://www.yellowpages.com/orange-ca/junk-removal-service" },
  { label: "YellowPages – movers OC",               url: "https://www.yellowpages.com/orange-ca/movers" },
  { label: "YellowPages – junk removal LA",         url: "https://www.yellowpages.com/los-angeles-ca/junk-removal-service" },
  { label: "Manta – junk removal OC",               url: "https://www.manta.com/c/mr42c2c/junk-removal?search=junk+removal&location=Orange+County%2C+CA" },
  { label: "Manta – movers OC",                     url: "https://www.manta.com/c/mq0xxmt/moving-companies?search=movers&location=Orange+County%2C+CA" },
  { label: "EZlocal – junk removal OC",             url: "https://www.ezlocal.com/ca/orange/junk-removal" },
  { label: "EZlocal – movers OC",                   url: "https://www.ezlocal.com/ca/orange/movers" },
  { label: "Hotfrog – junk removal OC",             url: "https://www.hotfrog.com/search/orange%2Cca/junk-removal" },
  { label: "Hotfrog – movers OC",                   url: "https://www.hotfrog.com/search/orange%2Cca/movers" },
  { label: "Brownbook – junk removal OC",           url: "https://us.brownbook.net/search/?q=junk+removal&l=orange+county+CA" },
  { label: "Brownbook – movers OC",                 url: "https://us.brownbook.net/search/?q=movers&l=orange+county+CA" },
  { label: "BBB – junk removal OC",                 url: "https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=Orange+County%2C+CA&page=1" },
  { label: "Craigslist OC – labor/moving",          url: "https://orangecounty.craigslist.org/search/lbs?query=junk+removal" },
  { label: "Craigslist OC – hauling",               url: "https://orangecounty.craigslist.org/search/hss?query=junk+hauling" },
  { label: "Craigslist LA – junk removal",          url: "https://losangeles.craigslist.org/search/lbs?query=junk+removal" },
  // --- Nationwide scale ---
  { label: "Yelp – junk removal OC",                url: "https://www.yelp.com/search?find_desc=junk+removal&find_loc=Orange+County%2C+CA" },
  { label: "Yelp – movers OC",                      url: "https://www.yelp.com/search?find_desc=movers&find_loc=Orange+County%2C+CA" },
  { label: "Superpages – junk removal OC",          url: "https://www.superpages.com/search?search_terms=junk+removal&geo_location_terms=Orange+County%2C+CA" },
  { label: "MoversCorp – OC",                       url: "https://www.moverscorp.com/movers/orange-county-ca/" },
  { label: "MovingCompanyReviews – OC",             url: "https://www.movingcompanyreviews.com/california/orange-county/" },
  { label: "Porch – junk removal OC",               url: "https://porch.com/find/california/orange-county/junk-removal" },
  { label: "Bark – junk removal OC",                url: "https://www.bark.com/en/us/junk-removal/california/orange-county/" },
  { label: "Thumbtack – junk removal OC",           url: "https://www.thumbtack.com/ca/orange/junk-removal/" },
];

async function probe(target) {
  try {
    const { ok, status, ms, html } = await fetchStealth(target.url);
    if (!ok || status >= 400) {
      return { label: target.label, ok: false, status, ms, emails: 0, phones: 0, bytes: 0 };
    }
    const emails = countEmails(html);
    const phones = countPhones(html);
    return { label: target.label, ok: true, status, ms, emails, phones, bytes: html.length };
  } catch (e) {
    return { label: target.label, ok: false, status: 0, ms: 0, emails: 0, phones: 0, bytes: 0, err: e.message };
  }
}

// Run in batches of 4 to avoid rate-limiting
async function runAll() {
  const results = [];
  for (let i = 0; i < TARGETS.length; i += 4) {
    const batch = TARGETS.slice(i, i + 4);
    const batchResults = await Promise.all(batch.map(probe));
    results.push(...batchResults);
    if (i + 4 < TARGETS.length) await new Promise(r => setTimeout(r, 1200));
  }

  console.log("\n=== MOVER / JUNK REMOVER SITE PROBE RESULTS ===\n");
  console.log("Site".padEnd(42) + "Status  Emails  Phones  KB    ms");
  console.log("─".repeat(82));

  const sorted = [...results].sort((a, b) => (b.emails + b.phones * 0.5) - (a.emails + a.phones * 0.5));
  for (const r of sorted) {
    const status = r.ok ? String(r.status).padEnd(8) : `FAIL(${r.status || "err"})`.padEnd(8);
    const emails = String(r.emails).padEnd(8);
    const phones = String(r.phones).padEnd(8);
    const kb = Math.round(r.bytes / 1024);
    console.log(`${r.label.padEnd(42)}${status}${emails}${phones}${String(kb).padEnd(6)}${r.ms}ms`);
  }

  const winners = sorted.filter(r => r.ok && (r.emails > 0 || r.phones > 3));
  console.log(`\n✅ Winners (${winners.length} sites with contacts):`);
  for (const r of winners) {
    console.log(`  ${r.label} → ${r.emails} emails, ${r.phones} phones`);
  }
}

runAll().catch(console.error);
