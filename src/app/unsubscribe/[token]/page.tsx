import { AppShell } from "@/components/app-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return <Result status="error" />;
  }

  const db = createSupabaseAdminClient();

  // Check realtor_contacts first
  const { data: contact } = await db
    .from("realtor_contacts")
    .select("id, name, profile_status")
    .eq("verification_token", token)
    .maybeSingle();

  if (contact) {
    if (contact.profile_status !== "opted_out") {
      await db.from("realtor_contacts").update({ profile_status: "opted_out" }).eq("id", contact.id);
      await db.from("email_queue").update({ status: "cancelled" }).eq("verification_token", token).eq("status", "pending");
    }
    return <Result status="success" name={contact.name} />;
  }

  // Check service_operators
  const { data: operator } = await db
    .from("service_operators")
    .select("id, company, profile_status")
    .eq("verification_token", token)
    .maybeSingle();

  if (operator) {
    if (operator.profile_status !== "opted_out") {
      await db.from("service_operators").update({ profile_status: "opted_out" }).eq("id", operator.id);
      await db.from("email_queue").update({ status: "cancelled" }).eq("verification_token", token).eq("status", "pending");
    }
    return <Result status="success" name={operator.company} />;
  }

  return <Result status="invalid" />;
}

function Result({ status, name }: { status: "success" | "invalid" | "error"; name?: string | null }) {
  return (
    <AppShell>
      <section className="container activate-page">
        {status === "success" && (
          <div className="activate-card" style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}>
            <div className="activate-icon" style={{ color: "#64748b" }}>✓</div>
            <h1 style={{ color: "#334155" }}>Unsubscribed</h1>
            <p>
              {name
                ? <><strong>{name.replace(/&amp;/g, "&")}</strong>, you&apos;ve been</>
                : <>You&apos;ve been</>
              }{" "}removed from our outreach list. You won&apos;t receive any more emails from Trashd.
            </p>
            <p className="activate-muted">Changed your mind? Reply to any email you received and let us know.</p>
          </div>
        )}
        {status === "invalid" && (
          <div className="activate-card activate-error">
            <div className="activate-icon">✗</div>
            <h1>Invalid link</h1>
            <p>This unsubscribe link is invalid or has already been used. If you&apos;re still receiving emails, reply directly to unsubscribe.</p>
          </div>
        )}
        {status === "error" && (
          <div className="activate-card activate-error">
            <div className="activate-icon">✗</div>
            <h1>Something went wrong</h1>
            <p>Please try again later or reply to the email to unsubscribe.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
