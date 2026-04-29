import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/guards";
import { listLeads } from "@/lib/leads/repository";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

const sources: SourceId[] = ["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"];
const priorities: LeadPriority[] = ["hot_now", "strong", "good", "hidden"];
const jobSizes: JobSize[] = ["small", "medium", "large", "unknown"];
const leadTypes: LeadType[] = ["residential", "moving", "estate", "auction", "storage", "commercial", "garage_sale", "free_bulk_pickup", "unknown"];
const sorts = ["score", "newest", "ending_soon"] as const;

export async function GET(request: Request) {
  const { response } = await requireSignedInUser();
  if (response) return response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const minScore = Number(url.searchParams.get("minScore") ?? "0");
  const leads = await listLeads({
    limit,
    minScore,
    source: parseEnum(url.searchParams.get("source"), sources),
    city: url.searchParams.get("city")?.trim() || undefined,
    priority: parseEnum(url.searchParams.get("priority"), priorities),
    jobSize: parseEnum(url.searchParams.get("jobSize"), jobSizes),
    leadType: parseEnum(url.searchParams.get("leadType"), leadTypes),
    firstSeenWithinHours: parseOptionalNumber(url.searchParams.get("firstSeenWithinHours")),
    endingWithinHours: parseOptionalNumber(url.searchParams.get("endingWithinHours")),
    minImages: parseOptionalNumber(url.searchParams.get("minImages")),
    sort: parseEnum(url.searchParams.get("sort"), sorts) ?? "score"
  });

  return NextResponse.json({ leads });
}

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[]) {
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}
