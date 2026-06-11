import { env } from "@/lib/env";
import type { ServiceOperator, ServiceOperatorFilters } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): ServiceOperator {
  return {
    id: r.id,
    name: r.name ?? undefined,
    company: r.company ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    zip: r.zip ?? undefined,
    serviceType: (r.service_type as ServiceOperator["serviceType"]) ?? "junk_removal",
    websiteUrl: r.website_url ?? undefined,
    source: r.source,
    score: r.score,
    priority: (r.priority as ServiceOperator["priority"]) ?? "good",
    profileStatus: r.profile_status ?? undefined,
    scrapedAt: r.scraped_at,
    // 3-pillar scores
    availabilityScore:    r.availability_score ?? undefined,
    reliabilityScore:     r.reliability_score ?? undefined,
    professionalismScore: r.professionalism_score ?? undefined,
    confidenceTier:       r.confidence_tier ?? undefined,
    lastScoredAt:         r.last_scored_at ?? undefined,
    // Google Maps / scraped (read-only)
    googlePlaceId:       r.google_place_id ?? undefined,
    googleMapsRating:    r.google_maps_rating ?? undefined,
    googleReviewCount:   r.google_review_count ?? undefined,
    googleLastReviewAt:  r.google_last_review_at ?? undefined,
    googleResponseRate:  r.google_response_rate ?? undefined,
    googleResponseTime:  r.google_response_time ?? undefined,
    hoursDescription:    r.hours_description ?? undefined,
    hoursJson:           r.hours_json ?? undefined,
    reviewSnippet:       r.review_snippet ?? undefined,
    mapsRank:            r.maps_rank ?? undefined,
    jobsCompleted:       r.jobs_completed ?? undefined,
    // Vendor-editable
    tagline:             r.tagline ?? undefined,
    isLicensed:          r.is_licensed ?? undefined,
    isInsured:           r.is_insured ?? undefined,
    yearsInBusiness:     r.years_in_business ?? undefined,
    crewSize:            r.crew_size ?? undefined,
    numTrucks:           r.num_trucks ?? undefined,
    servicesOffered:     r.services_offered ?? undefined,
    serviceAreas:        r.service_areas ?? undefined,
    serviceAreaZips:     r.service_area_zips ?? undefined,
    maxJobSize:          r.max_job_size ?? undefined,
    pricingInfo:         r.pricing_info ?? undefined,
    pricingTiers:        r.pricing_tiers ?? undefined,
    logoUrl:             r.image_url ?? undefined,
    photoUrls:           r.photo_urls ?? undefined,
    certifications:      r.certifications ?? undefined,
    licenseNumber:       r.license_number ?? undefined,
    licenseState:        r.license_state ?? undefined,
    testimonials:        r.testimonials ?? undefined,
    fleetDescription:    r.fleet_description ?? undefined,
    hasReferralProgram:  r.has_referral_program ?? undefined,
    referralCommission:  r.referral_commission ?? undefined,
    ecoFriendly:         r.eco_friendly ?? undefined,
    instagramUrl:        r.instagram_url ?? undefined,
  };
}

export async function getServiceOperator(id: string): Promise<ServiceOperator | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data } = await db.from("service_operators").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return mapRow(data);
}

export async function listServiceOperators(
  filters: ServiceOperatorFilters = {}
): Promise<ServiceOperator[]> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.from("service_operators").select("*");

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.serviceType) q = q.eq("service_type", filters.serviceType);
  if (filters.verifiedOnly) q = q.eq("profile_status", "verified");

  const cf = filters.contactFilter ?? "email_and_phone";
  if (cf === "phone_only") q = q.not("phone", "is", null);
  else if (cf === "email_only") q = q.not("email", "is", null);
  else if (cf === "email_and_phone") q = q.not("phone", "is", null).not("email", "is", null);
  else if (cf === "no_contact") q = q.is("phone", null).is("email", null);

  if (filters.sort === "newest") {
    q = q.order("scraped_at", { ascending: false });
  } else if (filters.sort === "name") {
    q = q.order("company", { ascending: true });
  } else {
    q = q.order("score", { ascending: false }).order("scraped_at", { ascending: false });
  }

  const { data, error } = await q.limit(300);
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => mapRow(r));
}
