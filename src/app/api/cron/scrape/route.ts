import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runSourceScrape } from "@/lib/scrapers/run";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Missing CRON_SECRET." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSourceScrape({
    source: "craigslist",
    cities: ["Anaheim", "Irvine", "Santa Ana", "Costa Mesa", "Orange"],
    radiusMiles: 25,
    maxSeedUrls: 3,
    maxCandidates: 100,
    persist: true
  });

  return NextResponse.json(result);
}
