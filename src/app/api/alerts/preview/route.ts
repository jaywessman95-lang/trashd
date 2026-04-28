import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/guards";
import { buildDailySummaryEmail } from "@/lib/alerts/daily-summary";
import { listLeads } from "@/lib/leads/repository";

export async function GET() {
  const { response } = await requireSignedInUser();
  if (response) return response;

  const leads = await listLeads({ limit: 12 });
  const email = buildDailySummaryEmail(leads);

  return NextResponse.json(email);
}
