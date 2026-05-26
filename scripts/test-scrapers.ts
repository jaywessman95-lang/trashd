/**
 * Run with: npx tsx scripts/test-scrapers.ts
 * Tests each scraper source and reports results.
 */
import { scrapeRedfin } from "../src/lib/sold-homes/scrapers/redfin";
import { scrapeHomesCom } from "../src/lib/sold-homes/scrapers/homes-com";
import { scrapeRealtorCom } from "../src/lib/sold-homes/scrapers/realtor-com";
import { scrapeHomesnap } from "../src/lib/sold-homes/scrapers/homesnap";
import { scrapeOCRecorder } from "../src/lib/sold-homes/scrapers/oc-recorder";

const API_KEY = process.env.ZYTE_API_KEY ?? "";

type ScraperResult = {
  source: string;
  ok: boolean;
  leadsFound: number;
  rawSignals: number;
  note?: string;
  error?: string;
  durationMs: number;
};

async function run(
  name: string,
  fn: () => Promise<{ leads: unknown[]; rawCount: number; note?: string }>
): Promise<ScraperResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      source: name,
      ok: result.rawCount > 0,
      leadsFound: result.leads.length,
      rawSignals: result.rawCount,
      note: result.note,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      source: name,
      ok: false,
      leadsFound: 0,
      rawSignals: 0,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - start,
    };
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Missing ZYTE_API_KEY");
    process.exit(1);
  }

  console.log("Starting scraper test — running all 5 sources...\n");

  const results = await Promise.allSettled([
    run("redfin",       () => scrapeRedfin(API_KEY)),
    run("homes_com",    () => scrapeHomesCom(API_KEY)),
    run("realtor_com",  () => scrapeRealtorCom(API_KEY)),
    run("homesnap",     () => scrapeHomesnap(API_KEY)),
    run("oc_recorder",  () => scrapeOCRecorder(API_KEY)),
  ]);

  console.log("=".repeat(60));
  console.log("SCRAPER TEST RESULTS");
  console.log("=".repeat(60));

  for (const r of results) {
    if (r.status === "rejected") {
      console.log(`❌  UNKNOWN   — ${r.reason}`);
      continue;
    }
    const { source, ok, leadsFound, rawSignals, note, error, durationMs } = r.value;
    const icon = ok ? "✅" : "❌";
    const status = ok ? "PASS" : "FAIL";
    console.log(`\n${icon}  ${source.padEnd(14)} ${status}  (${durationMs}ms)`);
    if (ok) {
      console.log(`   Raw price signals found : ${rawSignals}`);
      console.log(`   Structured leads parsed : ${leadsFound}`);
    }
    if (note)  console.log(`   Note  : ${note}`);
    if (error) console.log(`   Error : ${error}`);
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
