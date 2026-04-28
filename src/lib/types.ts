export type SourceId =
  | "craigslist"
  | "offerup"
  | "estatesales_net"
  | "storagetreasures"
  | "auctionzip"
  | "estatesales_org"
  | "movingsales";

export type LeadPriority = "hot_now" | "strong" | "good" | "hidden";

export type JobSize = "small" | "medium" | "large" | "unknown";

export type LeadType =
  | "residential"
  | "moving"
  | "estate"
  | "auction"
  | "storage"
  | "commercial"
  | "garage_sale"
  | "free_bulk_pickup"
  | "unknown";

export type NormalizedLeadCandidate = {
  source: SourceId;
  sourceListingId?: string;
  title: string;
  description?: string;
  city?: string;
  state?: string;
  url: string;
  price?: string;
  imageCount: number;
  eventStart?: string;
  eventEnd?: string;
  postedAt?: string;
  rawData: Record<string, unknown>;
};

export type LeadScore = {
  score: number;
  priority: LeadPriority;
  jobSize: JobSize;
  leadType: LeadType;
  aiReason: string;
  scoringVersion: string;
};

export type UserLeadSettings = {
  cities: string[];
  radiusMiles: number;
  minScore: number;
  minJobSize: JobSize;
  enabledSources: SourceId[];
  urgencyPreference: "immediate_only" | "this_week" | "all";
  leadTypes: LeadType[];
  includedKeywords: string[];
  excludedKeywords: string[];
  maxLeadsPerDay: number;
  instantAlertThreshold: number;
  hideDuplicates: boolean;
};
