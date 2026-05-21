"use client";

import { useState } from "react";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

type SortKey = "address" | "city" | "salePrice" | "vsAsk" | "soldDate" | "dom" | "sqft" | "yearBuilt" | "saleType" | "score" | "priority" | "agentName";
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
      case "address": cmp = a.address.localeCompare(b.address); break;
      case "city": cmp = a.city.localeCompare(b.city); break;
      case "salePrice": cmp = a.salePrice - b.salePrice; break;
      case "vsAsk": cmp = vsAsk(a) - vsAsk(b); break;
      case "soldDate": cmp = Date.parse(a.soldDate) - Date.parse(b.soldDate); break;
      case "dom": cmp = (a.daysOnMarket ?? 99) - (b.daysOnMarket ?? 99); break;
      case "sqft": cmp = (a.sqft ?? 0) - (b.sqft ?? 0); break;
      case "yearBuilt": cmp = (a.yearBuilt ?? 9999) - (b.yearBuilt ?? 9999); break;
      case "saleType": cmp = a.saleType.localeCompare(b.saleType); break;
      case "score": cmp = a.score - b.score; break;
      case "priority": cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0); break;
      case "agentName": cmp = (a.agentName ?? "").localeCompare(b.agentName ?? ""); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function vsAsk(home: SoldHomeLead): number {
  if (!home.listPrice || !home.salePrice) return 0;
  return ((home.salePrice - home.listPrice) / home.listPrice) * 100;
}

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
      <div className="lead-table-scroll">
        <table className="lead-table realtor-table">
          <thead>
            <tr>
              <Th col="address" active={sortKey === "address"} sortDir={sortDir} onSort={handleSort}>Address</Th>
              <Th col="city" active={sortKey === "city"} sortDir={sortDir} onSort={handleSort}>City</Th>
              <Th col="salePrice" active={sortKey === "salePrice"} sortDir={sortDir} onSort={handleSort}>Sale Price</Th>
              <Th col="vsAsk" active={sortKey === "vsAsk"} sortDir={sortDir} onSort={handleSort}>vs. Ask</Th>
              <Th col="soldDate" active={sortKey === "soldDate"} sortDir={sortDir} onSort={handleSort}>Sold</Th>
              <Th col="dom" active={sortKey === "dom"} sortDir={sortDir} onSort={handleSort}>DOM</Th>
              <th>Size</th>
              <Th col="sqft" active={sortKey === "sqft"} sortDir={sortDir} onSort={handleSort}>Sqft</Th>
              <Th col="yearBuilt" active={sortKey === "yearBuilt"} sortDir={sortDir} onSort={handleSort}>Yr Built</Th>
              <Th col="saleType" active={sortKey === "saleType"} sortDir={sortDir} onSort={handleSort}>Type</Th>
              <Th col="score" active={sortKey === "score"} sortDir={sortDir} onSort={handleSort}>Score</Th>
              <Th col="priority" active={sortKey === "priority"} sortDir={sortDir} onSort={handleSort}>Priority</Th>
              <Th col="agentName" active={sortKey === "agentName"} sortDir={sortDir} onSort={handleSort}>Agent</Th>
              <th>Phone</th>
              <th>Brokerage</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((home) => {
              const diff = home.listPrice ? vsAsk(home) : null;
              const daysAgoNum = Math.floor((Date.now() - Date.parse(home.soldDate)) / 86400000);
              return (
                <tr key={home.id}>
                  <td>
                    {home.listingUrl ? (
                      <a className="lead-table-title-link" href={home.listingUrl} rel="noreferrer" target="_blank">
                        <div className="lead-table-title">{home.address}</div>
                      </a>
                    ) : (
                      <div className="lead-table-title">{home.address}</div>
                    )}
                    <div className="lead-table-source">{home.zip ?? ""}</div>
                  </td>
                  <td className="lead-table-city">{home.city}</td>
                  <td className="lead-table-meta realtor-price">{formatPrice(home.salePrice)}</td>
                  <td className="lead-table-meta">
                    {diff !== null ? (
                      <span className={diff >= 0 ? "vs-ask-over" : "vs-ask-under"}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="lead-table-meta">
                    <div>{formatShortDate(home.soldDate)}</div>
                    <div className="lead-table-source">{daysAgoNum === 0 ? "today" : `${daysAgoNum}d ago`}</div>
                  </td>
                  <td className="lead-table-meta">{home.daysOnMarket != null ? `${home.daysOnMarket}d` : "—"}</td>
                  <td className="lead-table-meta">
                    {home.beds != null ? `${home.beds}bd` : ""}
                    {home.beds != null && home.baths != null ? " / " : ""}
                    {home.baths != null ? `${home.baths}ba` : ""}
                    {!home.beds && !home.baths ? "—" : ""}
                  </td>
                  <td className="lead-table-meta">{home.sqft != null ? home.sqft.toLocaleString() : "—"}</td>
                  <td className="lead-table-meta">{home.yearBuilt ?? "—"}</td>
                  <td>
                    <span className={`sale-type-badge sale-type-${home.saleType}`}>
                      {SALE_TYPE_LABEL[home.saleType] ?? home.saleType}
                    </span>
                    {home.cashSale ? <span className="cash-badge">Cash</span> : null}
                  </td>
                  <td>
                    <span className={`lead-table-score ${scoreClass(home.score)}`}>{home.score}</span>
                  </td>
                  <td>
                    <span className={`lead-table-priority priority-${home.priority}`}>
                      {formatTitle(home.priority)}
                    </span>
                  </td>
                  <td className="lead-table-meta">{home.agentName ?? "—"}</td>
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
                  <td className="lead-table-meta">{home.agentBrokerage ?? "—"}</td>
                  <td className="lead-table-meta realtor-source-badge">{home.source.replace("_", ".")}</td>
                  <td>
                    <button
                      className={`small-button copy-msg-btn${copied === `msg-${home.id}` ? " copied" : ""}`}
                      type="button"
                      onClick={() => copyMessage(home, `msg-${home.id}`)}
                    >
                      {copied === `msg-${home.id}` ? "✓ Copied" : "Copy Pitch"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!homes.length ? (
              <tr>
                <td className="lead-table-empty" colSpan={17}>No listings match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
