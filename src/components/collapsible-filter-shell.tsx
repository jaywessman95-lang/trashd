"use client";

import { useState } from "react";

type Props = {
  children: React.ReactNode;
  summary: string;
};

export function CollapsibleFilterShell({ children, summary }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="container lead-filter-panel">
      <div className="filter-summary-row">
        <p className="filter-summary">{summary}</p>
        <button
          aria-expanded={isOpen}
          className="small-button"
          onClick={() => setIsOpen((o) => !o)}
          type="button"
        >
          {isOpen ? "Hide Filters" : "Filter"}
        </button>
      </div>
      {isOpen ? children : null}
    </section>
  );
}
