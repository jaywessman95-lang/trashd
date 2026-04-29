import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { env } from "@/lib/env";
import { getLeadStats } from "@/lib/leads/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getCurrentUser } from "@/lib/supabase/server";

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type ScrapeRunRow = Database["public"]["Tables"]["scrape_runs"]["Row"];

type AccountOverview = {
  settings: UserSettingsRow | null;
  contactedCount: number;
  bookedCount: number;
  dismissedCount: number;
  sentAlerts: number;
  latestScrapeRun: ScrapeRunRow | null;
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  const [stats, overview] = await Promise.all([getLeadStats(), getAccountOverview(user?.id)]);
  const createdAt = user?.created_at ? formatDate(user.created_at) : "Not available";
  const lastSignIn = user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Not available";
  const email = user?.email ?? "Not available";

  return (
    <AppShell>
      <section className="container hero compact-hero">
        <h1>Account</h1>
        <p>Review your workspace profile, territory coverage, lead activity, alert setup, and account security.</p>
      </section>

      <section className="container account-layout" aria-label="Account overview">
        <article className="card account-panel account-profile">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>{email}</h2>
            <p className="muted">Trashd lead intelligence account</p>
          </div>
          <div className="account-actions">
            <Link className="small-button" href="/settings">
              Edit Settings
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="small-button" type="submit">
                Log Out
              </button>
            </form>
          </div>
        </article>

        <section className="account-stat-grid" aria-label="Lead stats">
          <AccountStat label="New leads today" value={String(stats.newToday)} />
          <AccountStat label="Hot leads" value={String(stats.hotLeads)} />
          <AccountStat label="Large jobs" value={String(stats.largeJobs)} />
          <AccountStat label="Sent alerts" value={String(overview.sentAlerts)} />
        </section>

        <article className="card account-panel">
          <h2>Profile</h2>
          <dl className="detail-list">
            <Detail label="Email" value={email} />
            <Detail label="Account created" value={createdAt} />
            <Detail label="Last sign in" value={lastSignIn} />
            <Detail label="User ID" value={user?.id ?? "Not available"} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Territory</h2>
          <dl className="detail-list">
            <Detail label="Cities" value={formatList(overview.settings?.cities)} />
            <Detail label="Radius" value={overview.settings ? `${overview.settings.radius} miles` : "Not configured"} />
            <Detail label="Enabled sources" value={formatList(overview.settings?.enabled_sources)} />
            <Detail label="Lead types" value={formatList(overview.settings?.lead_types)} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Lead Preferences</h2>
          <dl className="detail-list">
            <Detail label="Minimum score" value={String(overview.settings?.min_score ?? "Not configured")} />
            <Detail label="Minimum job size" value={formatTitle(overview.settings?.min_job_size)} />
            <Detail label="Daily lead limit" value={String(overview.settings?.max_leads_per_day ?? "Not configured")} />
            <Detail label="Hide duplicates" value={overview.settings?.hide_duplicates ? "Enabled" : "Not enabled"} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Scrape Coverage</h2>
          <dl className="detail-list">
            <Detail label="Coverage level" value={formatTitle(overview.settings?.scrape_coverage)} />
            <Detail
              label="Max listings/source"
              value={formatOptionalNumber(overview.settings?.max_listings_per_source)}
            />
            <Detail label="Max pages/source" value={formatOptionalNumber(overview.settings?.max_pages_per_source)} />
            <Detail label="Lookback hours" value={formatOptionalNumber(overview.settings?.lookback_hours)} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Alerts</h2>
          <dl className="detail-list">
            <Detail label="Urgency" value={formatTitle(overview.settings?.urgency_preference)} />
            <Detail
              label="Instant threshold"
              value={overview.settings ? `${overview.settings.instant_alert_threshold}+` : "Not configured"}
            />
            <Detail label="Sent alerts" value={String(overview.sentAlerts)} />
            <Detail label="Latest scrape" value={formatScrapeRun(overview.latestScrapeRun)} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Pipeline Activity</h2>
          <dl className="detail-list">
            <Detail label="Contacted leads" value={String(overview.contactedCount)} />
            <Detail label="Booked leads" value={String(overview.bookedCount)} />
            <Detail label="Dismissed leads" value={String(overview.dismissedCount)} />
            <Detail label="Last settings update" value={formatDate(overview.settings?.updated_at)} />
          </dl>
        </article>

        <article className="card account-panel">
          <h2>Billing</h2>
          <p className="muted">Billing details are hidden while pricing and plan access are being finalized.</p>
        </article>
      </section>
    </AppShell>
  );
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="card metric account-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function getAccountOverview(userId?: string): Promise<AccountOverview> {
  if (!userId || !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      settings: null,
      contactedCount: 0,
      bookedCount: 0,
      dismissedCount: 0,
      sentAlerts: 0,
      latestScrapeRun: null
    };
  }

  const supabase = createSupabaseAdminClient();
  const [settingsResult, contactedResult, bookedResult, dismissedResult, alertsResult, scrapeRunsResult] =
    await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("lead_actions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("contacted", true),
      supabase.from("lead_actions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("booked", true),
      supabase.from("lead_actions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("dismissed", true),
      supabase.from("alerts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "sent"),
      supabase.from("scrape_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle()
    ]);

  return {
    settings: settingsResult.data ?? null,
    contactedCount: contactedResult.count ?? 0,
    bookedCount: bookedResult.count ?? 0,
    dismissedCount: dismissedResult.count ?? 0,
    sentAlerts: alertsResult.count ?? 0,
    latestScrapeRun: scrapeRunsResult.data ?? null
  };
}

function formatList(value?: string[] | null) {
  return value?.length ? value.map(formatTitle).join(", ") : "Not configured";
}

function formatTitle(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not configured";
}

function formatOptionalNumber(value?: number | null) {
  return typeof value === "number" ? String(value) : "Preset default";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatScrapeRun(run: ScrapeRunRow | null) {
  if (!run) {
    return "Not available";
  }

  return `${formatTitle(run.source)} ${run.status} on ${formatDate(run.started_at)}`;
}
