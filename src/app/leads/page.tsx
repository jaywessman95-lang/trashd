import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LeadCard } from "@/components/lead-card";
import { LeadTable } from "@/components/lead-table";
import { LeadViewToggle } from "@/components/lead-view-toggle";
import { SOURCES } from "@/lib/config/sources";
import { listLeads } from "@/lib/leads/repository";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

export const dynamic = "force-dynamic";

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const priorities: LeadPriority[] = ["hot_now", "strong", "good", "hidden"];
const jobSizes: JobSize[] = ["small", "medium", "large", "unknown"];
const leadTypes: LeadType[] = [
  "residential",
  "moving",
  "estate",
  "auction",
  "storage",
  "commercial",
  "garage_sale",
  "free_bulk_pickup",
  "unknown"
];

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

      <section className="container lead-filter-panel" aria-label="Lead filters">
        <form className="lead-filter-form">
          <label>
            Minimum score
            <input defaultValue={filters.minScore} max="100" min="0" name="minScore" type="number" />
          </label>
          <label>
            Source
            <select defaultValue={filters.source ?? ""} name="source">
              <option value="">All sources</option>
              {SOURCES.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input defaultValue={filters.city ?? ""} name="city" placeholder="Any city" />
          </label>
          <label>
            Priority
            <select defaultValue={filters.priority ?? ""} name="priority">
              <option value="">Any priority</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {formatTitle(priority)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Job size
            <select defaultValue={filters.jobSize ?? ""} name="jobSize">
              <option value="">Any size</option>
              {jobSizes.map((jobSize) => (
                <option key={jobSize} value={jobSize}>
                  {formatTitle(jobSize)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lead type
            <select defaultValue={filters.leadType ?? ""} name="leadType">
              <option value="">Any type</option>
              {leadTypes.map((leadType) => (
                <option key={leadType} value={leadType}>
                  {formatTitle(leadType)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Found within
            <select defaultValue={filters.firstSeenWithinHours ?? ""} name="firstSeenWithinHours">
              <option value="">Any time</option>
              <option value="24">Last 24 hours</option>
              <option value="72">Last 3 days</option>
              <option value="168">Last 7 days</option>
            </select>
          </label>
          <label>
            Ending within
            <select defaultValue={filters.endingWithinHours ?? ""} name="endingWithinHours">
              <option value="">Any time</option>
              <option value="24">Next 24 hours</option>
              <option value="72">Next 3 days</option>
              <option value="168">Next 7 days</option>
            </select>
          </label>
          <label>
            Minimum photos
            <input defaultValue={filters.minImages ?? ""} min="0" name="minImages" placeholder="Any" type="number" />
          </label>
          <label>
            Sort
            <select defaultValue={filters.sort ?? "score"} name="sort">
              <option value="score">Best score</option>
              <option value="newest">Newest found</option>
              <option value="ending_soon">Ending soon</option>
            </select>
          </label>
          <div className="lead-filter-actions">
            <button className="button" type="submit">
              Apply Filters
            </button>
            <a className="small-button" href="/leads">
              Clear
            </a>
          </div>
        </form>
        <div className="filter-summary-row">
          <p className="filter-summary">
            {leads.length} leads shown{activeFilterCount ? ` with ${activeFilterCount} filters active` : ""}
          </p>
          <Suspense>
            <LeadViewToggle />
          </Suspense>
        </div>
      </section>

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

function countActiveFilters(filters: ReturnType<typeof parseLeadFilters>) {
  return [
    filters.minScore > 0,
    filters.source,
    filters.city,
    filters.priority,
    filters.jobSize,
    filters.leadType,
    filters.firstSeenWithinHours,
    filters.endingWithinHours,
    typeof filters.minImages === "number",
    filters.sort !== "score"
  ].filter(Boolean).length;
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
