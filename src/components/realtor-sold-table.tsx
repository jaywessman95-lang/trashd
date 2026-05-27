"use client";

import { useState } from "react";
import type { SoldHomeLead } from "@/lib/sold-homes/types";
import { RealtorCard } from "@/components/realtor-card";

type SortKey = "priority" | "score" | "saleType" | "agentName" | "address" | "city" | "salePrice" | "soldDate" | "agentBrokerage" | "scrapedAt" | "bedrooms";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { hot_now: 3, strong: 2, good: 1 };
const SALE_TYPE_LABEL: Record<string, string> = {
  estate: "Estate",
  trust: "Trust",
  as_is: "As-Is",
  foreclosure: "Foreclosure",
  investor: "Investor",
  standard: "Standard"
};

function sortHomes(homes: SoldHomeLead[], key: SortKey, dir: SortDir): SoldHomeLead[] {
  return [...homes].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "priority":     cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0); break;
      case "score":        cmp = a.score - b.score; break;
      case "saleType":     cmp = a.saleType.localeCompare(b.saleType); break;
      case "agentName":    cmp = (a.agentName ?? "").localeCompare(b.agentName ?? ""); break;
      case "address":      cmp = a.address.localeCompare(b.address); break;
      case "city":         cmp = a.city.localeCompare(b.city); break;
      case "salePrice":    cmp = a.salePrice - b.salePrice; break;
      case "soldDate":     cmp = Date.parse(a.soldDate) - Date.parse(b.soldDate); break;
      case "agentBrokerage": cmp = (a.agentBrokerage ?? "").localeCompare(b.agentBrokerage ?? ""); break;
      case "scrapedAt":     cmp = Date.parse(a.scrapedAt ?? "0") - Date.parse(b.scrapedAt ?? "0"); break;
      case "bedrooms":      cmp = (a.bedrooms ?? 0) - (b.bedrooms ?? 0); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

/** Parse a date string as local midnight to avoid UTC timezone offset on date-only values. */
function parseDateLocal(dateStr: string): Date {
  const d = dateStr.slice(0, 10);
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function daysAgoLabel(dateStr: string): string {
  const dt = parseDateLocal(dateStr);
  const days = Math.floor((Date.now() - dt.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function dateLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parseDateLocal(dateStr));
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

type ViewMode = "cards" | "table";

type Props = { homes: SoldHomeLead[] };

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

export function RealtorSoldTable({ homes }: Props) {
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

  function copyMessage(home: SoldHomeLead, id: string) {
    const msg = `Hi ${home.agentName?.split(" ")[0] ?? "there"}, I noticed you recently sold ${home.address} in ${home.city}. I run a junk removal service in Orange County and work with many agents on post-sale cleanouts and estate clear-outs. Happy to give your clients a fast, free quote. Would love to be your go-to cleanout vendor!`;
    copyText(msg, id);
  }

  const sorted = sortHomes(homes, sortKey, sortDir);

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
          {sorted.map((home) => <RealtorCard key={home.id} home={home} />)}
          {!homes.length && (
            <p className="realtor-cards-empty">No listings match these filters.</p>
          )}
        </div>
      ) : (
      <div className="lead-table-scroll">
        <table className="lead-table realtor-table">
          <thead>
            <tr>
              <Th col="priority"       active={sortKey === "priority"}       sortDir={sortDir} onSort={handleSort}>Priority</Th>
              <Th col="score"          active={sortKey === "score"}          sortDir={sortDir} onSort={handleSort}>Score</Th>
              <Th col="soldDate"       active={sortKey === "soldDate"}       sortDir={sortDir} onSort={handleSort}>Sold</Th>
              <Th col="city"           active={sortKey === "city"}           sortDir={sortDir} onSort={handleSort}>City</Th>
              <th>Phone</th>
              <th>Email</th>
              <Th col="address"        active={sortKey === "address"}        sortDir={sortDir} onSort={handleSort}>Address</Th>
              <Th col="saleType"       active={sortKey === "saleType"}       sortDir={sortDir} onSort={handleSort}>Type</Th>
              <Th col="bedrooms"       active={sortKey === "bedrooms"}       sortDir={sortDir} onSort={handleSort}>Beds</Th>
              <Th col="agentName"      active={sortKey === "agentName"}      sortDir={sortDir} onSort={handleSort}>Agent</Th>
              <Th col="salePrice"      active={sortKey === "salePrice"}      sortDir={sortDir} onSort={handleSort}>Sale Price</Th>
              <Th col="agentBrokerage" active={sortKey === "agentBrokerage"} sortDir={sortDir} onSort={handleSort}>Brokerage</Th>
              <th></th>
              <Th col="scrapedAt"      active={sortKey === "scrapedAt"}      sortDir={sortDir} onSort={handleSort}>Scraped</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((home) => {
              const soldAgo = home.contactOnly ? "—" : daysAgoLabel(home.soldDate);
              const soldDate = home.contactOnly ? "" : dateLabel(home.soldDate);
              const scrapeAgo = home.scrapedAt ? timeAgo(home.scrapedAt) : "—";
              const scrapeDt = home.scrapedAt ? new Date(home.scrapedAt) : null;
              const scrapeDateStr = scrapeDt
                ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(scrapeDt)
                : "";
              const address = home.address?.trim() || "";
              return (
                <tr key={home.id}>
                  <td>
                    <span className={`lead-table-priority priority-${home.priority}`}>
                      {formatTitle(home.priority)}
                    </span>
                  </td>
                  <td>
                    <span className={`lead-table-score ${scoreClass(home.score)}`}>{home.score}</span>
                  </td>
                  <td className="sold-time-cell">
                    {home.contactOnly ? (
                      <span className="no-contact">—</span>
                    ) : (
                      <>
                        <span className="sold-time-ago">{soldAgo}</span>
                        <span className="sold-time-date">{soldDate}</span>
                      </>
                    )}
                  </td>
                  <td className="lead-table-city">{home.city}</td>
                  <td>
                    {home.agentPhone ? (
                      <div className="phone-cell">
                        <a className="phone-link" href={`tel:${home.agentPhone.replace(/\D/g, "")}`}>
                          {home.agentPhone}
                        </a>
                        <button
                          className="copy-btn"
                          title="Copy phone"
                          type="button"
                          onClick={() => copyText(home.agentPhone!, `phone-${home.id}`)}
                        >
                          {copied === `phone-${home.id}` ? "✓" : "⎘"}
                        </button>
                      </div>
                    ) : <span className="no-contact">No phone</span>}
                  </td>
                  <td>
                    {home.agentEmail ? (
                      <div className="phone-cell">
                        <a className="phone-link" href={`mailto:${home.agentEmail}`}>
                          {home.agentEmail}
                        </a>
                        <button
                          className="copy-btn"
                          title="Copy email"
                          type="button"
                          onClick={() => copyText(home.agentEmail!, `email-${home.id}`)}
                        >
                          {copied === `email-${home.id}` ? "✓" : "⎘"}
                        </button>
                      </div>
                    ) : <span className="no-contact">No email</span>}
                  </td>
                  <td>
                    {home.contactOnly ? (
                      <span className="contact-only-tag">Contact Only</span>
                    ) : address ? (
                      home.listingUrl ? (
                        <a className="lead-table-title-link" href={home.listingUrl} rel="noreferrer" target="_blank">
                          <div className="lead-table-title">{address}</div>
                        </a>
                      ) : (
                        <div className="lead-table-title">{address}</div>
                      )
                    ) : (
                      <span className="no-contact">—</span>
                    )}
                    {!home.contactOnly && address && <div className="lead-table-source">{home.zip ?? ""}</div>}
                  </td>
                  <td>
                    <span className={`sale-type-badge sale-type-${home.saleType}`}>
                      {SALE_TYPE_LABEL[home.saleType] ?? home.saleType}
                    </span>
                    {home.cashSale ? <span className="cash-badge">Cash</span> : null}
                  </td>
                  <td className="lead-table-meta lead-table-beds">
                    {home.bedrooms != null ? home.bedrooms : "—"}
                  </td>
                  <td className="lead-table-meta">{home.agentName ?? "—"}</td>
                  <td className="lead-table-meta realtor-price">{home.contactOnly || home.salePrice === 0 ? "—" : formatPrice(home.salePrice)}</td>
                  <td className="lead-table-meta lead-table-brokerage" title={home.agentBrokerage ?? undefined}>
                    <span className="brokerage-truncate">{home.agentBrokerage ?? "—"}</span>
                  </td>
                  <td>
                    <button
                      className={`small-button copy-msg-btn${copied === `msg-${home.id}` ? " copied" : ""}`}
                      type="button"
                      onClick={() => copyMessage(home, `msg-${home.id}`)}
                    >
                      {copied === `msg-${home.id}` ? "✓ Copied" : "Copy Pitch"}
                    </button>
                  </td>
                  <td className="sold-time-cell">
                    {scrapeDt ? (
                      <>
                        <span className="sold-time-ago">{scrapeAgo}</span>
                        <span className="sold-time-date">{scrapeDateStr}</span>
                      </>
                    ) : <span className="no-contact">—</span>}
                  </td>
                </tr>
              );
            })}
            {!homes.length ? (
              <tr>
                <td className="lead-table-empty" colSpan={14}>No listings match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function scoreClass(score: number) {
  if (score >= 70) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
