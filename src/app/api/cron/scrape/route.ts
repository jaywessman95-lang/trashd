import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DEFAULT_SCRAPE_COVERAGE, SCRAPE_COVERAGE_PRESETS, type ScrapeCoverage } from "@/lib/config/scrape-coverage";
import { runSourceScrape } from "@/lib/scrapers/run";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { SourceId } from "@/lib/types";

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

// Coverage preset totals are daily budgets spread evenly across hourly runs from 6am-9pm PT.
const DAILY_RUN_COUNT = 15;

const fallbackScrapeConfig = {
  sources: ["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"] as SourceId[],
  cities: ["Anaheim", "Irvine", "Santa Ana", "Costa Mesa", "Orange"],
  radiusMiles: 25,
  maxSeedUrls: 3,
  maxCandidates: 100
};

function isWithinOperatingHours(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      hour12: false
    }).format(new Date())
  );
  return hour >= 6 && hour < 21;
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Missing CRON_SECRET." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWithinOperatingHours()) {
    return NextResponse.json({ skipped: true, reason: "Outside operating hours (6am–9pm PT)" });
  }

  const config = await getScheduledScrapeConfig();
  const result = [];

  for (const source of config.sources) {
    result.push(
      await runSourceScrape({
        source,
        cities: config.cities,
        radiusMiles: config.radiusMiles,
        maxSeedUrls: config.maxSeedUrls,
        maxCandidates: config.maxCandidates,
        persist: true
      })
    );
  }

  return NextResponse.json(result);
}

async function getScheduledScrapeConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallbackScrapeConfig;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("cities,radius,enabled_sources,scrape_coverage,max_listings_per_source,max_pages_per_source,lookback_hours")
    .limit(50);

  if (error || !data?.length) {
    return fallbackScrapeConfig;
  }

  const settings = data as Pick<
    UserSettingsRow,
    | "cities"
    | "radius"
    | "enabled_sources"
    | "scrape_coverage"
    | "max_listings_per_source"
    | "max_pages_per_source"
    | "lookback_hours"
  >[];
  const coverage = getMostAggressiveCoverage(settings.map((item) => item.scrape_coverage));
  const preset = SCRAPE_COVERAGE_PRESETS.find((item) => item.id === coverage) ?? SCRAPE_COVERAGE_PRESETS[1];
  const cities = unique(settings.flatMap((item) => item.cities)).slice(0, 25);
  const sources = unique(settings.flatMap((item) => item.enabled_sources)) as SourceId[];
  const maxListingsOverride = maxOptional(settings.map((item) => item.max_listings_per_source));
  const maxPagesOverride = maxOptional(settings.map((item) => item.max_pages_per_source));

  const dailyMaxListings = Math.min(maxListingsOverride ?? preset.maxListingsPerSource, 500);

  return {
    sources: sources.length ? sources : fallbackScrapeConfig.sources,
    cities: cities.length ? cities : fallbackScrapeConfig.cities,
    radiusMiles: Math.max(...settings.map((item) => item.radius), fallbackScrapeConfig.radiusMiles),
    maxSeedUrls: Math.min(maxPagesOverride ?? preset.maxPagesPerSource, 25),
    maxCandidates: Math.ceil(dailyMaxListings / DAILY_RUN_COUNT)
  };
}

function getMostAggressiveCoverage(values: string[]): ScrapeCoverage {
  const order: ScrapeCoverage[] = ["conservative", "standard", "deep", "maximum"];
  const fallbackIndex = order.indexOf(DEFAULT_SCRAPE_COVERAGE);
  const maxIndex = Math.max(
    fallbackIndex,
    ...values.map((value) => order.indexOf(value as ScrapeCoverage)).filter((index) => index >= 0)
  );

  return order[maxIndex] ?? DEFAULT_SCRAPE_COVERAGE;
}

function maxOptional(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : null;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}
