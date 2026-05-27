import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getServiceOperator } from "@/lib/service-operators/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { OperatorProfileClient } from "./client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function OperatorProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  const operator = await getServiceOperator(id);
  if (!operator) notFound();

  let canEdit = false;
  if (token && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("service_operators")
      .select("verification_token")
      .eq("id", id)
      .maybeSingle();
    canEdit = !!data && data.verification_token === token;
  }

  return (
    <AppShell>
      <section className="container profile-page">
        <OperatorProfileClient operator={operator} token={token ?? null} canEdit={canEdit} />
      </section>
    </AppShell>
  );
}
