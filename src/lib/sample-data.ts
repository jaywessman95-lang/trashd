import type { LeadScore, NormalizedLeadCandidate } from "@/lib/types";

export type DisplayLead = NormalizedLeadCandidate & LeadScore & {
  id?: string;
  firstSeenAt?: string;
};

export const sampleLeads: DisplayLead[] = [
  {
    source: "craigslist",
    title: "Moving cleanout - everything must go",
    description: "Furniture, garage items, and boxes need pickup this weekend.",
    city: "Anaheim",
    state: "CA",
    url: "https://orangecounty.craigslist.org/",
    imageCount: 8,
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    rawData: {},
    score: 94,
    priority: "hot_now",
    jobSize: "medium",
    leadType: "moving",
    aiReason: "Urgent moving language, bulk items, local match, and strong source fit.",
    scoringVersion: "sample"
  },
  {
    source: "estatesales_net",
    title: "Estate sale ending Sunday",
    description: "Large home sale with furniture, garage items, patio items, and remaining household goods.",
    city: "Irvine",
    state: "CA",
    url: "https://www.estatesales.net/CA/Los-Angeles-Orange-County",
    imageCount: 120,
    eventEnd: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    firstSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    rawData: {},
    score: 91,
    priority: "hot_now",
    jobSize: "large",
    leadType: "estate",
    aiReason: "Estate sale ending soon, high photo count, and likely post-sale leftover volume.",
    scoringVersion: "sample"
  }
];
