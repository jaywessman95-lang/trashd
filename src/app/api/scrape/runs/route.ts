import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/guards";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { response } = await requireSignedInUser();
  if (response) return response;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ runs: [] });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("scrape_runs").select("*").order("started_at", { ascending: false }).limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data });
}
