/**
 * 3-pillar vendor scoring for realtors.
 *
 * Pillar 1 — AVAILABILITY  (0-25): Can they come fast? 24hr / late hours matter most.
 * Pillar 2 — RELIABILITY   (0-35): Will they show up? Volume + recency + owner engagement.
 * Pillar 3 — PROFESSIONALISM (0-25): Safe to send to client's home? BBB + insured + website.
 * Bonus    — REVIEW CREDIBILITY (0-15): Cross-platform signal quality.
 * Tiebreaker — CONTACT (0-10): phone / email / website present.
 */

export type PillarScores = {
  availability: number;      // 0-25
  reliability: number;       // 0-35
  professionalism: number;   // 0-25
  reviewCredibility: number; // 0-15
  contact: number;           // 0-10
  total: number;             // 0-110 (capped at 100)
};

export type ConfidenceTier = "elite" | "verified" | "strong" | "good" | "not_shown";

export type VendorScoringInput = {
  // Availability signals
  hoursDescription?: string | null;

  // Reliability signals
  googleReviewCount?: number | null;
  googleLastReviewAt?: Date | string | null;  // date of most recent review
  googleResponseRate?: "most" | "some" | "none" | null;

  // Professionalism signals
  bbbGrade?: string | null;          // 'A+' | 'A' | 'B' | 'C' | etc.
  bbbAccredited?: boolean | null;
  bbbComplaintCount?: number | null;
  bbbComplaintsResolved?: boolean | null;
  yearsInBusiness?: number | null;
  hasLicensedInsured?: boolean;      // found in listing or website text
  websiteUrl?: string | null;

  // Review credibility signals
  googleMapsRating?: number | null;
  yelpRating?: number | null;
  yelpReviewCount?: number | null;

  // Contact signals
  phone?: string | null;
  email?: string | null;
};

export type ScoringResult = {
  scores: PillarScores;
  tier: ConfidenceTier;
  disqualified: boolean;
  disqualifyReason?: string;
};

// ─── Pillar 1: Availability ───────────────────────────────────────────────────

export function scoreAvailability(hoursDescription: string | null | undefined): number {
  if (!hoursDescription) return 0;
  const h = hoursDescription.toLowerCase();

  if (/open\s*24\s*hour|24\s*hours|24\/7/i.test(h)) return 25;

  const match = h.match(/closes?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const mins = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toLowerCase();
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    const totalMins = hour * 60 + mins;

    if (totalMins >= 22 * 60) return 20;  // 10 PM+
    if (totalMins >= 20 * 60) return 12;  // 8–9 PM
    if (totalMins >= 19 * 60) return 5;   // 7 PM
    return 3;
  }
  return 0;
}

// ─── Pillar 2: Reliability ────────────────────────────────────────────────────

export function scoreReliability(input: {
  reviewCount: number | null | undefined;
  lastReviewAt: Date | string | null | undefined;
  responseRate: "most" | "some" | "none" | null | undefined;
}): number {
  let score = 0;

  // Volume (0-20) — hardest to fake, strongest signal
  const count = input.reviewCount ?? 0;
  if (count >= 500)      score += 20;
  else if (count >= 200) score += 16;
  else if (count >= 100) score += 12;
  else if (count >= 50)  score += 8;
  else if (count >= 20)  score += 4;
  // < 20: 0 — too few to trust

  // Recency (0-10) — active business keeps getting reviews
  if (input.lastReviewAt) {
    const last = new Date(input.lastReviewAt);
    const daysAgo = Math.floor((Date.now() - last.getTime()) / 86_400_000);
    if (daysAgo <= 7)        score += 10;
    else if (daysAgo <= 30)  score += 8;
    else if (daysAgo <= 90)  score += 5;
    else if (daysAgo <= 180) score += 2;
  }

  // Owner responsiveness (0-5) — shows accountability
  if (input.responseRate === "most")      score += 5;
  else if (input.responseRate === "some") score += 2;

  return Math.min(score, 35);
}

// ─── Pillar 3: Professionalism ────────────────────────────────────────────────

const BUILDER_DOMAIN_RE = /wix\.com|square\.site|weebly\.com|godaddy\.com|wordpress\.com|squarespace\.com|jimdo\.com/i;

export function scoreProfessionalism(input: {
  bbbGrade?: string | null;
  bbbAccredited?: boolean | null;
  bbbComplaintCount?: number | null;
  bbbComplaintsResolved?: boolean | null;
  yearsInBusiness?: number | null;
  hasLicensedInsured?: boolean;
  websiteUrl?: string | null;
}): number {
  let score = 0;

  // BBB grade (0-10)
  const grade = input.bbbGrade?.trim().toUpperCase();
  if (grade) {
    if (grade === "A+" && input.bbbAccredited) score += 10;
    else if (grade === "A" && input.bbbAccredited) score += 8;
    else if (grade === "A+") score += 7;
    else if (grade === "A")  score += 5;
    else if (grade === "B")  score += 2;
    // C or lower: 0

    // Complaint penalty
    const complaints = input.bbbComplaintCount ?? 0;
    if (complaints > 0 && !input.bbbComplaintsResolved) score -= 5;
  }

  // Licensed & insured (0-5) — realtors care a lot about liability
  if (input.hasLicensedInsured) score += 5;

  // Years in business (0-5) — longevity = accountability
  const years = input.yearsInBusiness ?? 0;
  if (years >= 5)      score += 5;
  else if (years >= 3) score += 3;
  else if (years >= 1) score += 1;

  // Professional website (0-5) — no website-builder domains
  const url = input.websiteUrl;
  if (url && url.startsWith("http") && !BUILDER_DOMAIN_RE.test(url)) score += 5;

  return Math.max(0, Math.min(score, 25));
}

// ─── Review Credibility ───────────────────────────────────────────────────────

export function scoreReviewCredibility(input: {
  googleRating?: number | null;
  yelpRating?: number | null;
  yelpReviewCount?: number | null;
}): number {
  let score = 0;

  // Google star rating (0-10)
  const gr = input.googleRating ?? 0;
  if (gr >= 4.8)      score += 10;
  else if (gr >= 4.5) score += 7;
  else if (gr >= 4.0) score += 4;
  // below 4.0: 0 (also a hard disqualifier)

  // Yelp cross-check (0-5) — independent platform agreement
  const yr = input.yelpRating ?? 0;
  const yc = input.yelpReviewCount ?? 0;
  if (yr >= 4.0 && yc >= 10) score += 5;
  else if (yr >= 3.5 && yc >= 5) score += 2;
  else if (yr > 0) score += 1;

  return Math.min(score, 15);
}

// ─── Contact Tiebreaker ───────────────────────────────────────────────────────

export function scoreContact(input: {
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
}): number {
  let score = 0;
  if (input.phone)      score += 4;
  if (input.email)      score += 3;
  if (input.websiteUrl) score += 3;
  return score;
}

// ─── Hard Disqualifiers ───────────────────────────────────────────────────────

function checkDisqualifiers(input: VendorScoringInput): string | null {
  const rating = input.googleMapsRating ?? 0;
  const reviews = input.googleReviewCount ?? 0;

  if (rating > 0 && rating < 3.5) return `Google rating ${rating} is below minimum 3.5`;
  if (reviews > 0 && reviews < 5) return `Only ${reviews} reviews — unverifiable`;
  return null;
}

// ─── Master Scorer ────────────────────────────────────────────────────────────

export function computeVendorScore(input: VendorScoringInput): ScoringResult {
  const disqualifyReason = checkDisqualifiers(input);
  if (disqualifyReason) {
    return {
      scores: { availability: 0, reliability: 0, professionalism: 0, reviewCredibility: 0, contact: 0, total: 0 },
      tier: "not_shown",
      disqualified: true,
      disqualifyReason,
    };
  }

  const availability    = scoreAvailability(input.hoursDescription);
  const reliability     = scoreReliability({
    reviewCount:  input.googleReviewCount,
    lastReviewAt: input.googleLastReviewAt,
    responseRate: input.googleResponseRate,
  });
  const professionalism = scoreProfessionalism({
    bbbGrade:               input.bbbGrade,
    bbbAccredited:          input.bbbAccredited,
    bbbComplaintCount:      input.bbbComplaintCount,
    bbbComplaintsResolved:  input.bbbComplaintsResolved,
    yearsInBusiness:        input.yearsInBusiness,
    hasLicensedInsured:     input.hasLicensedInsured,
    websiteUrl:             input.websiteUrl,
  });
  const reviewCredibility = scoreReviewCredibility({
    googleRating:   input.googleMapsRating,
    yelpRating:     input.yelpRating,
    yelpReviewCount: input.yelpReviewCount,
  });
  const contact = scoreContact({
    phone:      input.phone,
    email:      input.email,
    websiteUrl: input.websiteUrl,
  });

  const total = Math.min(100, availability + reliability + professionalism + reviewCredibility + contact);

  const tier: ConfidenceTier =
    total >= 85 ? "elite" :
    total >= 70 ? "verified" :
    total >= 55 ? "strong" :
    total >= 40 ? "good" :
    "not_shown";

  return {
    scores: { availability, reliability, professionalism, reviewCredibility, contact, total },
    tier,
    disqualified: false,
  };
}

// Maps confidence tier to the legacy priority field so existing UI still works
export function tierToPriority(tier: ConfidenceTier): string {
  switch (tier) {
    case "elite":    return "elite";
    case "verified": return "verified";
    case "strong":   return "hot_now";
    case "good":     return "strong";
    default:         return "good";
  }
}
