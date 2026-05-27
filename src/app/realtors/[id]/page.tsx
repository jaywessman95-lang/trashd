import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getRealtorContact } from "@/lib/sold-homes/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { RealtorProfileClient } from "./client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function RealtorProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  const contact = await getRealtorContact(id);
  if (!contact) notFound();

  // Validate token for edit access
  let canEdit = false;
  if (token && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("realtor_contacts")
      .select("verification_token")
      .eq("id", id)
      .maybeSingle();
    canEdit = !!data && data.verification_token === token;
  }

  return (
    <AppShell>
      <section className="container profile-page">
        <RealtorProfileClient contact={contact} token={token ?? null} canEdit={canEdit} />
      </section>
    </AppShell>
  );
}
