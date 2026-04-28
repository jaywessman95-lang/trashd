import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Missing CRON_SECRET." }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ runs: [], sourceStats: [] });
  }

  const supabase = createSupabaseAdminClient();
  const [runsResult, leadsResult] = await Promise.all([
    supabase.from("scrape_runs").select("*").order("started_at", { ascending: false }).limit(25),
    supabase.from("leads").select("source,score,priority,job_size")
  ]);

  if (runsResult.error) {
    return NextResponse.json({ error: runsResult.error.message }, { status: 500 });
  }

  if (leadsResult.error) {
    return NextResponse.json({ error: leadsResult.error.message }, { status: 500 });
  }

  const sourceStats = Object.values(
    leadsResult.data.reduce<Record<string, { source: string; leads: number; hot: number; large: number; averageScore: number }>>((acc, lead) => {
      acc[lead.source] ??= { source: lead.source, leads: 0, hot: 0, large: 0, averageScore: 0 };
      acc[lead.source].leads += 1;
      acc[lead.source].hot += lead.priority === "hot_now" ? 1 : 0;
      acc[lead.source].large += lead.job_size === "large" ? 1 : 0;
      acc[lead.source].averageScore += lead.score;
      return acc;
    }, {})
  ).map((stat) => ({
    ...stat,
    averageScore: Math.round(stat.averageScore / stat.leads)
  }));

  return NextResponse.json({ runs: runsResult.data, sourceStats });
}
