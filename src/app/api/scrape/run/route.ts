import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCronSecret } from "@/lib/api/guards";
import { runSourceScrape } from "@/lib/scrapers/run";

const scrapeRunSchema = z.object({
  source: z.enum(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"]),
  cities: z.array(z.string()).default(["Anaheim", "Irvine", "Santa Ana"]),
  radiusMiles: z.number().int().positive().default(25),
  maxSeedUrls: z.number().int().positive().max(25).default(3),
  maxCandidates: z.number().int().positive().max(500).default(100),
  persist: z.boolean().default(false)
});

export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const input = scrapeRunSchema.parse(body);
  const result = await runSourceScrape(input);

  return NextResponse.json(result);
}
