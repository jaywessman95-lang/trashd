import { z } from "zod";
import { DEFAULT_SCRAPE_COVERAGE } from "@/lib/config/scrape-coverage";

export const userSettingsSchema = z.object({
  cities: z.array(z.string().min(1)).default([]),
  radius: z.number().int().positive().default(25),
  minScore: z.number().int().min(0).max(100).default(80),
  minJobSize: z.enum(["small", "medium", "large", "unknown"]).default("medium"),
  enabledSources: z
    .array(z.enum(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales", "website_quote"]))
    .default(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales", "website_quote"]),
  urgencyPreference: z.enum(["immediate_only", "this_week", "all"]).default("this_week"),
  leadTypes: z.array(z.string()).default([]),
  includedKeywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  maxLeadsPerDay: z.number().int().positive().default(50),
  scrapeCoverage: z.enum(["conservative", "standard", "deep", "maximum"]).default(DEFAULT_SCRAPE_COVERAGE),
  maxListingsPerSource: z.number().int().min(1).max(1000).nullable().default(null),
  maxPagesPerSource: z.number().int().min(1).max(25).nullable().default(null),
  lookbackHours: z.number().int().min(1).max(720).nullable().default(null),
  scanningEnabled: z.boolean().default(true),
  instantAlertThreshold: z.number().int().min(0).max(100).default(90),
  hideDuplicates: z.boolean().default(true)
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
