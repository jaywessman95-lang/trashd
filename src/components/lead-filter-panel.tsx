import { Suspense } from "react";
import { CollapsibleLeadFilters } from "@/components/collapsible-lead-filters";
import { FullscreenLeadTableButton } from "@/components/fullscreen-lead-table-button";
import { LeadViewToggle } from "@/components/lead-view-toggle";
import { SOURCES } from "@/lib/config/sources";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

export type LeadFilters = {
  limit: number;
  minScore: number;
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

export const priorities: LeadPriority[] = ["hot_now", "strong", "good", "hidden"];
export const jobSizes: JobSize[] = ["small", "medium", "large", "unknown"];
export const leadTypes: LeadType[] = [
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

type LeadFilterPanelProps = {
  action?: string;
  activeFilterCount: number;
  filters: LeadFilters;
  leadCount: number;
  collapsible?: boolean;
  showFullscreenButton?: boolean;
  showViewToggle?: boolean;
};

export function LeadFilterPanel({
  action,
  activeFilterCount,
  collapsible = false,
  filters,
  leadCount,
  showFullscreenButton = true,
  showViewToggle = true
}: LeadFilterPanelProps) {
  const form = (
    <form action={action} className="lead-filter-form">
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
        <a className="small-button" href={action ?? "/leads"}>
          Clear
        </a>
      </div>
    </form>
  );

  return (
    <section className="container lead-filter-panel" aria-label="Lead filters">
      {collapsible ? (
        <CollapsibleLeadFilters
          activeFilterCount={activeFilterCount}
          leadCount={leadCount}
          showFullscreenButton={showFullscreenButton}
          showViewToggle={showViewToggle}
        >
          {form}
        </CollapsibleLeadFilters>
      ) : (
        form
      )}
      {!collapsible ? (
        <div className="filter-summary-row">
          <p className="filter-summary">
            {leadCount} leads shown{activeFilterCount ? ` with ${activeFilterCount} filters active` : ""}
          </p>
          <div className="filter-control-row">
            {showViewToggle ? (
              <Suspense>
                <LeadViewToggle />
              </Suspense>
            ) : null}
            {showFullscreenButton ? <FullscreenLeadTableButton /> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function countActiveFilters(filters: LeadFilters) {
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

export function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
