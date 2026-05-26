"use client";

import { useState } from "react";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

const PRIORITY_LABEL: Record<string, string> = {
  hot_now: "Hot Now",
  strong: "Strong",
  good: "Good",
};

function avatarInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#be185d",
  "#065f46", "#1e40af", "#6d28d9", "#92400e", "#9d174d",
];

function avatarColor(name: string | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - Date.parse(dateStr)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function pitchMessage(home: SoldHomeLead): string {
  const first = home.agentName?.split(" ")[0] ?? "there";
  return `Hi ${first}, I noticed you recently sold ${home.address} in ${home.city}. I run a junk removal service in Orange County and work with many agents on post-sale cleanouts and estate clear-outs. Happy to give your clients a fast, free quote. Would love to be your go-to cleanout vendor!`;
}

function introEmail(home: SoldHomeLead): string {
  const first = home.agentName?.split(" ")[0] ?? "there";
  const subject = `Quick intro — post-sale cleanout partner for your listings`;
  const body =
    `Hi ${first},\n\n` +
    `Congratulations on your recent sale at ${home.address} in ${home.city}!\n\n` +
    `My name is [Your Name] and I run a junk removal and cleanout service in Orange County. I specialize in helping real estate agents take care of post-sale cleanouts, estate clear-outs, and pre-listing staging clean-ups — fast, affordable, and reliable.\n\n` +
    `I'd love to be your go-to vendor whenever your clients need a cleanout. Happy to provide a free, same-day quote.\n\n` +
    `Best,\n[Your Name]\n[Your Phone]`;
  return `Subject: ${subject}\n\n${body}`;
}

type Props = {
  home: SoldHomeLead;
};

export function RealtorCard({ home }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const bg = avatarColor(home.agentName);
  const initials = avatarInitials(home.agentName);

  return (
    <div className="realtor-card">
      <div className="realtor-card-header">
        <div className="realtor-avatar-wrap">
          {home.agentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="realtor-avatar realtor-avatar-img" src={home.agentImageUrl} alt={home.agentName ?? "Agent"} />
          ) : (
            <div className="realtor-avatar realtor-avatar-initials" style={{ background: bg }}>
              {initials}
            </div>
          )}
          <span className={home.agentProfileStatus === "verified" ? "verified-badge" : "unverified-badge"}>
            {home.agentProfileStatus === "verified" ? "Verified" : "Unverified"}
          </span>
        </div>

        <div className="realtor-card-identity">
          <div className="realtor-card-name">{home.agentName ?? "Unknown Agent"}</div>
          {home.agentBrokerage && (
            <div className="realtor-card-brokerage">{home.agentBrokerage}</div>
          )}
          <div className="realtor-card-badges">
            <span className={`lead-table-priority priority-${home.priority}`}>
              {PRIORITY_LABEL[home.priority] ?? home.priority}
            </span>
            <span className={`lead-table-score ${home.score >= 70 ? "score-high" : home.score >= 40 ? "score-mid" : "score-low"}`}>
              {home.score}
            </span>
          </div>
        </div>
      </div>

      <div className="realtor-card-contact">
        {home.agentPhone ? (
          <div className="realtor-contact-row">
            <a className="realtor-contact-link" href={`tel:${home.agentPhone.replace(/\D/g, "")}`}>
              {home.agentPhone}
            </a>
            <button
              className="copy-btn"
              type="button"
              title="Copy phone"
              onClick={() => copy(home.agentPhone!, `phone-${home.id}`)}
            >
              {copied === `phone-${home.id}` ? "✓" : "⎘"}
            </button>
          </div>
        ) : (
          <span className="no-contact">No phone</span>
        )}
        {home.agentEmail ? (
          <div className="realtor-contact-row">
            <a className="realtor-contact-link realtor-email-link" href={`mailto:${home.agentEmail}`}>
              {home.agentEmail}
            </a>
            <button
              className="copy-btn"
              type="button"
              title="Copy email"
              onClick={() => copy(home.agentEmail!, `email-${home.id}`)}
            >
              {copied === `email-${home.id}` ? "✓" : "⎘"}
            </button>
          </div>
        ) : (
          <span className="no-contact">No email</span>
        )}
      </div>

      {!home.contactOnly && home.salePrice > 0 && (
        <div className="realtor-card-listing">
          <div className="realtor-listing-address">
            {home.listingUrl ? (
              <a href={home.listingUrl} target="_blank" rel="noreferrer">{home.address}</a>
            ) : (
              home.address
            )}
          </div>
          <div className="realtor-listing-meta">
            <span>{home.city}{home.zip ? `, ${home.zip}` : ""}</span>
            <span className="realtor-dot">·</span>
            <span>{daysAgo(home.soldDate)}</span>
            <span className="realtor-dot">·</span>
            <span className="realtor-listing-price">{formatPrice(home.salePrice)}</span>
          </div>
        </div>
      )}
      {home.contactOnly && (
        <div className="realtor-card-listing">
          <div className="realtor-listing-meta">
            <span className="contact-only-tag">Contact Only</span>
            <span className="realtor-dot">·</span>
            <span>Scraped {daysAgo(home.scrapedAt ?? home.soldDate)}</span>
          </div>
        </div>
      )}

      <div className="realtor-card-actions">
        <button
          className={`small-button${copied === `pitch-${home.id}` ? " copied" : ""}`}
          type="button"
          onClick={() => copy(pitchMessage(home), `pitch-${home.id}`)}
        >
          {copied === `pitch-${home.id}` ? "✓ Copied" : "Copy Pitch"}
        </button>
        {home.agentEmail && (
          <button
            className={`small-button${copied === `email-body-${home.id}` ? " copied" : ""}`}
            type="button"
            onClick={() => copy(introEmail(home), `email-body-${home.id}`)}
          >
            {copied === `email-body-${home.id}` ? "✓ Copied" : "Copy Intro Email"}
          </button>
        )}
      </div>
    </div>
  );
}
