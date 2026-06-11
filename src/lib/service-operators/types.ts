export type ServiceType = "junk_removal" | "movers" | "both";

export type PricingTier = {
  label: string;   // "1/8 truck load"
  price: string;   // "$150–$200"
  note?: string;   // "roughly 2–3 items"
};

export type Testimonial = {
  text: string;
  author?: string;
  jobType?: string;   // "Estate cleanout"
  date?: string;      // "March 2024"
};

export type OperatorScrapeSettings = {
  maxLeadsPerHour: number;
  maxEmailsPerRun: number;
  emailWindowStart: number;
  emailWindowEnd: number;
};

export const DEFAULT_OPERATOR_SCRAPE_SETTINGS: OperatorScrapeSettings = {
  maxLeadsPerHour: 60,
  maxEmailsPerRun: 20,
  emailWindowStart: 8,
  emailWindowEnd: 18,
};

// 'elite' and 'verified' are new tiers added by 3-pillar scoring
export type OperatorPriority = "elite" | "verified" | "hot_now" | "strong" | "good";

export type ServiceOperator = {
  id: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  serviceType: ServiceType;
  websiteUrl?: string;
  source: string;
  score: number;
  priority: OperatorPriority;
  profileStatus?: string;
  scrapedAt?: string;

  // ── 3-pillar scoring ──
  availabilityScore?: number;
  reliabilityScore?: number;
  professionalismScore?: number;
  confidenceTier?: string;
  lastScoredAt?: string;

  // ── Google Maps / scraped data (read-only on profile) ──
  googlePlaceId?: string;
  googleMapsRating?: number;
  googleReviewCount?: number;
  googleLastReviewAt?: string;
  googleResponseRate?: "most" | "some" | "none";
  googleResponseTime?: string;      // "Usually replies within 1 hour"
  hoursDescription?: string;
  hoursJson?: Record<string, string>; // {monday: "7am–7pm", ...}
  reviewSnippet?: string;
  mapsRank?: number;
  jobsCompleted?: number;           // scraped from website ("500+ jobs completed")

  // ── Self-reported / vendor-editable (can be pre-filled by scraper) ──
  tagline?: string;
  isLicensed?: boolean;
  isInsured?: boolean;
  yearsInBusiness?: number;
  crewSize?: number;
  numTrucks?: number;
  servicesOffered?: string[];
  serviceAreas?: string[];          // OC city names
  serviceAreaZips?: string[];       // ZIP codes
  maxJobSize?: string;
  pricingInfo?: string;             // free-text fallback
  pricingTiers?: PricingTier[];     // structured pricing table
  logoUrl?: string;                  // company logo / OG image from website
  photoUrls?: string[];             // before/after photo URLs
  certifications?: string[];        // ["Licensed Waste Hauler", "EPA Certified"]
  licenseNumber?: string;
  licenseState?: string;
  testimonials?: Testimonial[];
  fleetDescription?: string;        // "2 full-size trucks, appliance dollies"
  hasReferralProgram?: boolean;
  referralCommission?: number;
  ecoFriendly?: boolean;
  instagramUrl?: string;
};

export type ContactFilter = "phone_only" | "email_only" | "email_and_phone" | "no_contact";

export type ServiceOperatorFilters = {
  city?: string;
  serviceType?: ServiceType;
  contactFilter?: ContactFilter;
  verifiedOnly?: boolean;
  sort?: "score" | "newest" | "name";
};

export function scoreOperator(
  hasEmail: boolean,
  hasPhone: boolean,
  hasCustomDomain: boolean
): { score: number; priority: OperatorPriority } {
  let score = 0;
  if (hasEmail) score += 50;
  if (hasPhone) score += 20;
  if (hasEmail && hasCustomDomain) score += 15;
  if (hasEmail && hasPhone) score += 10;

  const priority: OperatorPriority =
    score >= 75 ? "hot_now" : score >= 45 ? "strong" : "good";
  return { score, priority };
}

export function isCustomDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com"].includes(domain);
}

// Returns true for pure storage/self-storage facilities (not junk removal companies that also offer storage)
export function isStorageCompany(name: string, description = ""): boolean {
  const t = (name + " " + description).toLowerCase();
  const hasStorage = /\bself.?storage\b|\bstorage\s+(unit|facility|center|solutions?)\b|\b(public|extra\s+space|life|cube\s*smart|iron\s*guard|u-?haul)\s+storage\b/.test(t)
    || (/\bstorage\b/.test(t) && !/junk|haul|remov|clean.?out|debris|dumpster|moving|mover/.test(t));
  return hasStorage;
}

export function detectServiceType(text: string): ServiceType {
  const t = text.toLowerCase();
  const isJunk = /junk|haul|trash|debris|clean.?out|removal|dump/.test(t);
  const isMovers = /mov(ing|ers?)|relocat|truck|transport/.test(t);
  if (isJunk && isMovers) return "both";
  if (isMovers) return "movers";
  return "junk_removal";
}
