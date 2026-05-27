export type PropertyType = "single_family" | "condo" | "townhouse" | "multi_family" | "unknown";

export type SaleType = "standard" | "estate" | "trust" | "foreclosure" | "as_is" | "investor";

export type SoldHomePriority = "hot_now" | "strong" | "good";

export type SoldHomeLead = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  salePrice: number;
  soldDate: string;
  propertyType: PropertyType;
  saleType: SaleType;
  cashSale?: boolean;
  score: number;
  priority: SoldHomePriority;
  scoreReason?: string;
  listingUrl?: string;
  source: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentBrokerage?: string;
  agentImageUrl?: string;
  agentAiBio?: string;
  agentProfileStatus?: string;
  scrapedAt?: string;
  contactOnly?: boolean;
  bedrooms?: number;
};

export type ContactFilter = "phone_only" | "email_only" | "email_and_phone" | "no_contact";

export type SoldHomeFilters = {
  city?: string;
  minPrice?: number;
  soldWithinHours?: number;
  propertyType?: PropertyType;
  contactFilter?: ContactFilter;
  sort?: "newest" | "highest_price" | "lowest_price" | "score";
};

export type RealtorScrapeSettings = {
  maxContactsPerSession: number;
  maxDaysSold: number;
};

export const DEFAULT_REALTOR_SCRAPE_SETTINGS: RealtorScrapeSettings = {
  maxContactsPerSession: 20,
  maxDaysSold: 15
};
