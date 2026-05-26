"use client";

import { Suspense, useState } from "react";
import { FullscreenLeadTableButton } from "@/components/fullscreen-lead-table-button";
import { LeadViewToggle } from "@/components/lead-view-toggle";

type CollapsibleLeadFiltersProps = {
  activeFilterCount: number;
  children: React.ReactNode;
  leadCount: number;
  showFullscreenButton: boolean;
  showViewToggle: boolean;
};

export function CollapsibleLeadFilters({
  activeFilterCount,
  children,
  leadCount,
  showFullscreenButton,
  showViewToggle
}: CollapsibleLeadFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="filter-summary-row">
        <p className="filter-summary">
          {leadCount} leads shown{activeFilterCount ? ` with ${activeFilterCount} filters active` : ""}
        </p>
        <div className="filter-control-row">
          <button
            aria-expanded={isOpen}
            className="small-button"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            Filters
          </button>
          {showViewToggle ? (
            <Suspense>
              <LeadViewToggle />
            </Suspense>
          ) : null}
          {showFullscreenButton ? <FullscreenLeadTableButton /> : null}
        </div>
      </div>
      {isOpen ? children : null}
    </>
  );
}
