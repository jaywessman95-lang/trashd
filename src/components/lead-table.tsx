"use client";

import { useState } from "react";
import type { DisplayLead } from "@/lib/sample-data";

type SortKey = "title" | "city" | "score" | "priority" | "jobSize" | "leadType" | "price" | "imageCount" | "eventEnd" | "firstSeenAt" | "age";
type SortDir = "asc" | "desc";

type LeadTableProps = {
  leads: DisplayLead[];
};

type SortHeaderProps = {
  active: boolean;
  children: React.ReactNode;
  col: SortKey;
  onSort: (key: SortKey) => void;
  sortDir: SortDir;
};

const PRIORITY_RANK: Record<string, number> = { hot_now: 4, strong: 3, good: 2, hidden: 1 };
const JOB_SIZE_RANK: Record<string, number> = { large: 3, medium: 2, small: 1, unknown: 0 };

function sortLeads(leads: DisplayLead[], key: SortKey, dir: SortDir): DisplayLead[] {
  const sorted = [...leads].sort((a, b) => {
    let cmp = 0;

    switch (key) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "city":
        cmp = (a.city ?? "").localeCompare(b.city ?? "");
        break;
      case "score":
        cmp = a.score - b.score;
        break;
      case "priority":
        cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
        break;
      case "jobSize":
        cmp = (JOB_SIZE_RANK[a.jobSize] ?? 0) - (JOB_SIZE_RANK[b.jobSize] ?? 0);
        break;
      case "leadType":
        cmp = a.leadType.localeCompare(b.leadType);
        break;
      case "price":
        cmp = parsePrice(a.price) - parsePrice(b.price);
        break;
      case "imageCount":
        cmp = a.imageCount - b.imageCount;
        break;
      case "eventEnd":
        cmp = dateVal(a.eventEnd) - dateVal(b.eventEnd);
        break;
      case "firstSeenAt":
        cmp = dateVal(a.firstSeenAt) - dateVal(b.firstSeenAt);
        break;
      case "age":
        cmp = dateVal(a.firstSeenAt) - dateVal(b.firstSeenAt);
        break;
    }

    return dir === "asc" ? cmp : -cmp;
  });

  return sorted;
}

function parsePrice(value: string | undefined): number {
  if (!value) return -1;
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : -1;
}

function dateVal(value: string | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function SortHeader({ active, children, col, onSort, sortDir }: SortHeaderProps) {
  return (
    <th
      className={`lead-table-sortable${active ? " sort-active" : ""}`}
      onClick={() => onSort(col)}
    >
      <span className="sort-th-inner">
        {children}
        <span className="sort-icon" aria-hidden>
          {active ? (sortDir === "asc" ? "â†‘" : "â†“") : "â†•"}
        </span>
      </span>
    </th>
  );
}

export function LeadTable({ leads }: LeadTableProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = sortLeads(leads, sortKey, sortDir);

  const table = (
    <div className="lead-table-scroll">
      <table className="lead-table">
        <thead>
          <tr>
            <SortHeader active={sortKey === "title"} col="title" onSort={handleSort} sortDir={sortDir}>Title</SortHeader>
            <SortHeader active={sortKey === "city"} col="city" onSort={handleSort} sortDir={sortDir}>City</SortHeader>
            <SortHeader active={sortKey === "score"} col="score" onSort={handleSort} sortDir={sortDir}>Score</SortHeader>
            <SortHeader active={sortKey === "priority"} col="priority" onSort={handleSort} sortDir={sortDir}>Priority</SortHeader>
            <SortHeader active={sortKey === "jobSize"} col="jobSize" onSort={handleSort} sortDir={sortDir}>Job Size</SortHeader>
            <SortHeader active={sortKey === "leadType"} col="leadType" onSort={handleSort} sortDir={sortDir}>Lead Type</SortHeader>
            <th>AI Reason</th>
            <SortHeader active={sortKey === "price"} col="price" onSort={handleSort} sortDir={sortDir}>Price</SortHeader>
            <SortHeader active={sortKey === "imageCount"} col="imageCount" onSort={handleSort} sortDir={sortDir}>Photos</SortHeader>
            <SortHeader active={sortKey === "eventEnd"} col="eventEnd" onSort={handleSort} sortDir={sortDir}>Ends</SortHeader>
            <SortHeader active={sortKey === "firstSeenAt"} col="firstSeenAt" onSort={handleSort} sortDir={sortDir}>Found</SortHeader>
            <SortHeader active={sortKey === "age"} col="age" onSort={handleSort} sortDir={sortDir}>Age</SortHeader>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => (
            <tr key={lead.id ?? `${lead.source}-${lead.title}`}>
              <td>
                <a className="lead-table-title-link" href={lead.url} rel="noreferrer" target="_blank">
                  <div className="lead-table-title">{lead.title}</div>
                </a>
                <div className="lead-table-source">{lead.source}</div>
              </td>
              <td className="lead-table-city">{lead.city ?? "—"}</td>
              <td>
                <span className={`lead-table-score ${scoreClass(lead.score)}`}>{lead.score}</span>
              </td>
              <td>
                <span className={`lead-table-priority priority-${lead.priority}`}>
                  {formatTitle(lead.priority)}
                </span>
              </td>
              <td className="lead-table-meta">{formatTitle(lead.jobSize)}</td>
              <td className="lead-table-meta">{formatTitle(lead.leadType)}</td>
              <td className="lead-table-reason">{lead.aiReason}</td>
              <td className="lead-table-meta">{lead.price ?? "—"}</td>
              <td className="lead-table-meta">{lead.imageCount || "—"}</td>
              <td className="lead-table-meta">{lead.eventEnd ? formatDate(lead.eventEnd) : "—"}</td>
              <td className="lead-table-meta">{lead.firstSeenAt ? formatDate(lead.firstSeenAt) : "—"}</td>
              <td><span className={`lead-age-badge ${ageClass(lead.firstSeenAt)}`}>{leadAge(lead.firstSeenAt)}</span></td>
              <td>
                <a className="small-button lead-table-action" href={lead.url} rel="noreferrer" target="_blank">
                  View
                </a>
              </td>
            </tr>
          ))}
          {!leads.length ? (
            <tr>
              <td className="lead-table-empty" colSpan={13}>No leads match these filters.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="lead-table-overlay">
        <div className="lead-table-overlay-bar container">
          <span className="lead-table-overlay-count">{leads.length} leads</span>
          <button className="small-button" onClick={() => setFullscreen(false)} type="button">
            ✕ Exit Full Page
          </button>
        </div>
        <div className="lead-table-overlay-body container">
          {table}
        </div>
      </div>
    );
  }

  return (
    <div className="lead-table-wrap container">
      <div className="lead-table-toolbar">
        <button className="small-button lead-table-expand-btn" onClick={() => setFullscreen(true)} title="Full page" type="button">
          ⛶ Full Page
        </button>
      </div>
      {table}
    </div>
  );
}

function scoreClass(score: number): string {
  if (score >= 70) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function leadAge(value: string | undefined): string {
  if (!value) return "—";
  const ms = Date.now() - Date.parse(value);
  if (Number.isNaN(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(ms / 86400000);
  return `${days}d`;
}

function ageClass(value: string | undefined): string {
  if (!value) return "age-unknown";
  const hours = (Date.now() - Date.parse(value)) / 3600000;
  if (Number.isNaN(hours) || hours < 0) return "age-unknown";
  if (hours < 6) return "age-fresh";
  if (hours < 24) return "age-recent";
  if (hours < 72) return "age-aging";
  return "age-stale";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
