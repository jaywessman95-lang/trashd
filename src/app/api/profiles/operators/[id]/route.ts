import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await params;
  const { token, company, name, phone, email, websiteUrl, city, state } = await request.json();

  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const db = createSupabaseAdminClient();

  const { data: operator } = await db
    .from("service_operators")
    .select("id, verification_token")
    .eq("id", id)
    .maybeSingle();

  if (!operator) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (operator.verification_token !== token) {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  const { error } = await db
    .from("service_operators")
    .update({
      company: company?.trim() || null,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      website_url: websiteUrl?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
