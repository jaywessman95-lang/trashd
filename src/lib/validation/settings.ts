import { z } from "zod";

export const userSettingsSchema = z.object({
  cities: z.array(z.string().min(1)).default([]),
  radius: z.number().int().positive().default(25),
  minScore: z.number().int().min(0).max(100).default(80),
  minJobSize: z.enum(["small", "medium", "large", "unknown"]).default("medium"),
  enabledSources: z
    .array(z.enum(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"]))
    .default(["craigslist", "offerup", "estatesales_net", "storagetreasures", "auctionzip", "estatesales_org", "movingsales"]),
  urgencyPreference: z.enum(["immediate_only", "this_week", "all"]).default("this_week"),
  leadTypes: z.array(z.string()).default([]),
  includedKeywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  maxLeadsPerDay: z.number().int().positive().default(50),
  instantAlertThreshold: z.number().int().min(0).max(100).default(90),
  hideDuplicates: z.boolean().default(true)
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
