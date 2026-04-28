import { NextResponse } from "next/server";
import { userSettingsSchema } from "@/lib/validation/settings";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = userSettingsSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        cities: input.cities,
        radius: input.radius,
        min_score: input.minScore,
        min_job_size: input.minJobSize,
        enabled_sources: input.enabledSources,
        urgency_preference: input.urgencyPreference,
        lead_types: input.leadTypes,
        included_keywords: input.includedKeywords,
        excluded_keywords: input.excludedKeywords,
        max_leads_per_day: input.maxLeadsPerDay,
        instant_alert_threshold: input.instantAlertThreshold,
        hide_duplicates: input.hideDuplicates,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
