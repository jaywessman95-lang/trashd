import { AppShell } from "@/components/app-shell";
import { LeadCard } from "@/components/lead-card";
import { countActiveFilters, jobSizes, LeadFilterPanel, leadTypes, priorities } from "@/components/lead-filter-panel";
import { LeadTable } from "@/components/lead-table";
import { SOURCES } from "@/lib/config/sources";
import { listLeads } from "@/lib/leads/repository";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

export const dynamic = "force-dynamic";

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const resolved = await searchParams;
  const filters = parseLeadFilters(resolved);
  const leads = await listLeads(filters);
  const activeFilterCount = countActiveFilters(filters);
  const isTableView = resolved.view !== "card";

  return (
    <AppShell>
      <section className="container hero">
        <h1>Leads</h1>
        <p>Qualified opportunities will appear here after scraping, normalization, scoring, and user filtering.</p>
      </section>

      <LeadFilterPanel activeFilterCount={activeFilterCount} filters={filters} leadCount={leads.length} />

      {isTableView ? (
        <LeadTable leads={leads} />
      ) : (
        <section className="container grid" aria-label="Lead list">
          {leads.map((lead) => (
            <LeadCard key={lead.id ?? `${lead.source}-${lead.title}`} lead={lead} />
          ))}
          {!leads.length ? <p className="empty-state">No leads match these filters.</p> : null}
        </section>
      )}
    </AppShell>
  );
}

function parseLeadFilters(searchParams: Record<string, string | string[] | undefined>) {
  return {
    limit: 50,
    minScore: parseNumber(searchParams.minScore, 0),
    source: parseEnum<SourceId>(searchParams.source, SOURCES.map((source) => source.id)),
    city: parseString(searchParams.city),
    priority: parseEnum<LeadPriority>(searchParams.priority, priorities),
    jobSize: parseEnum<JobSize>(searchParams.jobSize, jobSizes),
    leadType: parseEnum<LeadType>(searchParams.leadType, leadTypes),
    firstSeenWithinHours: parseOptionalNumber(searchParams.firstSeenWithinHours),
    endingWithinHours: parseOptionalNumber(searchParams.endingWithinHours),
    minImages: parseOptionalNumber(searchParams.minImages),
    sort: parseEnum(searchParams.sort, ["score", "newest", "ending_soon"] as const) ?? "score"
  };
}

function parseString(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function parseNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(parseString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string | string[] | undefined) {
  const parsed = Number(parseString(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const first = parseString(value);
  return first && allowed.includes(first as T) ? (first as T) : undefined;
}
