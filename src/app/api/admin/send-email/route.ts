import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { sendRealtorOutreach, sendOperatorOutreach } from "@/lib/integrations/gmail";

const ADMIN_EMAIL = "conexer@gmail.com";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let id: string;
  try {
    const body = await request.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  const { data: item, error: fetchError } = await db
    .from("email_queue")
    .select("id, type, recipient_email, recipient_name, verification_token")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  try {
    if (item.type === "realtor") {
      await sendRealtorOutreach(
        item.recipient_email,
        item.recipient_name,
        item.verification_token ?? undefined
      );
    } else {
      await sendOperatorOutreach(
        item.recipient_email,
        item.recipient_name,
        item.verification_token ?? undefined
      );
    }
    await db
      .from("email_queue")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true, result: "sent" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .from("email_queue")
      .update({ status: "failed", error: msg })
      .eq("id", id);
    return NextResponse.json({ ok: false, result: "failed", error: msg });
  }
}
