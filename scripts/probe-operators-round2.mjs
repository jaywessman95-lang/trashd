// Round 2: Deep probe BBB pages, individual profiles, Craigslist posts, and new candidates
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
  });
}

function countEmails(html) {
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

const TARGETS = [
  // BBB pagination + more cities
  { label: "BBB – junk removal OC p2",        url: "https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=Orange+County%2C+CA&page=2" },
  { label: "BBB – junk removal OC p3",        url: "https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=Orange+County%2C+CA&page=3" },
  { label: "BBB – movers OC",                 url: "https://www.bbb.org/search?find_country=USA&find_text=moving+company&find_loc=Orange+County%2C+CA&page=1" },
  { label: "BBB – junk removal LA",           url: "https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=Los+Angeles%2C+CA&page=1" },
  { label: "BBB – movers LA",                 url: "https://www.bbb.org/search?find_country=USA&find_text=moving+company&find_loc=Los+Angeles%2C+CA&page=1" },
  { label: "BBB – junk removal nationwide p1",url: "https://www.bbb.org/search?find_country=USA&find_text=junk+removal&find_loc=United+States&page=1" },
  // Craigslist individual post (sample known post format)
  { label: "Craigslist OC – individual post 1", url: "https://orangecounty.craigslist.org/search/hss?query=junk+removal&hasPic=1" },
  { label: "Craigslist LA – movers posts",     url: "https://losangeles.craigslist.org/search/hss?query=junk+removal&hasPic=0" },
  // Hotfrog individual business page
  { label: "Hotfrog – business profile OC",    url: "https://www.hotfrog.com/company/ca/orange/junk-removal" },
  { label: "Hotfrog – movers nationwide",      url: "https://www.hotfrog.com/search/united-states/junk-removal" },
  // New candidates
  { label: "Angi – junk removal OC",           url: "https://www.angi.com/companylist/us/ca/orange-county/junk-hauling-reviewed-ratted.htm" },
  { label: "HomeAdvisor – junk removal OC",    url: "https://www.homeadvisor.com/task.Junk-Removal.17052.html?zip=92868" },
  { label: "Networx – junk removal OC",        url: "https://www.networx.com/find/california/orange/junk-removal" },
  { label: "Houzz – movers OC",               url: "https://www.houzz.com/professionals/movers/orange-county-ca" },
  { label: "Bark – junk profile sample",       url: "https://www.bark.com/en/us/junk-removal/california/orange/" },
  // Government registry (FMCSA - licensed movers)
  { label: "FMCSA – CA movers search",         url: "https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?pn_carrierschedule=A&pv_name=&pv_state=CA&pv_city=ORANGE&pv_zip=&pv_mcs150date=&pv_dotno=&pn_sorting=1&pn_startrow=1" },
  // Superpages individual pages
  { label: "Superpages – movers OC",           url: "https://www.superpages.com/search?search_terms=movers&geo_location_terms=Orange+County%2C+CA" },
  { label: "Superpages – junk removal LA",     url: "https://www.superpages.com/search?search_terms=junk+removal&geo_location_terms=Los+Angeles%2C+CA" },
];

async function probe(target) {
  try {
    const { ok, status, ms, html } = await fetchStealth(target.url);
    if (!ok || status >= 400) {
      return { label: target.label, ok: false, status, ms, emails: [], phones: [] };
    }
    const emails = countEmails(html);
    const phones = countPhones(html);
    return { label: target.label, ok: true, status, ms, emails, phones, bytes: html.length };
  } catch (e) {
    return { label: target.label, ok: false, status: 0, ms: 0, emails: [], phones: [], err: e.message };
  }
}

async function runAll() {
  const results = [];
  for (let i = 0; i < TARGETS.length; i += 4) {
    const batch = TARGETS.slice(i, i + 4);
    const batchResults = await Promise.all(batch.map(probe));
    results.push(...batchResults);
    if (i + 4 < TARGETS.length) await new Promise(r => setTimeout(r, 1200));
  }

  console.log("\n=== ROUND 2 PROBE RESULTS ===\n");
  console.log("Site".padEnd(44) + "Status  Emails  Phones  KB    ms");
  console.log("─".repeat(84));

  const sorted = [...results].sort((a, b) =>
    (b.emails.length + b.phones.length * 0.5) - (a.emails.length + a.phones.length * 0.5)
  );

  for (const r of sorted) {
    const status = r.ok ? String(r.status).padEnd(8) : `FAIL(${r.status || "err"})`.padEnd(8);
    const ec = String(r.emails?.length ?? 0).padEnd(8);
    const pc = String(r.phones?.length ?? 0).padEnd(8);
    const kb = Math.round((r.bytes ?? 0) / 1024);
    console.log(`${r.label.padEnd(44)}${status}${ec}${pc}${String(kb).padEnd(6)}${r.ms}ms`);
  }

  // Show sample emails from top sites
  const withEmails = sorted.filter(r => r.emails?.length > 0);
  if (withEmails.length) {
    console.log("\n📧 Sample emails found:");
    for (const r of withEmails.slice(0, 5)) {
      console.log(`  ${r.label}: ${r.emails.slice(0, 5).join(" | ")}`);
    }
  }
}

runAll().catch(console.error);
