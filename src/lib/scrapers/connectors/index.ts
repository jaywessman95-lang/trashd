import { auctionZipConnector } from "@/lib/scrapers/connectors/auctionzip";
import { craigslistConnector } from "@/lib/scrapers/connectors/craigslist";
import { estateSalesNetConnector } from "@/lib/scrapers/connectors/estatesales-net";
import { estateSalesOrgConnector } from "@/lib/scrapers/connectors/estatesales-org";
import { movingSalesConnector } from "@/lib/scrapers/connectors/movingsales";
import { offerupConnector } from "@/lib/scrapers/connectors/offerup";
import { storageTreasuresConnector } from "@/lib/scrapers/connectors/storagetreasures";
import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import type { SourceId } from "@/lib/types";

export const connectors: Record<SourceId, SourceConnector> = {
  craigslist: craigslistConnector,
  offerup: offerupConnector,
  estatesales_net: estateSalesNetConnector,
  storagetreasures: storageTreasuresConnector,
  auctionzip: auctionZipConnector,
  estatesales_org: estateSalesOrgConnector,
  movingsales: movingSalesConnector
};
