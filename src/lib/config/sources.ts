import type { SourceId } from "@/lib/types";

export type SourceConfig = {
  id: SourceId;
  label: string;
  rank: number;
  confidenceBoost: number;
  defaultSchedule: string;
};

export const SOURCES: SourceConfig[] = [
  {
    id: "craigslist",
    label: "Craigslist",
    rank: 1,
    confidenceBoost: 10,
    defaultSchedule: "every 2-4 hours"
  },
  {
    id: "offerup",
    label: "OfferUp",
    rank: 2,
    confidenceBoost: 15,
    defaultSchedule: "every 4-8 hours"
  },
  {
    id: "estatesales_net",
    label: "EstateSales.net",
    rank: 3,
    confidenceBoost: 20,
    defaultSchedule: "every 8 hours"
  },
  {
    id: "storagetreasures",
    label: "StorageTreasures",
    rank: 4,
    confidenceBoost: 25,
    defaultSchedule: "every 8 hours"
  },
  {
    id: "auctionzip",
    label: "AuctionZip",
    rank: 5,
    confidenceBoost: 20,
    defaultSchedule: "every 8-12 hours"
  },
  {
    id: "estatesales_org",
    label: "EstateSales.org",
    rank: 6,
    confidenceBoost: 18,
    defaultSchedule: "every 8-12 hours"
  },
  {
    id: "movingsales",
    label: "MovingSales / Aggregators",
    rank: 7,
    confidenceBoost: 15,
    defaultSchedule: "daily"
  }
];

export function getSourceConfig(source: SourceId): SourceConfig {
  const config = SOURCES.find((item) => item.id === source);

  if (!config) {
    throw new Error(`Unknown source: ${source}`);
  }

  return config;
}
