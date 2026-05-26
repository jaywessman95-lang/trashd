/**
 * One-time seed: scrape Zillow and upsert into realtor_sold_listings.
 * Run: ZYTE_API_KEY=... npx tsx scripts/seed-zillow.ts
 */
import { scrapeZillow } from "../src/lib/sold-homes/scrapers/zillow";
import { createClient } from "@supabase/supabase-js";

const ZYTE_KEY = process.env.ZYTE_API_KEY ?? "";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!ZYTE_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

console.log("Scraping Zillow...");
const leads = await scrapeZillow(ZYTE_KEY, 30);
console.log(`Found ${leads.length} leads`);

const db = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const rows = leads.map((l) => ({
  id: l.id,
  address: l.address,
  city: l.city,
  state: l.state,
  zip: l.zip ?? null,
  sale_price: l.salePrice,
  sold_date: l.soldDate,
  property_type: l.propertyType,
  sale_type: l.saleType,
  cash_sale: l.cashSale ?? false,
  score: l.score,
  priority: l.priority,
  score_reason: l.scoreReason ?? null,
  listing_url: l.listingUrl ?? null,
  source: l.source,
  agent_name: l.agentName ?? null,
  agent_phone: l.agentPhone ?? null,
  agent_email: l.agentEmail ?? null,
  agent_brokerage: l.agentBrokerage ?? null,
  updated_at: new Date().toISOString(),
}));

const { error } = await db
  .from("realtor_sold_listings")
  .upsert(rows, { onConflict: "id", ignoreDuplicates: false })
  .select("id");

if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}

console.log(`Upserted ${rows.length} rows.`);
console.log("Sample leads:");
for (const l of leads.slice(0, 3)) {
  console.log(`  [${l.score}] ${l.address}, ${l.city} — $${l.salePrice.toLocaleString()} — ${l.agentBrokerage ?? "no brokerage"}`);
}
