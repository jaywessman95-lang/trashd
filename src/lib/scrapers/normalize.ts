import { createDedupeKey } from "@/lib/scrapers/dedupe";
import type { NormalizedLeadCandidate } from "@/lib/types";

export function normalizeCandidates(candidates: NormalizedLeadCandidate[]): NormalizedLeadCandidate[] {
  const seen = new Set<string>();
  const normalized: NormalizedLeadCandidate[] = [];

  for (const candidate of candidates) {
    const title = candidate.title.trim();
    const url = candidate.url.trim();

    if (!title || !url) {
      continue;
    }

    const cleaned: NormalizedLeadCandidate = {
      ...candidate,
      title,
      url,
      description: trimOptional(candidate.description),
      city: trimOptional(candidate.city),
      state: trimOptional(candidate.state),
      price: trimOptional(candidate.price),
      imageCount: Math.max(0, candidate.imageCount || 0),
      rawData: candidate.rawData ?? {}
    };
    const dedupeKey = createDedupeKey(cleaned);

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(cleaned);
  }

  return normalized;
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
