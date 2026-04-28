import type { NormalizedLeadCandidate } from "@/lib/types";

export function createDedupeKey(candidate: NormalizedLeadCandidate): string {
  return [candidate.source, candidate.sourceListingId ?? candidate.url].join(":");
}
