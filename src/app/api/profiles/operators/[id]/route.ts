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
  const {
    token,
    // Business info
    company, name, phone, email, websiteUrl, city, state,
    serviceType, tagline, yearsInBusiness,
    // Crew & capacity
    crewSize, numTrucks, maxJobSize, jobsCompleted, fleetDescription,
    // Pricing
    pricingInfo, pricingTiers,
    // Hours
    hoursJson,
    // Photos
    photoUrls,
    // Certifications
    certifications, licenseNumber, licenseState,
    // Credentials
    isLicensed, isInsured, ecoFriendly,
    // Services & areas
    servicesOffered, serviceAreas, serviceAreaZips,
    // Testimonials
    testimonials,
    // Referral
    hasReferralProgram, referralCommission,
    // Social
    instagramUrl,
  } = body;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("service_operators")
    .update({
      // Business info
      company:              company?.trim()         || null,
      name:                 name?.trim()            || null,
      phone:                phone?.trim()           || null,
      email:                email?.trim()           || null,
      website_url:          websiteUrl?.trim()      || null,
      city:                 city?.trim()            || null,
      state:                state?.trim()           || null,
      service_type:         serviceType             || null,
      tagline:              tagline?.trim()         || null,
      years_in_business:    yearsInBusiness         || null,
      // Crew & capacity
      crew_size:            crewSize                || null,
      num_trucks:           numTrucks               || null,
      max_job_size:         maxJobSize              || null,
      jobs_completed:       jobsCompleted           || null,
      fleet_description:    fleetDescription?.trim()|| null,
      // Pricing
      pricing_info:         pricingInfo?.trim()     || null,
      pricing_tiers:        Array.isArray(pricingTiers) && pricingTiers.length > 0
                              ? pricingTiers : null,
      // Hours
      hours_json:           hoursJson && Object.keys(hoursJson).length > 0
                              ? hoursJson : null,
      // Photos
      photo_urls:           Array.isArray(photoUrls) && photoUrls.length > 0
                              ? photoUrls : null,
      // Certifications
      certifications:       Array.isArray(certifications) ? certifications : [],
      license_number:       licenseNumber?.trim()   || null,
      license_state:        licenseState?.trim()    || null,
      // Credentials
      is_licensed:          !!isLicensed,
      is_insured:           !!isInsured,
      eco_friendly:         !!ecoFriendly,
      // Services & areas
      services_offered:     Array.isArray(servicesOffered) ? servicesOffered : [],
      service_areas:        Array.isArray(serviceAreas) ? serviceAreas : [],
      service_area_zips:    Array.isArray(serviceAreaZips) ? serviceAreaZips : [],
      // Testimonials
      testimonials:         Array.isArray(testimonials) && testimonials.length > 0
                              ? testimonials : null,
      // Referral
      has_referral_program: !!hasReferralProgram,
      referral_commission:  referralCommission      || null,
      // Social
      instagram_url:        instagramUrl?.trim()    || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
