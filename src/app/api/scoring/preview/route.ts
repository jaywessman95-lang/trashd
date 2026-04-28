import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCronSecret } from "@/lib/api/guards";
import { scoreLeadWithInfermatic } from "@/lib/integrations/infermatic";

const candidateSchema = z.object({
  source: z.enum(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"]),
  sourceListingId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  url: z.string().url(),
  price: z.string().optional(),
  imageCount: z.number().int().min(0).default(0),
  eventStart: z.string().optional(),
  eventEnd: z.string().optional(),
  postedAt: z.string().optional(),
  rawData: z.record(z.string(), z.unknown()).default({})
});

export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const candidate = candidateSchema.parse(body);
  const score = await scoreLeadWithInfermatic(candidate);

  return NextResponse.json({ candidate, score });
}
