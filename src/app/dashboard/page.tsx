import { AdminEmailQueue } from "@/components/admin-email-queue";
import { AdminOnboardingStats } from "@/components/admin-onboarding-stats";
import { AppShell } from "@/components/app-shell";
import { DashboardStat } from "@/components/dashboard-stat";
import { LeadCard } from "@/components/lead-card";
import { getLeadStats, listLeads } from "@/lib/leads/repository";
import { getCurrentUser } from "@/lib/supabase/server";

const ADMIN_EMAIL = "conexer@gmail.com";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, leads, user] = await Promise.all([getLeadStats(), listLeads({ limit: 6 }), getCurrentUser()]);
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AppShell>
      <section className="container hero">
        <h1>Today&apos;s best leads</h1>
        <div className="grid">
          <DashboardStat label="New leads today" value={String(stats.newToday)} />
          <DashboardStat label="Hot leads" value={String(stats.hotLeads)} />
          <DashboardStat label="Large jobs" value={String(stats.largeJobs)} />
        </div>
      </section>

      {isAdmin && <AdminOnboardingStats />}
      {isAdmin && <AdminEmailQueue />}

      <section className="container grid" aria-label="Lead list">
        {leads.map((lead) => (
          <LeadCard key={lead.title} lead={lead} />
        ))}
      </section>
    </AppShell>
  );
}
