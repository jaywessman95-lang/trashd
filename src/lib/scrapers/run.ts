import { env } from "@/lib/env";
import { fetchWithZyte } from "@/lib/integrations/zyte";
import { scoreLeadWithInfermatic } from "@/lib/integrations/infermatic";
import { connectors } from "@/lib/scrapers/connectors";
import { normalizeCandidates } from "@/lib/scrapers/normalize";
import { failScrapeRun, finishScrapeRun, persistScoredLead, startScrapeRun } from "@/lib/scrapers/persistence";
import type { LeadScore, NormalizedLeadCandidate, SourceId } from "@/lib/types";

export type ScrapeRunInput = {
  source: SourceId;
  cities: string[];
  radiusMiles: number;
  maxSeedUrls?: number;
  maxCandidates?: number;
  persist?: boolean;
};

export type ScoredCandidate = {
  candidate: NormalizedLeadCandidate;
  score: LeadScore;
};

export type ScrapeRunResult = {
  source: SourceId;
  seedUrls: string[];
  fetchedUrls: string[];
  candidatesFound: number;
  scored: ScoredCandidate[];
  persisted: boolean;
};

export async function runSourceScrape(input: ScrapeRunInput): Promise<ScrapeRunResult> {
  const connector = connectors[input.source];
  const seedUrls = connector
    .buildSeedUrls({
      cities: input.cities,
      radiusMiles: input.radiusMiles
    })
    .slice(0, input.maxSeedUrls ?? 3);
  const scored: ScoredCandidate[] = [];
  const fetchedUrls: string[] = [];
  const shouldPersist = Boolean(input.persist && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  const scrapeRunId = shouldPersist ? await startScrapeRun(input.source) : undefined;
  const maxCandidates = input.maxCandidates ?? 100;
  const maxCandidatesPerSeed = Math.max(1, Math.ceil(maxCandidates / Math.max(seedUrls.length, 1)));

  try {
    for (const seedUrl of seedUrls) {
      const page = await fetchWithZyte({ url: seedUrl, render: connector.render ?? true });
      fetchedUrls.push(page.url);
      const remainingCandidateSlots = maxCandidates - scored.length;

      if (remainingCandidateSlots <= 0) {
        break;
      }

      const candidates = normalizeCandidates(await connector.extract(page.html, page.url)).slice(0, Math.min(remainingCandidateSlots, maxCandidatesPerSeed));

      for (const candidate of candidates) {
        const score = await scoreLeadWithInfermatic(candidate);
        scored.push({ candidate, score });

        if (shouldPersist) {
          await persistScoredLead(candidate, score, scrapeRunId);
        }
      }
    }

    if (shouldPersist && scrapeRunId) {
      await finishScrapeRun(scrapeRunId, scored.length);
    }
  } catch (error) {
    if (shouldPersist && scrapeRunId) {
      await failScrapeRun(scrapeRunId, error instanceof Error ? error.message : "Unknown scrape error");
    }

    throw error;
  }

  return {
    source: input.source,
    seedUrls,
    fetchedUrls,
    candidatesFound: scored.length,
    scored,
    persisted: shouldPersist
  };
}
