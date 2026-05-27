export type ServiceType = "junk_removal" | "movers" | "both";

export type OperatorScrapeSettings = {
  maxLeadsPerHour: number;
  maxEmailsPerRun: number;
};

export const DEFAULT_OPERATOR_SCRAPE_SETTINGS: OperatorScrapeSettings = {
  maxLeadsPerHour: 60,
  maxEmailsPerRun: 20,
};
export type OperatorPriority = "hot_now" | "strong" | "good";

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
};

export type ContactFilter = "phone_only" | "email_only" | "email_and_phone" | "no_contact";

export type ServiceOperatorFilters = {
  city?: string;
  serviceType?: ServiceType;
  contactFilter?: ContactFilter;
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

export function detectServiceType(text: string): ServiceType {
  const t = text.toLowerCase();
  const isJunk = /junk|haul|trash|debris|clean.?out|removal|dump/.test(t);
  const isMovers = /mov(ing|ers?)|relocat|truck|transport/.test(t);
  if (isJunk && isMovers) return "both";
  if (isMovers) return "movers";
  return "junk_removal";
}
