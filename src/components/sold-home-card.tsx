import type { SoldHomeLead } from "@/lib/sold-homes/types";

type SoldHomeCardProps = {
  home: SoldHomeLead;
};

export function SoldHomeCard({ home }: SoldHomeCardProps) {
  return (
    <article className="card sold-home-card">
      <div className="lead-card-header">
        <div>
          <strong>{home.address}</strong>
          <div className="muted">
            {home.city}, {home.state} {home.zip ?? ""}
          </div>
        </div>
        <div className="score">{home.score}</div>
      </div>

      <div className="sold-home-price">{formatPrice(home.salePrice)}</div>

      <div className="lead-meta" aria-label="Property details">
        <span>{formatTitle(home.propertyType)}</span>
        {home.beds != null ? <span>{home.beds} bd</span> : null}
        {home.baths != null ? <span>{home.baths} ba</span> : null}
        {home.sqft != null ? <span>{home.sqft.toLocaleString()} sqft</span> : null}
        {home.daysOnMarket != null ? <span>{home.daysOnMarket} DOM</span> : null}
        <span>Sold {formatDate(home.soldDate)}</span>
        <span className={`priority-badge priority-${home.priority}`}>{formatTitle(home.priority)}</span>
      </div>

      {home.listingUrl ? (
        <div className="lead-actions">
          <a className="small-button" href={home.listingUrl} rel="noopener noreferrer" target="_blank">
            View Listing
          </a>
        </div>
      ) : null}
    </article>
  );
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
