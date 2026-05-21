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
  listPrice?: number;
  soldDate: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType: PropertyType;
  saleType: SaleType;
  cashSale?: boolean;
  daysOnMarket?: number;
  score: number;
  priority: SoldHomePriority;
  scoreReason?: string;
  listingUrl?: string;
  source: string;
  // Realtor contact
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentBrokerage?: string;
};

export type SoldHomeFilters = {
  city?: string;
  minPrice?: number;
  soldWithinHours?: number;
  propertyType?: PropertyType;
  minBeds?: number;
  sort?: "newest" | "highest_price" | "lowest_price" | "score";
};

export type RealtorScrapeSettings = {
  maxContactsPerSession: number;
  maxDaysSold: number;
  requireContact: boolean;
};

export const DEFAULT_REALTOR_SCRAPE_SETTINGS: RealtorScrapeSettings = {
  maxContactsPerSession: 20,
  maxDaysSold: 15,
  requireContact: true
};
