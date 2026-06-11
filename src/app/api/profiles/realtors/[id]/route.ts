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
  const body = await request.json();
  const { token, name, phone, email, brokerage, aiBio,
    licenseNumber, yearsInRealEstate, serviceAreas, specialties,
    preferredContact, websiteUrl, instagramUrl, linkedinUrl } = body;

  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const db = createSupabaseAdminClient();
  const { data: contact } = await db
    .from("realtor_contacts")
    .select("id, verification_token")
    .eq("id", id)
    .maybeSingle();

  if (!contact) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (contact.verification_token !== token) {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("realtor_contacts")
    .update({
      name:                  name?.trim()         || null,
      phone:                 phone?.trim()        || null,
      email:                 email?.trim()        || null,
      brokerage:             brokerage?.trim()    || null,
      ai_bio:                aiBio?.trim()        || null,
      license_number:        licenseNumber?.trim()    || null,
      years_in_real_estate:  yearsInRealEstate    || null,
      service_areas:         Array.isArray(serviceAreas) ? serviceAreas : [],
      specialties:           Array.isArray(specialties) ? specialties : [],
      preferred_contact:     preferredContact     || null,
      website_url:           websiteUrl?.trim()   || null,
      instagram_url:         instagramUrl?.trim() || null,
      linkedin_url:          linkedinUrl?.trim()  || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
