import { NextResponse } from "next/server";
import { buildDailySummaryEmail } from "@/lib/alerts/daily-summary";
import { sendLeadAlert } from "@/lib/integrations/gmail";
import { listLeads } from "@/lib/leads/repository";
import { getCurrentUser } from "@/lib/supabase/server";

export async function POST() {
  const user = await getCurrentUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Log in before sending a test alert." }, { status: 401 });
  }

  const leads = await listLeads({ limit: 12 });
  const email = buildDailySummaryEmail(leads);
  await sendLeadAlert({
    to: user.email,
    subject: email.subject,
    text: email.text
  });

  return NextResponse.json({ ok: true });
}
