import type { ServiceOperator } from "./types";

export type OperatorSummary = {
  pros: string[];
  cons: string[];
  realtorNotes: string[];
};

// ── Deterministic summary from scraped fields ─────────────────────────────────

export function generateOperatorSummary(op: ServiceOperator): OperatorSummary {
  const pros: string[] = [];
  const cons: string[] = [];
  const realtorNotes: string[] = [];

  // ── PROS ──────────────────────────────────────────────────────────────────

  if (op.googleMapsRating && op.googleReviewCount) {
    const tier =
      op.googleMapsRating >= 4.8 ? "exceptional" :
      op.googleMapsRating >= 4.5 ? "strong" : "solid";
    pros.push(
      `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${op.googleMapsRating.toFixed(1)}★ rating from ${op.googleReviewCount.toLocaleString()} verified Google reviews — highly consistent track record`
    );
  } else if (op.googleMapsRating) {
    pros.push(`${op.googleMapsRating.toFixed(1)}★ Google rating`);
  }

  const is24h = Object.values(op.hoursJson ?? {}).some(v => /24 hours|24\/7|00:00/i.test(v))
    || /24 hours|24\/7|always open/i.test(op.hoursDescription ?? "");
  if (is24h) {
    pros.push("Available 24/7 — can handle urgent same-day estate cleanouts, weekend pickups, and last-minute pre-listing jobs");
  } else if (op.hoursJson && Object.keys(op.hoursJson).length >= 5) {
    pros.push("Broad operating hours across 6–7 days per week");
  }

  const isLicensedInsured =
    op.certifications?.some(c => /licensed|insured|bonded/i.test(c)) ||
    op.isLicensed || op.isInsured;
  if (isLicensedInsured) {
    pros.push("Licensed & Insured — removes seller and realtor liability for any on-site damage during cleanouts");
  }

  if (op.hasReferralProgram && op.referralCommission) {
    pros.push(`Pays ${op.referralCommission}% referral commission to realtors — direct income on every referred job`);
  } else if (op.hasReferralProgram) {
    pros.push("Has an active realtor referral program");
  }

  if (op.jobsCompleted && op.jobsCompleted >= 200) {
    pros.push(`${op.jobsCompleted.toLocaleString()}+ jobs completed — established operator with proven volume`);
  }

  if (op.yearsInBusiness && op.yearsInBusiness >= 5) {
    pros.push(`${op.yearsInBusiness}+ years in business — stable, experienced operation`);
  }

  if (op.googleResponseTime) {
    pros.push(`Fast response: "${op.googleResponseTime}"`);
  }

  if (op.pricingTiers && op.pricingTiers.length > 0) {
    const lowest = op.pricingTiers[0];
    pros.push(`Published pricing (starts at ${lowest.price} for ${lowest.label}) — realtors can give clients upfront estimates`);
  }

  if (op.ecoFriendly) {
    pros.push("Eco-friendly disposal — donates and recycles where possible, appeals to sustainability-minded sellers");
  }

  // ── CONS ──────────────────────────────────────────────────────────────────

  if (!op.pricingTiers?.length && !op.pricingInfo) {
    cons.push("No published pricing — clients must call for a quote before committing");
  }

  if (!op.isLicensed && !op.certifications?.length) {
    cons.push("License and insurance status not confirmed — verify before recommending for high-value property work");
  }

  if (!op.googleResponseTime && op.googleResponseRate === "none") {
    cons.push("Low response rate reported on Google — may require persistent follow-up to confirm bookings");
  }

  if (!op.hasReferralProgram) {
    cons.push("No listed referral program — no direct commission benefit for realtors who refer jobs");
  }

  if (!op.yearsInBusiness) {
    cons.push("Years in business not verified — check Google listing for founding date");
  }

  if (!op.phone && !op.email) {
    cons.push("Limited contact info — website or Google Maps call required to reach them");
  }

  // ── REALTOR NOTES ─────────────────────────────────────────────────────────

  const serviceTypeLabel =
    op.serviceType === "movers" ? "moving services" :
    op.serviceType === "both" ? "junk removal and moving" :
    "junk removal";

  realtorNotes.push(
    `Specializes in ${serviceTypeLabel}${op.city ? ` · Based in ${op.city}${op.state ? `, ${op.state}` : ""}` : ""} · Serves Orange County`
  );

  if (op.servicesOffered?.length) {
    const keyServices = op.servicesOffered
      .filter(s => /estate|cleanout|furniture|appliance|hot tub|debris|donation/i.test(s))
      .slice(0, 4);
    if (keyServices.length > 0) {
      realtorNotes.push(`Key services relevant to listings: ${keyServices.join(", ")}`);
    }
  } else if (op.tagline) {
    realtorNotes.push(`Per their listing: "${op.tagline.slice(0, 120)}${op.tagline.length > 120 ? "…" : ""}"`);
  }

  if (op.serviceAreas?.length) {
    realtorNotes.push(`Confirmed service cities: ${op.serviceAreas.slice(0, 6).join(", ")}${op.serviceAreas.length > 6 ? " and more" : ""}`);
  } else if (op.serviceAreaZips?.length) {
    realtorNotes.push(`Confirmed service ZIPs: ${op.serviceAreaZips.slice(0, 6).join(", ")}`);
  }

  if (op.googleMapsRating && op.googleReviewCount && op.googleReviewCount >= 100) {
    const estateSignal =
      op.servicesOffered?.some(s => /estate|cleanout/i.test(s)) ||
      /estate|cleanout/i.test(op.tagline ?? "");
    realtorNotes.push(
      estateSignal
        ? `High review volume (${op.googleReviewCount.toLocaleString()}) with estate cleanout experience — strong candidate for post-sale referrals`
        : `High review volume (${op.googleReviewCount.toLocaleString()}) signals reliable operation — worth keeping in your vendor rotation`
    );
  }

  if (op.fleetDescription) {
    realtorNotes.push(`Fleet: ${op.fleetDescription}`);
  }

  // Cap lengths
  return {
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 3),
    realtorNotes: realtorNotes.slice(0, 4),
  };
}
