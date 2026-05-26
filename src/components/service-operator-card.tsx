"use client";

import { useState } from "react";
import type { ServiceOperator } from "@/lib/service-operators/types";

const PRIORITY_LABEL: Record<string, string> = {
  hot_now: "Hot Now",
  strong: "Strong",
  good: "Good",
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  junk_removal: "Junk Removal",
  movers: "Movers",
  both: "Junk + Movers",
};

const AVATAR_COLORS = [
  "#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#be185d",
  "#065f46", "#1e40af", "#6d28d9", "#92400e", "#9d174d",
];

function avatarColor(name: string | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function avatarInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function daysAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - Date.parse(dateStr)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function referralPitch(op: ServiceOperator): string {
  const company = op.company ?? "this service provider";
  const type = SERVICE_TYPE_LABEL[op.serviceType] ?? op.serviceType;
  const city = op.city ?? "your area";
  const contact = op.phone ?? op.email ?? "them directly";
  return `Hey! I have a great ${type} company I refer clients to — ${company} out of ${city}. They're reliable and affordable. You can reach them at ${contact}.`;
}

type Props = { operator: ServiceOperator };

export function ServiceOperatorCard({ operator: op }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const bg = avatarColor(op.company);
  const initials = avatarInitials(op.company);

  return (
    <div className="realtor-card operator-card">
      <div className="realtor-card-header">
        <div className="realtor-avatar-wrap">
          <div className="realtor-avatar realtor-avatar-initials" style={{ background: bg }}>
            {initials}
          </div>
          <span className="unverified-badge">Unverified</span>
        </div>

        <div className="realtor-card-identity">
          <div className="realtor-card-name">{op.company ?? "Unknown Company"}</div>
          {op.city && (
            <div className="realtor-card-brokerage">{op.city}{op.state ? `, ${op.state}` : ""}</div>
          )}
          <div className="realtor-card-badges">
            <span className={`operator-service-badge service-type-${op.serviceType}`}>
              {SERVICE_TYPE_LABEL[op.serviceType] ?? op.serviceType}
            </span>
            <span className={`lead-table-priority priority-${op.priority}`}>
              {PRIORITY_LABEL[op.priority] ?? op.priority}
            </span>
            <span className={`lead-table-score ${op.score >= 70 ? "score-high" : op.score >= 45 ? "score-mid" : "score-low"}`}>
              {op.score}
            </span>
          </div>
        </div>
      </div>

      <div className="realtor-card-contact">
        {op.phone ? (
          <div className="realtor-contact-row">
            <a className="realtor-contact-link" href={`tel:${op.phone.replace(/\D/g, "")}`}>
              {op.phone}
            </a>
            <button
              className="copy-btn"
              type="button"
              title="Copy phone"
              onClick={() => copy(op.phone!, `phone-${op.id}`)}
            >
              {copied === `phone-${op.id}` ? "✓" : "⎘"}
            </button>
          </div>
        ) : (
          <span className="no-contact">No phone</span>
        )}
        {op.email ? (
          <div className="realtor-contact-row">
            <a className="realtor-contact-link realtor-email-link" href={`mailto:${op.email}`}>
              {op.email}
            </a>
            <button
              className="copy-btn"
              type="button"
              title="Copy email"
              onClick={() => copy(op.email!, `email-${op.id}`)}
            >
              {copied === `email-${op.id}` ? "✓" : "⎘"}
            </button>
          </div>
        ) : (
          <span className="no-contact">No email</span>
        )}
      </div>

      {op.address && (
        <div className="realtor-card-listing">
          <div className="realtor-listing-address">{op.address}</div>
          {op.zip && <div className="realtor-listing-meta"><span>{op.zip}</span></div>}
        </div>
      )}

      <div className="realtor-card-listing operator-card-meta">
        <div className="realtor-listing-meta">
          <span className="operator-source-tag">{op.source.replace(/_/g, " ")}</span>
          {op.scrapedAt && (
            <>
              <span className="realtor-dot">·</span>
              <span>Scraped {daysAgo(op.scrapedAt)}</span>
            </>
          )}
        </div>
      </div>

      <div className="realtor-card-actions">
        <button
          className={`small-button${copied === `pitch-${op.id}` ? " copied" : ""}`}
          type="button"
          onClick={() => copy(referralPitch(op), `pitch-${op.id}`)}
        >
          {copied === `pitch-${op.id}` ? "✓ Copied" : "Copy Referral"}
        </button>
        {op.websiteUrl && (
          <a
            className="small-button"
            href={op.websiteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Website
          </a>
        )}
      </div>
    </div>
  );
}
