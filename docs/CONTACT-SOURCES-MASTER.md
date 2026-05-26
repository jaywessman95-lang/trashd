# Contact Sources Master List
Last updated: 2026-05-22 — compiled from 5 probe batches, ~160 Zyte calls, ~100 sites tested.

---

## ✅ CONFIRMED USABLE — Real OC Phones and/or Emails

| # | Site | Working URL | Phones | Emails | Method | Notes |
|---|---|---|---|---|---|---|
| 1 | **fastexpert.com** | `/top-real-estate-agents/orange-county-ca/` | 134 | 89 | Browser | Best overall. Direct agent emails + 949/714 phones. Paginated. |
| 2 | **coldwellbankerhomes.com** | `/ca/orange-county/agents/` | 57 | 25 | Browser | CB Realty CA agent dir. `@camoves.com` + `@cbrealty.com` emails. |
| 3 | **coldwellbankerhomes.com** | `/ca/orange-county/agents/?page=2` | 53 | 25 | Browser | Page 2 confirmed. Multiple pages available. |
| 4 | **sevengables.com** | `/agents/` | 33 | 32 | Browser | OC-only boutique brokerage. Real direct emails + 714/949 phones. |
| 5 | **homefinder.com** | `/CA/Irvine/recently-sold` | 7 | 44 | Browser | CRMLS-connected. Agent emails from active MLS listings. |
| 6 | **firstteam.com** | `/agents/` | 5 | 4 | Browser | Biggest OC indie brokerage (945KB page). `@firstteam.com` emails. |
| 7 | **yellowpages.com** | `/orange-ca/real-estate-agents` | 34 | 0 | Browser | Real 714/949 area codes. 30 per page. No emails. |
| 8 | **yellowpages.com** | `/irvine-ca/real-estate-agents` | 33 | 0 | Browser | Real 949/657 area codes. Same format. |
| 9 | **ezlocal.com** | `/ca/orange/real-estate-agents` | 8 | 0 | Browser | All 714/949. Small but clean. |

---

## 📅 VOLUME + SOLD DATES — No Contact (Use for Address/Date Pipeline)

| # | Site | Working URL | Transactions | Sold Date Format | Notes |
|---|---|---|---|---|---|
| 1 | **zillow.com** | `/orange-county-ca/sold/` | **70,926 OC** | `Sold 05/22/26` in HTML | Sub-1s HTTP fetch. `__NEXT_DATA__` JSON. Best volume. |
| 2 | **zillow.com** | `/irvine-ca/sold/` | 7,303 Irvine | `Sold 05/22/26` | City-level. Same structure. |
| 3 | **redfin.com** | `/zipcode/92620/recently-sold` | 73+ per zip | `SOLD APR 29, 2026` on cards | Agent name in JSON. Browser required. |
| 4 | **redfin.com** | `/zipcode/{ZIP}/recently-sold` | Varies by zip | `SOLD MMM DD, YYYY` | Any OC zip works. |

---

## 🔗 SOCIAL MEDIA LINKS — Indirect Path to Contact

These sites expose agent social profiles (Facebook pages, Instagram, LinkedIn). Each profile typically has phone in bio or about section.

| Site | What It Exposes | Social Profiles Found |
|---|---|---|
| **firstteam.com** | FB + IG + LI + Twitter for the brokerage | `facebook.com/FirstTeamRealEstate`, `instagram.com/firstteam/`, `linkedin.com/company/first-team-real-estate/` |
| **coldwellbankerhomes.com** | CB Realty CA social accounts | `facebook.com/CBRealtyCal/`, `instagram.com/cbrealtycal/`, `twitter.com/CBRealtyCal` |
| **sevengables.com** | Agent-level social links in profiles | Individual agent FB/IG links per profile |
| **fastexpert.com** | Agent profile pages link to personal websites | Each agent card has a profile URL |
| **pacific_sothebys** | Brokerage social | `facebook.com/pacificsothebysrealty`, `instagram.com/pacificsothebysrealty/` |
| **realty_one_group** | Brokerage social | `instagram.com/realtyonegroup/`, `facebook.com/RealtyONEGroup/` |

---

## ❌ UNUSABLE — Confirmed Dead Ends (do not attempt again)

### Banned by Zyte (520 / 451)
- `realtor.com` — all URLs permanently banned
- `homes.com` — banned
- `linkedin.com` — domain forbidden (451)
- `yelp.com` — banned on list pages
- `bhhscalifornia.com` — banned

### Wrong Geography (returns non-OC results)
- `bbb.org` — returns LA/Ventura/Chicago area results regardless of OC query
- `manta.com` — redirected to Pennsylvania gift shops
- `mapquest.com` — returned Kansas listings
- `kw.com` / `kwoc.com` — kwoc.com is a Missouri radio station

### 404 / Bad URLs
- `redfin.com/county/*` — all county ID URLs 404 or redirect wrong state
- `redfin.com/CA/Irvine/92618/recently-sold` — 404
- `compass.com/listing/*/closed/` — 404
- `point2homes.com` — 404
- `homefinder.com/CA/Orange-County/recently-sold` — timeout (use city-level instead)
- `forsalebyowner.com`, `fizber.com`, `fsbo.com` — 404 or 0 contacts
- `johnhart.com/agent-directory/` — 404
- `bark.com` — 404
- `thumbtack.com` — 404
- `homeadvisor.com/task.Real-Estate-Agent.html` — 404
- `regency.realestatecareers.com` — domain unreachable
- `anvil.homes` — timeout
- `tngre.com` — 404
- `us_probate_leads` — IIS error
- `superpages.com` — 404
- `whitepages.com` — timeout
- `listingbook.com` — 500
- `estately.com` — 260 listings but dates/contact both missing
- `propertyshark.com` — 404
- `xome.com` — 404
- `realtytrac.com` — 98 CSS-obfuscated phones, no real data
- `har.com` — obfuscated phones, corporate email only
- `trulia.com` — 0 contacts
- `movoto.com` — corporate numbers only
- `homesnap.com` — error page
- `windermere.com` — 404 for sold
- `zillow.com/agent-finder/` — 410 Gone (discontinued)
- `century21.com/real-estate/orange-county_ca/agents/` — 404
- `coldwellbanker.com/real-estate-agents/CA/orange-county` — 500 (use coldwellbankerhomes.com instead)
- `pacificsothebysrealty.com/our-agents/` — 202 challenge
- `houzeo.com` — 404
- `remax.com/real-estate-agents/orange-county-ca` — CSS-obfuscated
- `fastexpert.com/top-real-estate-agents/orange-county-ca/` ← correct (OC)

### CSS Phone Obfuscation (decimal-format fake numbers)
Sites that display phone numbers using CSS digit-scrambling, which Zyte renders as decimal numbers like `688 274.8203`:
- `kw.com` (412 fake phones)
- `realtytrac.com` (98 fake phones)
- `har.com`
- `remax.com`
- `homesmart.com`
- `sothebysrealty.com`

---

## 📊 Totals Across All Confirmed Sources

| Metric | Count |
|---|---|
| Sites tested | ~100 |
| Zyte calls made | ~160 |
| Confirmed usable sources | **9** |
| Sold-date sources | **4** |
| Max phones per page | 134 (FastExpert) |
| Max emails per page | 89 (FastExpert) |
| Max sold volume | 70,926 (Zillow OC) |

---

## 🗺️ Recommended Scraping Plan

### Tier 1 — Agent Contact (most emails + phones per call)
1. `fastexpert.com/top-real-estate-agents/orange-county-ca/` — paginate through all pages
2. `coldwellbankerhomes.com/ca/orange-county/agents/` — paginate all pages
3. `sevengables.com/agents/` — scrape all agent cards
4. `homefinder.com/CA/{city}/recently-sold` — rotate through OC cities

### Tier 2 — Agent Contact (phones, no emails)
5. `yellowpages.com/orange-ca/real-estate-agents` + paginate
6. `yellowpages.com/irvine-ca/real-estate-agents` + paginate
7. `firstteam.com/agents/` — paginate or filter by city
8. `ezlocal.com/ca/orange/real-estate-agents`

### Tier 3 — Sold Addresses + Dates (for two-source cross-reference)
9. `zillow.com/orange-county-ca/sold/` — HTTP, extract `__NEXT_DATA__`
10. `redfin.com/zipcode/{ZIP}/recently-sold` — rotate through OC zips (92618, 92620, 92630, 92651, 92660, 92663, 92703, 92780, 92806, 92868)
