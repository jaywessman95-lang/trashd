import { NextResponse } from "next/server";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { leadActionSchema } from "@/lib/validation/lead-action";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await context.params;
  const input = leadActionSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("lead_actions")
    .upsert(
      {
        user_id: user.id,
        lead_id: leadId,
        contacted: input.contacted,
        booked: input.booked,
        dismissed: input.dismissed,
        not_a_fit: input.notAFit,
        notes: input.notes,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,lead_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
