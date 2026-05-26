// Round 4: Google Maps, new directories, gov DBs, individual profiles
// Uses browserHtml for JS-heavy sites, stealth httpResponseBody for static ones

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
const CORP_EMAIL_RE = /example\.|schema\.|noreply|no-reply|sentry|@2x|privacy|legal|press|abuse@|webmaster@|\.png|\.jpg|\.js$|bbb\.org|bbbinc\.org|merchantcircle|mapquest|yelp\.com|google\.com|gstatic|googleapis/i;

function getPhones(html) {
  const raw = [...html.matchAll(PHONE_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(p => {
    const d = p.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 11 && !["800","888","877","866","855","844"].includes(d.slice(-10,-7)) && !d.endsWith("0000000");
  });
}

function getEmails(html) {
  const raw = [...html.matchAll(EMAIL_RE)].map(m => m[0]);
  return [...new Set(raw)].filter(e => !CORP_EMAIL_RE.test(e) && e.includes(".") && !e.endsWith(".png") && !e.endsWith(".jpg"));
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
    if (!res.ok) return { ok: false, status: res.status, ms, html: "", mode: "stealth" };
    const data = await res.json();
    const html = data.httpResponseBody ? Buffer.from(data.httpResponseBody, "base64").toString("utf8") : "";
    return { ok: true, status: data.statusCode ?? 200, ms, html, mode: "stealth" };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, html: "", mode: "stealth", err: e.message };
  }
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
    if (!res.ok) return { ok: false, status: res.status, ms, html: "", mode: "browser" };
    const data = await res.json();
    const html = data.browserHtml ?? "";
    return { ok: true, status: data.statusCode ?? 200, ms, html, mode: "browser" };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, html: "", mode: "browser", err: e.message };
  }
}

// targets: { label, url, browser? }
const TARGETS = [
  // ── Google Maps (browser required) ──────────────────────────────
  { label: "Google Maps – junk removal OC",    url: "https://www.google.com/maps/search/junk+removal+orange+county+CA/@33.787,-117.853,12z", browser: true },
  { label: "Google Maps – movers OC",          url: "https://www.google.com/maps/search/movers+orange+county+CA/@33.787,-117.853,12z", browser: true },
  { label: "Google Maps – junk removal LA",    url: "https://www.google.com/maps/search/junk+removal+los+angeles+CA/@34.052,-118.243,11z", browser: true },

  // ── Bing Maps / Local ────────────────────────────────────────────
  { label: "Bing Local – junk removal OC",     url: "https://www.bing.com/maps?q=junk+removal&where1=Orange+County+CA", browser: true },
  { label: "Bing Local – movers OC",           url: "https://www.bing.com/maps?q=movers&where1=Orange+County+CA", browser: true },

  // ── YellowPages individual biz pages ────────────────────────────
  { label: "YP – individual: 1800 Got Junk OC", url: "https://www.yellowpages.com/orange-ca/mip/1-800-got-junk-orange-county-474823827" },
  { label: "YP – individual: college hunks OC", url: "https://www.yellowpages.com/orange-ca/mip/college-hunks-hauling-junk-477238951" },

  // ── Hotfrog individual biz profiles ─────────────────────────────
  { label: "Hotfrog – junk OC individual",     url: "https://www.hotfrog.com/business/ca/orange/junk-removal-services" },
  { label: "Hotfrog – junk CA statewide",      url: "https://www.hotfrog.com/search/california/junk-removal" },
  { label: "Hotfrog – movers CA",              url: "https://www.hotfrog.com/search/california/movers" },
  { label: "Hotfrog – junk removal TX",        url: "https://www.hotfrog.com/search/texas/junk-removal" },
  { label: "Hotfrog – junk removal FL",        url: "https://www.hotfrog.com/search/florida/junk-removal" },
  { label: "Hotfrog – junk removal NY",        url: "https://www.hotfrog.com/search/new-york/junk-removal" },

  // ── Government / Public databases ───────────────────────────────
  { label: "CSLB CA – junk hauling license",   url: "https://www2.cslb.ca.gov/CSLB_LIBRARY/Find+a+Contractor.htm" },
  { label: "FMCSA SAFER – CA movers",          url: "https://safer.fmcsa.dot.gov/keywordx.asp?searchstring=*&SEARCHTYPE=&pv_adr_state=CA&pv_zip=92868" },
  { label: "CA SOS – biz search movers",       url: "https://bizfileonline.sos.ca.gov/api/Records/businesssearch?businessName=junk+removal&businessType=&status=ACTIVE&state=CA" },

  // ── Moving-specific directories ──────────────────────────────────
  { label: "Moving.com – OC movers",           url: "https://www.moving.com/movers/ca/orange/" },
  { label: "iMoving – OC movers",              url: "https://imoving.com/movers/california/orange-county/" },
  { label: "HireAHelper – OC",                 url: "https://www.hireahelper.com/moving-companies/orange-ca/" },
  { label: "MoverJunction – OC",               url: "https://www.moverjunction.com/local-movers/california/orange-county-movers" },
  { label: "uShip – junk removal OC",          url: "https://www.uship.com/vehicle/junk-removal/?sourceZip=92868" },
  { label: "Vanlines – OC movers",             url: "https://www.vanlines.com/movers/california/orange/" },
  { label: "MoveAdvisor – OC",                 url: "https://moveadvisor.com/movers/orange-county-ca/" },

  // ── More business directories ────────────────────────────────────
  { label: "DexKnows – junk removal OC",       url: "https://www.dexknows.com/search?q=junk+removal&l=orange+county%2C+ca" },
  { label: "Spoke – junk removal CA",          url: "https://www.spoke.com/categories/janitorial-services-and-supplies/california" },
  { label: "Foursquare – junk removal OC",     url: "https://foursquare.com/v/search?near=Orange%2C+CA&query=junk+removal", browser: true },
  { label: "TripAdvisor biz – movers OC",      url: "https://www.tripadvisor.com/LocalMaps-g32578-Orange_County_California-ct-transportation.html" },
  { label: "Cylex – junk removal OC",          url: "https://www.cylex.us.com/orange-ca/junk-removal.html" },
  { label: "n49 – junk removal CA",            url: "https://www.n49.com/search/junk-removal/CA/" },
  { label: "Showmelocal – junk OC",            url: "https://www.showmelocal.com/search.aspx?q=Junk+Removal&city=Orange&state=CA" },
  { label: "Opendi – junk removal OC",         url: "https://www.opendi.us/orange-ca/cat/junk-removal.html" },
  { label: "Whitepages Biz – junk OC",         url: "https://www.whitepages.com/business/junk-removal-service/orange-ca" },
  { label: "Chamberofcommerce – junk OC",      url: "https://www.chamberofcommerce.com/united-states/california/orange/junk-removal" },
];

async function probe(t) {
  const fetch = t.browser ? fetchBrowser : fetchStealth;
  const result = await fetch(t.url);
  const emails = getEmails(result.html);
  const phones = getPhones(result.html);
  return { label: t.label, ...result, emails, phones };
}

async function runAll() {
  const results = [];
  // Run in batches of 3 (browser calls are slow/expensive)
  for (let i = 0; i < TARGETS.length; i += 3) {
    const batch = TARGETS.slice(i, i + 3);
    process.stdout.write(`  [${i+1}-${Math.min(i+3,TARGETS.length)}/${TARGETS.length}] ${batch.map(t=>t.label.split(" – ")[0]).join(", ")}...\n`);
    const batchResults = await Promise.all(batch.map(probe));
    results.push(...batchResults);
    if (i + 3 < TARGETS.length) await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("  ROUND 4 PROBE RESULTS  (sorted by email+phone yield)");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");
  console.log("Site".padEnd(44) + "Mode     Status  Emails  Phones  KB    ms");
  console.log("─".repeat(90));

  const sorted = [...results].sort((a, b) =>
    (b.emails.length * 3 + b.phones.length) - (a.emails.length * 3 + a.phones.length)
  );

  for (const r of sorted) {
    const mode = (r.mode ?? "stealth").padEnd(9);
    const status = r.ok ? String(r.status).padEnd(8) : `FAIL(${r.status||"err"})`.padEnd(8);
    const ec = String(r.emails?.length ?? 0).padEnd(8);
    const pc = String(r.phones?.length ?? 0).padEnd(8);
    const kb = Math.round((r.html?.length ?? 0) / 1024);
    console.log(`${r.label.padEnd(44)}${mode}${status}${ec}${pc}${String(kb).padEnd(6)}${r.ms}ms`);
  }

  const winners = sorted.filter(r => r.ok && (r.emails.length > 0 || r.phones.length > 5));
  console.log(`\n✅ Top sources (${winners.length}):`);
  for (const r of winners) {
    const tag = r.emails.length > 0 ? `📧 ${r.emails.length} emails` : "";
    const ptag = r.phones.length > 0 ? `📞 ${r.phones.length} phones` : "";
    console.log(`  ${r.label.padEnd(44)} ${tag} ${ptag}`);
  }

  const withEmails = sorted.filter(r => r.emails?.length > 0);
  if (withEmails.length) {
    console.log("\n📧 Business emails sample:");
    for (const r of withEmails.slice(0, 8)) {
      console.log(`  ${r.label}: ${r.emails.slice(0, 5).join(" | ")}`);
    }
  }

  const withPhones = sorted.filter(r => r.phones?.length > 5);
  if (withPhones.length) {
    console.log("\n📞 Phone samples:");
    for (const r of withPhones.slice(0, 5)) {
      console.log(`  ${r.label}: ${r.phones.slice(0, 4).join(" | ")}`);
    }
  }
}

runAll().catch(console.error);
