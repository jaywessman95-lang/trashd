import { zyteGet } from "../src/lib/sold-homes/scrapers/zyte-client";

const KEY = process.env.ZYTE_API_KEY ?? "";

const { html } = await zyteGet(KEY, {
  url: "https://www.zillow.com/orange-county-ca/sold/",
  httpResponseBody: true,
});

// Extract full __NEXT_DATA__ — no length limit
const ndMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
if (!ndMatch) { console.error("No __NEXT_DATA__"); process.exit(1); }

const nd = JSON.parse(ndMatch[1]) as any;

// Drill into listing data
const state = nd?.props?.pageProps?.searchPageState;
const listResults = state?.cat1?.searchResults?.listResults ?? [];
const mapResults  = state?.cat1?.searchResults?.mapResults  ?? [];
const allListings = [...listResults, ...mapResults];

console.log(`Listings found: ${allListings.length}`);

// Show first 3 listings with all available fields
for (const l of allListings.slice(0, 3)) {
  console.log("\n--- Listing ---");
  console.log("zpid          :", l.zpid);
  console.log("address       :", l.address);
  console.log("addressStreet :", l.addressStreet);
  console.log("addressCity   :", l.addressCity);
  console.log("addressState  :", l.addressState);
  console.log("addressZip    :", l.addressZip);
  console.log("price         :", l.price ?? l.unformattedPrice);
  console.log("statusText    :", l.statusText);
  console.log("soldDate      :", l.hdpData?.homeInfo?.dateSold ?? l.dateSold);
  console.log("listingAgent  :", JSON.stringify(l.hdpData?.homeInfo?.listingAgent ?? l.listingAgent)?.slice(0, 120));
  console.log("brokerName    :", l.brokerName ?? l.hdpData?.homeInfo?.attributionInfo?.brokerName);
  console.log("homeType      :", l.hdpData?.homeInfo?.homeType ?? l.homeType);
  console.log("detailUrl     :", l.detailUrl);
  console.log("All top keys  :", Object.keys(l).join(", "));
}
