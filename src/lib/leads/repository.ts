import { env } from "@/lib/env";
import { sampleLeads, type DisplayLead } from "@/lib/sample-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

type ListLeadsOptions = {
  limit?: number;
  minScore?: number;
};

export async function listLeads(options: ListLeadsOptions = {}): Promise<DisplayLead[]> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return sampleLeads;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .gte("score", options.minScore ?? 0)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (error) {
    return sampleLeads;
  }

  return data.map(mapLeadRow);
}

export async function getLeadStats() {
  const leads = await listLeads({ limit: 100 });
  const newToday = leads.length;
  const hotLeads = leads.filter((lead) => lead.score >= 90).length;
  const largeJobs = leads.filter((lead) => lead.jobSize === "large").length;

  return { newToday, hotLeads, largeJobs };
}

function mapLeadRow(row: LeadRow): DisplayLead {
  return {
    id: row.id,
    source: row.source as SourceId,
    title: row.title,
    description: row.description ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    url: row.url,
    price: row.price ?? undefined,
    imageCount: row.image_count,
    eventStart: row.event_start ?? undefined,
    eventEnd: row.event_end ?? undefined,
    postedAt: row.posted_at ?? undefined,
    rawData: {},
    score: row.score,
    priority: row.priority as LeadPriority,
    jobSize: row.job_size as JobSize,
    leadType: row.lead_type as LeadType,
    aiReason: row.ai_reason ?? "Stored lead scored by the ingestion pipeline.",
    scoringVersion: row.scoring_version ?? "unknown"
  };
}
