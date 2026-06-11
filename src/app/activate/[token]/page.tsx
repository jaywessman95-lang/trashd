import { AppShell } from "@/components/app-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Fire-and-forget: kick off profile enrichment without blocking the page render
function triggerEnrichment(operatorId: string) {
  if (!env.CRON_SECRET || !env.NEXT_PUBLIC_SUPABASE_URL) return;
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    : "http://localhost:3000";
  const enrichUrl = `${baseUrl}/api/internal/enrich-one?id=${operatorId}&secret=${env.CRON_SECRET}`;
  // Do not await — runs in background while operator sees success screen
  fetch(enrichUrl).catch(() => {});
}

type Props = { params: Promise<{ token: string }> };

export default async function ActivatePage({ params }: Props) {
  const { token } = await params;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return <ActivateResult status="error" message="Service unavailable." />;
  }

  const db = createSupabaseAdminClient();

  // Check realtor_contacts first
  const { data: contact } = await db
    .from("realtor_contacts")
    .select("id, name, profile_status")
    .eq("verification_token", token)
    .maybeSingle();

  if (contact) {
    const editUrl = `/realtors/${contact.id}?token=${token}`;
    if (contact.profile_status === "verified") {
      return <ActivateResult status="already" name={contact.name} type="realtor" profileUrl={editUrl} />;
    }
    await db
      .from("realtor_contacts")
      .update({ profile_status: "verified" })
      .eq("id", contact.id);
    return <ActivateResult status="success" name={contact.name} type="realtor" profileUrl={editUrl} />;
  }

  // Check service_operators
  const { data: operator } = await db
    .from("service_operators")
    .select("id, company, profile_status")
    .eq("verification_token", token)
    .maybeSingle();

  if (operator) {
    const editUrl = `/operators/${operator.id}?token=${token}`;
    if (operator.profile_status === "verified") {
      return <ActivateResult status="already" name={operator.company} type="operator" profileUrl={editUrl} />;
    }
    await db
      .from("service_operators")
      .update({ profile_status: "verified" })
      .eq("id", operator.id);
    // Kick off profile enrichment in the background immediately
    triggerEnrichment(operator.id);
    return <ActivateResult status="success" name={operator.company} type="operator" profileUrl={editUrl} />;
  }

  return <ActivateResult status="invalid" />;
}

function ActivateResult({
  status,
  name,
  type,
  profileUrl,
  message,
}: {
  status: "success" | "already" | "invalid" | "error";
  name?: string | null;
  type?: "realtor" | "operator";
  profileUrl?: string;
  message?: string;
}) {
  const displayName = name ?? (type === "realtor" ? "Your realtor profile" : "Your business profile");
  const leadsUrl = type === "operator" ? "/leads?tab=realtors-just-sold" : "/services-for-realtors";
  const leadsLabel = type === "operator" ? "Browse Realtor Leads →" : "Find Cleanout Services for Your Clients →";

  return (
    <AppShell>
      <section className="container activate-page">
        {status === "success" && (
          <div className="activate-card activate-success">
            <div className="activate-icon">✓</div>
            <h1>You&apos;re Verified!</h1>
            <p>
              <strong>{displayName}</strong> is now verified on Trashd.
              {type === "realtor"
                ? " Junk removal operators in Orange County can now see and contact you directly."
                : " Realtors can now see your business listed as a verified service provider."}
            </p>
            {profileUrl && (
              <a className="activate-profile-link" href={profileUrl}>
                View &amp; Edit Your Profile &rarr;
              </a>
            )}
            {type && (
              <a className="activate-profile-link activate-secondary-link" href={leadsUrl}>
                {leadsLabel}
              </a>
            )}
            <p className="activate-muted">No account needed — your profile is live.</p>
          </div>
        )}
        {status === "already" && (
          <div className="activate-card activate-already">
            <div className="activate-icon">✓</div>
            <h1>Already Verified</h1>
            <p><strong>{displayName}</strong> is already verified on Trashd.</p>
            {profileUrl && (
              <a className="activate-profile-link" href={profileUrl}>
                View &amp; Edit Your Profile &rarr;
              </a>
            )}
            {type && (
              <a className="activate-profile-link activate-secondary-link" href={leadsUrl}>
                {leadsLabel}
              </a>
            )}
          </div>
        )}
        {status === "invalid" && (
          <div className="activate-card activate-error">
            <div className="activate-icon">✗</div>
            <h1>Link Expired or Invalid</h1>
            <p>This verification link is no longer valid. Please reply to the original email if you need help.</p>
          </div>
        )}
        {status === "error" && (
          <div className="activate-card activate-error">
            <div className="activate-icon">✗</div>
            <h1>Something went wrong</h1>
            <p>{message ?? "Please try again later."}</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
