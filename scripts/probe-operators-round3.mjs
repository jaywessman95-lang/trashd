// Round 3: BBB individual profiles, Craigslist posts, new high-email candidates
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
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|sentry|@2x|privacy|legal|press|abuse@|webmaster@|\.png|\.jpg|\.js$|bbb\.org|bbbinc\.org/i;

function getPhones(html) {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7));
  });
}

function getEmails(html) {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(e => !CORP_EMAIL_RE.test(e));
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

// First, extract real BBB business URLs from search results
async function getBBBBusinessUrls() {
  console.log("Fetching BBB search to extract individual profile URLs...");
  const { html } = await fetchStealth("https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=Orange+County%2C+CA&page=1");
  const urlMatches = [...html.matchAll(/href="(\/us\/ca\/[^"]+\/profile\/[^"]+)"/g)].map(m => "https://www.bbb.org" + m[1]);
  const unique = [...new Set(urlMatches)].slice(0, 3);
  console.log(`Found ${unique.length} BBB profile URLs:`, unique);
  return unique;
}

// Extract Craigslist post URLs from search
async function getCraigslistPostUrls() {
  console.log("Fetching Craigslist search to extract post URLs...");
  const { html } = await fetchStealth("https://orangecounty.craigslist.org/search/hss?query=junk+removal");
  const urlMatches = [...html.matchAll(/href="(https:\/\/orangecounty\.craigslist\.org\/hss\/d\/[^"]+)"/g)].map(m => m[1]);
  const unique = [...new Set(urlMatches)].slice(0, 3);
  console.log(`Found ${unique.length} Craigslist post URLs:`, unique);
  return unique;
}

const STATIC_TARGETS = [
  // Expertise.com — ranks local pros, often has biz email
  { label: "Expertise – junk removal OC",      url: "https://www.expertise.com/ca/orange/junk-removal" },
  { label: "Expertise – movers OC",            url: "https://www.expertise.com/ca/orange/moving-companies" },
  { label: "Expertise – junk removal LA",      url: "https://www.expertise.com/ca/los-angeles/junk-removal" },
  // Merchant Circle — local biz dir, frequently has emails
  { label: "MerchantCircle – junk removal OC", url: "https://www.merchantcircle.com/search?q=junk+removal&l=Orange%2C+CA&c=junk+removal" },
  { label: "MerchantCircle – movers OC",       url: "https://www.merchantcircle.com/search?q=movers&l=Orange%2C+CA&c=movers" },
  // iGlobal / USdirectory
  { label: "USDirectory – junk removal CA",    url: "https://www.usdirectory.com/search/?q=junk+removal&l=orange+county+ca" },
  // FMCSA SAFER — federal mover registry
  { label: "FMCSA SAFER – CA carriers",        url: "https://safer.fmcsa.dot.gov/keywordx.asp?searchstring=junk+removal&SEARCHTYPE=" },
  // Kompass business directory — known for emails
  { label: "Kompass – junk removal US",        url: "https://us.kompass.com/searchCompany?ks=junk+removal&kl=Orange%2C+CA" },
  // Local.com
  { label: "Local.com – junk removal OC",      url: "https://www.local.com/business/results/?keyword=junk+removal&location=orange%2C+ca" },
  // Citysearch
  { label: "Citysearch – junk removal OC",     url: "http://www.citysearch.com/search?what=junk+removal&where=Orange%2C+CA" },
  // Chamber directories
  { label: "OC Chamber – movers",              url: "https://www.orangechamber.com/business-directory/?category=Moving+%26+Storage" },
  // Mapquest
  { label: "MapQuest – junk removal OC",       url: "https://www.mapquest.com/search/results?query=junk+removal&location=Orange+County%2C+CA" },
];

async function probe(target) {
  try {
    const { ok, status, ms, html } = await fetchStealth(target.url);
    if (!ok || status >= 400) return { label: target.label, ok: false, status, ms, emails: [], phones: [] };
    const emails = getEmails(html);
    const phones = getPhones(html);
    return { label: target.label, ok: true, status, ms, emails, phones, bytes: html.length };
  } catch (e) {
    return { label: target.label, ok: false, status: 0, ms: 0, emails: [], phones: [], err: e.message };
  }
}

async function runAll() {
  // Get dynamic URLs first
  const [bbbUrls, clUrls] = await Promise.all([getBBBBusinessUrls(), getCraigslistPostUrls()]);

  const dynamicTargets = [
    ...bbbUrls.map((url, i) => ({ label: `BBB – individual profile ${i+1}`, url })),
    ...clUrls.map((url, i) => ({ label: `Craigslist – individual post ${i+1}`, url })),
  ];

  const allTargets = [...dynamicTargets, ...STATIC_TARGETS];

  const results = [];
  for (let i = 0; i < allTargets.length; i += 4) {
    const batch = allTargets.slice(i, i + 4);
    const batchResults = await Promise.all(batch.map(probe));
    results.push(...batchResults);
    if (i + 4 < allTargets.length) await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n=== ROUND 3 PROBE RESULTS ===\n");
  console.log("Site".padEnd(44) + "Status  Emails  Phones  KB    ms");
  console.log("─".repeat(84));

  const sorted = [...results].sort((a, b) =>
    (b.emails.length * 2 + b.phones.length * 0.5) - (a.emails.length * 2 + a.phones.length * 0.5)
  );

  for (const r of sorted) {
    const status = r.ok ? String(r.status).padEnd(8) : `FAIL(${r.status||"err"})`.padEnd(8);
    const ec = String(r.emails?.length ?? 0).padEnd(8);
    const pc = String(r.phones?.length ?? 0).padEnd(8);
    const kb = Math.round((r.bytes ?? 0) / 1024);
    console.log(`${r.label.padEnd(44)}${status}${ec}${pc}${String(kb).padEnd(6)}${r.ms}ms`);
  }

  const withEmails = sorted.filter(r => r.emails?.length > 0);
  if (withEmails.length) {
    console.log("\n📧 Actual business emails found:");
    for (const r of withEmails) {
      console.log(`  ${r.label} (${r.emails.length}): ${r.emails.slice(0, 6).join(" | ")}`);
    }
  }
}

runAll().catch(console.error);
