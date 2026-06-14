import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendRealtorOutreach, sendOperatorOutreach } from "@/lib/integrations/gmail";

// Conservative: 2 emails per 10-min dispatch keeps sends well below Gmail's spam thresholds
const DISPATCH_BATCH = 2;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_REFRESH_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "Gmail not configured" });
  }

  const db = createSupabaseAdminClient();
  const now = new Date();

  const { data: due, error: fetchError } = await db
    .from("email_queue")
    .select("id, type, recipient_id, recipient_email, recipient_name, verification_token")
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(DISPATCH_BATCH);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of due ?? []) {
    try {
      // Skip if recipient has opted out since this item was queued
      const recipientQuery = item.type === "realtor"
        ? db.from("realtor_contacts").select("profile_status").eq("id", item.recipient_id).single()
        : db.from("service_operators").select("profile_status").eq("id", item.recipient_id).single();
      const { data: recipient } = await recipientQuery;
      if (recipient?.profile_status === "opted_out") {
        await db.from("email_queue").update({ status: "cancelled" }).eq("id", item.id);
        continue;
      }

      if (item.type === "realtor") {
        await sendRealtorOutreach(item.recipient_email, item.recipient_name, item.verification_token ?? undefined);
      } else {
        await sendOperatorOutreach(item.recipient_email, item.recipient_name, item.verification_token ?? undefined);
      }
      await db
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .from("email_queue")
        .update({ status: "failed", error: msg })
        .eq("id", item.id);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    dispatchedAt: now.toISOString(),
    sent,
    failed,
    remaining: (due?.length ?? 0) - sent - failed,
  });
}
