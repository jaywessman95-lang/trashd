import { env } from "@/lib/env";
import { sendLeadAlert } from "@/lib/integrations/gmail";
import { buildOutreachMessage } from "@/lib/messaging/templates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { DisplayLead } from "@/lib/sample-data";
import type { JobSize, LeadPriority, LeadType, SourceId } from "@/lib/types";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

export type InstantAlertResult = {
  checkedLeads: number;
  sent: number;
  skippedReason?: string;
};

export async function sendInstantHotLeadAlerts(): Promise<InstantAlertResult> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { checkedLeads: 0, sent: 0, skippedReason: "Missing Supabase service credentials." };
  }

  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN || !env.GMAIL_FROM_EMAIL) {
    return { checkedLeads: 0, sent: 0, skippedReason: "Missing Gmail credentials." };
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ data: leads, error: leadsError }, { data: settings, error: settingsError }, usersResult] = await Promise.all([
    supabase.from("leads").select("*").gte("created_at", since).gte("score", 80),
    supabase.from("user_settings").select("*"),
    supabase.auth.admin.listUsers()
  ]);

  if (leadsError) throw leadsError;
  if (settingsError) throw settingsError;
  if (usersResult.error) throw usersResult.error;

  let sent = 0;

  for (const lead of leads) {
    const displayLead = mapLeadRow(lead);

    for (const setting of settings) {
      if (!matchesUserSettings(lead, setting)) {
        continue;
      }

      const user = usersResult.data.users.find((item) => item.id === setting.user_id);

      if (!user?.email) {
        continue;
      }

      const { data: existingAlert, error: existingAlertError } = await supabase
        .from("alerts")
        .select("id")
        .eq("user_id", setting.user_id)
        .eq("lead_id", lead.id)
        .eq("alert_type", "instant_hot_lead")
        .limit(1)
        .maybeSingle();

      if (existingAlertError) throw existingAlertError;
      if (existingAlert) {
        continue;
      }

      const subject = `HOT Lead Score ${lead.score}`;
      const text = [
        `${lead.source} - ${lead.city ?? "Unknown city"}`,
        lead.title,
        lead.ai_reason ?? "",
        "",
        buildOutreachMessage(displayLead),
        "",
        lead.url
      ].join("\n");

      try {
        await sendLeadAlert({ to: user.email, subject, text });
        sent += 1;
        await supabase.from("alerts").insert({
          user_id: setting.user_id,
          lead_id: lead.id,
          alert_type: "instant_hot_lead",
          status: "sent",
          subject,
          body: text,
          sent_at: new Date().toISOString()
        });
      } catch (error) {
        await supabase.from("alerts").insert({
          user_id: setting.user_id,
          lead_id: lead.id,
          alert_type: "instant_hot_lead",
          status: "failed",
          subject,
          body: error instanceof Error ? error.message : "Unknown alert failure"
        });
      }
    }
  }

  return { checkedLeads: leads.length, sent };
}

function matchesUserSettings(lead: LeadRow, settings: SettingsRow): boolean {
  if (!settings.enabled_sources.includes(lead.source)) return false;
  if (lead.score < settings.instant_alert_threshold) return false;
  if (settings.cities.length && lead.city && !settings.cities.some((city) => city.toLowerCase() === lead.city?.toLowerCase())) return false;
  if (settings.lead_types.length && !settings.lead_types.includes(lead.lead_type)) return false;
  return true;
}

function mapLeadRow(row: LeadRow): DisplayLead {
  return {
    id: row.id,
    source: row.source as SourceId,
    title: row.title,
    description: row.description ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    url: row.url,
    price: row.price ?? undefined,
    imageCount: row.image_count,
    eventStart: row.event_start ?? undefined,
    eventEnd: row.event_end ?? undefined,
    postedAt: row.posted_at ?? undefined,
    rawData: {},
    score: row.score,
    priority: row.priority as LeadPriority,
    jobSize: row.job_size as JobSize,
    leadType: row.lead_type as LeadType,
    aiReason: row.ai_reason ?? "Hot lead matched your alert settings.",
    scoringVersion: row.scoring_version ?? "unknown"
  };
}
