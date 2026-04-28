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
      <p className="muted">{lead.aiReason}</p>
      <LeadActions lead={lead} />
    </article>
  );
}
