"use client";

import { useState } from "react";
import type { ServiceOperator } from "@/lib/service-operators/types";
import { ServiceOperatorCard } from "@/components/service-operator-card";

const AGGREGATOR_RE = /yelp\.com|google\.|facebook\.|twitter\.com|instagram\.com|linkedin\.com|bbb\.org|yp\.com|angi(e?s?list)?\.com|homeadvisor|thumbtack|bark\.com|houzz\.|tripadvisor|manta\.|superpages|dexknows|foursquare|whitepages|yellowpages|porch\.com|cloudflare|amazonaws|googleapis|gstatic/i;
function isValidWebsite(url: string | undefined): url is string {
  return !!url && url.startsWith("http") && !AGGREGATOR_RE.test(url);
}

type SortKey = "priority" | "score" | "company" | "city" | "serviceType" | "scrapedAt";
type SortDir = "asc" | "desc";
type ViewMode = "cards" | "table";

const PRIORITY_RANK: Record<string, number> = { hot_now: 3, strong: 2, good: 1 };
const PRIORITY_LABEL: Record<string, string> = { hot_now: "Hot Now", strong: "Strong", good: "Good" };
const SERVICE_TYPE_LABEL: Record<string, string> = {
  junk_removal: "Junk Removal",
  movers: "Movers",
  both: "Junk + Movers",
};

function sortOperators(ops: ServiceOperator[], key: SortKey, dir: SortDir): ServiceOperator[] {
  return [...ops].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "priority":    cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0); break;
      case "score":       cmp = a.score - b.score; break;
      case "company":     cmp = (a.company ?? "").localeCompare(b.company ?? ""); break;
      case "city":        cmp = (a.city ?? "").localeCompare(b.city ?? ""); break;
      case "serviceType": cmp = a.serviceType.localeCompare(b.serviceType); break;
      case "scrapedAt":   cmp = Date.parse(a.scrapedAt ?? "0") - Date.parse(b.scrapedAt ?? "0"); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - Date.parse(dateStr);
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(ms / 86400000);
  return `${days}d ago`;
}

type ThProps = {
  col: SortKey;
  active: boolean;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
};

function Th({ col, active, sortDir, onSort, children }: ThProps) {
  return (
    <th className={`lead-table-sortable${active ? " sort-active" : ""}`} onClick={() => onSort(col)}>
      <span className="sort-th-inner">
        {children}
        <span className="sort-icon" aria-hidden>{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
      </span>
    </th>
  );
}

type Props = { operators: ServiceOperator[] };

export function ServiceOperatorTable({ operators }: Props) {
  const [view, setView] = useState<ViewMode>("cards");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [copied, setCopied] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const sorted = sortOperators(operators, sortKey, sortDir);

  return (
    <div className="lead-table-wrap container">
      <div className="view-toggle">
        <button
          className={`view-toggle-btn${view === "cards" ? " active" : ""}`}
          type="button"
          onClick={() => setView("cards")}
        >
          Cards
        </button>
        <button
          className={`view-toggle-btn${view === "table" ? " active" : ""}`}
          type="button"
          onClick={() => setView("table")}
        >
          Table
        </button>
      </div>

      {view === "cards" ? (
        <div className="realtor-cards-grid">
          {sorted.map((op) => <ServiceOperatorCard key={op.id} operator={op} />)}
          {!operators.length && (
            <p className="realtor-cards-empty">No services match these filters.</p>
          )}
        </div>
      ) : (
        <div className="lead-table-scroll">
          <table className="lead-table realtor-table">
            <thead>
              <tr>
                <Th col="priority"    active={sortKey === "priority"}    sortDir={sortDir} onSort={handleSort}>Priority</Th>
                <Th col="score"       active={sortKey === "score"}       sortDir={sortDir} onSort={handleSort}>Score</Th>
                <Th col="company"     active={sortKey === "company"}     sortDir={sortDir} onSort={handleSort}>Company</Th>
                <Th col="serviceType" active={sortKey === "serviceType"} sortDir={sortDir} onSort={handleSort}>Service</Th>
                <Th col="city"        active={sortKey === "city"}        sortDir={sortDir} onSort={handleSort}>City</Th>
                <th>Phone</th>
                <th>Email</th>
                <th>Source</th>
                <Th col="scrapedAt"   active={sortKey === "scrapedAt"}   sortDir={sortDir} onSort={handleSort}>Scraped</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((op) => {
                const scrapeAgo = op.scrapedAt ? timeAgo(op.scrapedAt) : "—";
                const scrapeDt = op.scrapedAt ? new Date(op.scrapedAt) : null;
                const scrapeDateLabel = scrapeDt
                  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(scrapeDt)
                  : "";
                return (
                  <tr key={op.id}>
                    <td>
                      <span className={`lead-table-priority priority-${op.priority}`}>
                        {PRIORITY_LABEL[op.priority] ?? op.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`lead-table-score ${op.score >= 70 ? "score-high" : op.score >= 45 ? "score-mid" : "score-low"}`}>
                        {op.score}
                      </span>
                    </td>
                    <td>
                      <div className="lead-table-title">{op.company ?? "—"}</div>
                      {isValidWebsite(op.websiteUrl) && (
                        <div className="lead-table-source">
                          <a href={op.websiteUrl} target="_blank" rel="noreferrer" className="phone-link">
                            website
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`operator-service-badge service-type-${op.serviceType}`}>
                        {SERVICE_TYPE_LABEL[op.serviceType] ?? op.serviceType}
                      </span>
                    </td>
                    <td className="lead-table-city">
                      {op.city ?? "—"}
                      {op.state && op.state !== "CA" ? `, ${op.state}` : ""}
                    </td>
                    <td>
                      {op.phone ? (
                        <div className="phone-cell">
                          <a className="phone-link" href={`tel:${op.phone.replace(/\D/g, "")}`}>
                            {op.phone}
                          </a>
                          <button
                            className="copy-btn"
                            title="Copy phone"
                            type="button"
                            onClick={() => copyText(op.phone!, `phone-${op.id}`)}
                          >
                            {copied === `phone-${op.id}` ? "✓" : "⎘"}
                          </button>
                        </div>
                      ) : <span className="no-contact">No phone</span>}
                    </td>
                    <td>
                      {op.email ? (
                        <div className="phone-cell">
                          <a className="phone-link" href={`mailto:${op.email}`}>
                            {op.email}
                          </a>
                          <button
                            className="copy-btn"
                            title="Copy email"
                            type="button"
                            onClick={() => copyText(op.email!, `email-${op.id}`)}
                          >
                            {copied === `email-${op.id}` ? "✓" : "⎘"}
                          </button>
                        </div>
                      ) : <span className="no-contact">No email</span>}
                    </td>
                    <td className="lead-table-meta">
                      <span className="operator-source-tag">{op.source.replace(/_/g, " ")}</span>
                    </td>
                    <td className="sold-time-cell">
                      {scrapeDt ? (
                        <>
                          <span className="sold-time-ago">{scrapeAgo}</span>
                          <span className="sold-time-date">{scrapeDateLabel}</span>
                        </>
                      ) : <span className="no-contact">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!operators.length && (
                <tr>
                  <td className="lead-table-empty" colSpan={9}>No services match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
