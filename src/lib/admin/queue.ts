import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type QueuedEmail = {
  id: string;
  type: string;
  recipient_name: string | null;
  recipient_email: string;
  scheduled_at: string;
};

export async function fetchPendingEmailQueue(): Promise<QueuedEmail[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("email_queue")
    .select("id, type, recipient_name, recipient_email, scheduled_at")
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(500);
  return data ?? [];
}
