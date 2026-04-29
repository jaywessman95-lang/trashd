import { LeadActions } from "@/components/lead-actions";
import type { DisplayLead } from "@/lib/sample-data";

type LeadCardProps = {
  lead: DisplayLead;
};

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <article className="card lead-card">
      <div className="lead-card-header">
        <div>
          <strong>{lead.title}</strong>
          <div className="muted">
            {lead.source} - {lead.city ?? "Unknown city"}
          </div>
        </div>
        <div className="score">{lead.score}</div>
      </div>
      <div className="lead-meta" aria-label="Lead details">
        <span>{formatTitle(lead.priority)}</span>
        <span>{formatTitle(lead.jobSize)} job</span>
        <span>{formatTitle(lead.leadType)}</span>
        {lead.eventEnd ? <span>Ends {formatDate(lead.eventEnd)}</span> : null}
        {lead.postedAt ? <span>Posted {formatDate(lead.postedAt)}</span> : null}
        {lead.firstSeenAt ? <span>Found {formatDate(lead.firstSeenAt)}</span> : null}
        {lead.imageCount ? <span>{lead.imageCount} photos</span> : null}
        {lead.price ? <span>{lead.price}</span> : null}
      </div>
      <p className="muted">{lead.aiReason}</p>
      <LeadActions lead={lead} />
    </article>
  );
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
