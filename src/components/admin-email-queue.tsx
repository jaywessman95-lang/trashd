import { fetchPendingEmailQueue } from "@/lib/admin/queue";
import { AdminEmailQueuePanel } from "./admin-email-queue-panel";

export async function AdminEmailQueue() {
  const emails = await fetchPendingEmailQueue();
  return <AdminEmailQueuePanel initialEmails={emails} />;
}
