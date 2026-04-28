import { NextResponse } from "next/server";
import { z } from "zod";
import { connectors } from "@/lib/scrapers/connectors";

const sourceSchema = z.enum(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"]);

export function GET(request: Request) {
  const url = new URL(request.url);
  const source = sourceSchema.parse(url.searchParams.get("source") ?? "craigslist");
  const cities = url.searchParams.get("cities")?.split(",").filter(Boolean) ?? ["Anaheim", "Irvine", "Santa Ana"];
  const radiusMiles = Number(url.searchParams.get("radius") ?? "25");
  const seedUrls = connectors[source].buildSeedUrls({ cities, radiusMiles });

  return NextResponse.json({ source, cities, radiusMiles, seedUrls });
}
