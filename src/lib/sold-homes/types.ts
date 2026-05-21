export type PropertyType = "single_family" | "condo" | "townhouse" | "multi_family" | "unknown";

export type SoldHomePriority = "hot_now" | "strong" | "good";

export type SoldHomeLead = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  salePrice: number;
  soldDate: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType: PropertyType;
  daysOnMarket?: number;
  score: number;
  priority: SoldHomePriority;
  listingUrl?: string;
};

export type SoldHomeFilters = {
  city?: string;
  minPrice?: number;
  soldWithinHours?: number;
  propertyType?: PropertyType;
  minBeds?: number;
  sort?: "newest" | "highest_price" | "lowest_price" | "score";
};
