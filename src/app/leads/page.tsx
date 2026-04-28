import { AppShell } from "@/components/app-shell";
import { LeadCard } from "@/components/lead-card";
import { listLeads } from "@/lib/leads/repository";

export default async function LeadsPage() {
  const leads = await listLeads({ limit: 50 });

  return (
    <AppShell>
      <section className="container hero">
        <h1>Leads</h1>
        <p>Qualified opportunities will appear here after scraping, normalization, scoring, and user filtering.</p>
      </section>
      <section className="container grid" aria-label="Lead list">
        {leads.map((lead) => (
          <LeadCard key={`${lead.source}-${lead.title}`} lead={lead} />
        ))}
      </section>
    </AppShell>
  );
}
