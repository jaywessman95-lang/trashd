import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { SourceId } from "@/lib/types";
import type { LeadScore, NormalizedLeadCandidate } from "@/lib/types";

export async function startScrapeRun(source: SourceId): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("scrape_runs").insert({ source, status: "running" }).select("id").single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function finishScrapeRun(id: string, listingsFound: number): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("scrape_runs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      listings_found: listingsFound
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function failScrapeRun(id: string, errorMessage: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("scrape_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: errorMessage
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function persistScoredLead(candidate: NormalizedLeadCandidate, score: LeadScore, scrapeRunId?: string) {
  const supabase = createSupabaseAdminClient();
  const rawPayload = {
    source: candidate.source,
    source_listing_id: candidate.sourceListingId,
    url: candidate.url,
    raw_data: JSON.parse(JSON.stringify(candidate.rawData)) as Json,
    scrape_run_id: scrapeRunId ?? null
  };

  const { data: rawListing, error: rawError } = await supabase.from("raw_listings").upsert(rawPayload, { onConflict: "source,url" }).select("id").single();

  if (rawError) {
    throw rawError;
  }

  const { error: leadError } = await supabase.from("leads").upsert(
    {
      raw_listing_id: rawListing.id,
      source: candidate.source,
      title: candidate.title,
      description: candidate.description,
      city: candidate.city,
      state: candidate.state,
      url: candidate.url,
      price: candidate.price,
      image_count: candidate.imageCount,
      event_start: candidate.eventStart,
      event_end: candidate.eventEnd,
      posted_at: candidate.postedAt,
      score: score.score,
      priority: score.priority,
      job_size: score.jobSize,
      lead_type: score.leadType,
      ai_reason: score.aiReason,
      scoring_version: score.scoringVersion
    },
    { onConflict: "source,url" }
  );

  if (leadError) {
    throw leadError;
  }
}
