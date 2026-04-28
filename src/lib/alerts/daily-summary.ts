import { buildOutreachMessage } from "@/lib/messaging/templates";
import type { DisplayLead } from "@/lib/sample-data";

export function buildDailySummaryEmail(leads: DisplayLead[]) {
  const hotLeads = leads.filter((lead) => lead.score >= 90);
  const largeJobs = leads.filter((lead) => lead.jobSize === "large");
  const cities = Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean))).slice(0, 6);
  const subject = `${leads.length} New Junk Removal Leads Today`;
  const topLeads = leads
    .slice(0, 5)
    .map((lead) => {
      return [
        `${lead.score} - ${lead.source} - ${lead.city ?? "Unknown city"}`,
        lead.title,
        lead.aiReason,
        buildOutreachMessage(lead),
        lead.url
      ].join("\n");
    })
    .join("\n\n");

  return {
    subject,
    text: [
      `${hotLeads.length} Hot Leads`,
      `${largeJobs.length} Large Jobs`,
      cities.length ? `Cities: ${cities.join(", ")}` : "Cities: none yet",
      "",
      "Top leads:",
      topLeads || "No leads found yet."
    ].join("\n")
  };
}
