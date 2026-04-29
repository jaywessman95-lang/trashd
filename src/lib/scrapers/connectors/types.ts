import type { NormalizedLeadCandidate, SourceId } from "@/lib/types";

export type SourceConnector = {
  source: SourceId;
  render?: boolean;
  buildSeedUrls: (territory: { cities: string[]; radiusMiles: number }) => string[];
  fetch?: (url: string) => Promise<{ url: string; html: string }>;
  extract: (html: string, url: string) => Promise<NormalizedLeadCandidate[]>;
};
