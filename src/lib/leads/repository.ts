import { env } from "@/lib/env";
import { sampleLeads, type DisplayLead } from "@/lib/sample-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

type ListLeadsOptions = {
  limit?: number;
  minScore?: number;
  source?: SourceId;
  city?: string;
  priority?: LeadPriority;
  jobSize?: JobSize;
  leadType?: LeadType;
  firstSeenWithinHours?: number;
  endingWithinHours?: number;
  minImages?: number;
  sort?: "score" | "newest" | "ending_soon";
};

export async function listLeads(options: ListLeadsOptions = {}): Promise<DisplayLead[]> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return filterSampleLeads(sampleLeads, options);
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("leads")
    .select("*")
    .gte("score", options.minScore ?? 0);

  if (options.source) {
    query = query.eq("source", options.source);
  }

  if (options.city) {
    query = query.ilike("city", options.city);
  }

  if (options.priority) {
    query = query.eq("priority", options.priority);
  }

  if (options.jobSize) {
    query = query.eq("job_size", options.jobSize);
  }

  if (options.leadType) {
    query = query.eq("lead_type", options.leadType);
  }

  if (typeof options.minImages === "number") {
    query = query.gte("image_count", options.minImages);
  }

  if (options.firstSeenWithinHours) {
    query = query.gte("created_at", hoursAgo(options.firstSeenWithinHours));
  }

  if (options.endingWithinHours) {
    query = query.gte("event_end", new Date().toISOString()).lte("event_end", hoursFromNow(options.endingWithinHours));
  }

  if (options.sort === "newest") {
    query = query.order("created_at", { ascending: false }).order("score", { ascending: false });
  } else if (options.sort === "ending_soon") {
    query = query.order("event_end", { ascending: true, nullsFirst: false }).order("score", { ascending: false });
  } else {
    query = query.order("score", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(options.limit ?? 50);

  if (error) {
    return filterSampleLeads(sampleLeads, options);
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
    firstSeenAt: row.created_at,
    rawData: {},
    score: row.score,
    priority: row.priority as LeadPriority,
    jobSize: row.job_size as JobSize,
    leadType: row.lead_type as LeadType,
    aiReason: row.ai_reason ?? "Stored lead scored by the ingestion pipeline.",
    scoringVersion: row.scoring_version ?? "unknown"
  };
}

function filterSampleLeads(leads: DisplayLead[], options: ListLeadsOptions) {
  return leads
    .filter((lead) => lead.score >= (options.minScore ?? 0))
    .filter((lead) => !options.source || lead.source === options.source)
    .filter((lead) => !options.city || lead.city?.toLowerCase() === options.city.toLowerCase())
    .filter((lead) => !options.priority || lead.priority === options.priority)
    .filter((lead) => !options.jobSize || lead.jobSize === options.jobSize)
    .filter((lead) => !options.leadType || lead.leadType === options.leadType)
    .filter((lead) => typeof options.minImages !== "number" || lead.imageCount >= options.minImages)
    .filter((lead) => !options.firstSeenWithinHours || isAfter(lead.firstSeenAt, hoursAgo(options.firstSeenWithinHours)))
    .filter((lead) => !options.endingWithinHours || isBetweenNowAnd(lead.eventEnd, hoursFromNow(options.endingWithinHours)))
    .sort((a, b) => compareLeads(a, b, options.sort))
    .slice(0, options.limit ?? 50);
}

function compareLeads(a: DisplayLead, b: DisplayLead, sort: ListLeadsOptions["sort"]) {
  if (sort === "newest") {
    return dateValue(b.firstSeenAt) - dateValue(a.firstSeenAt) || b.score - a.score;
  }

  if (sort === "ending_soon") {
    return dateValue(a.eventEnd, Number.MAX_SAFE_INTEGER) - dateValue(b.eventEnd, Number.MAX_SAFE_INTEGER) || b.score - a.score;
  }

  return b.score - a.score || dateValue(b.firstSeenAt) - dateValue(a.firstSeenAt);
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isAfter(value: string | undefined, threshold: string) {
  return Boolean(value && Date.parse(value) >= Date.parse(threshold));
}

function isBetweenNowAnd(value: string | undefined, threshold: string) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return timestamp >= Date.now() && timestamp <= Date.parse(threshold);
}

function dateValue(value: string | undefined, fallback = 0) {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : timestamp;
}
