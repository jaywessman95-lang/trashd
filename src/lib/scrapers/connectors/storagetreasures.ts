import type { SourceConnector } from "@/lib/scrapers/connectors/types";
import { zipCodesForCities } from "@/lib/config/territories";
import { cleanText } from "@/lib/scrapers/html";
import type { NormalizedLeadCandidate } from "@/lib/types";

type StorageTreasuresAuction = {
  auction_id?: number | string;
  city?: string;
  state?: string;
  zipcode?: string;
  facility_name?: string;
  unit_width?: number | string;
  unit_length?: number | string;
  unit_size?: string;
  unit_contents?: string;
  cleanout_time?: string;
  total_bids?: number | string;
  total_views?: number | string;
  image?: { image_path?: string } | null;
  current_bid?: { formatted?: string } | null;
  minimum_bid?: { formatted?: string } | null;
  initial_bid?: { formatted?: string } | null;
  cleaning_deposit?: { formatted?: string } | null;
  expire_date?: {
    utc?: { datetime?: string } | null;
    user?: { formatted?: string } | null;
  } | null;
};

type StorageTreasuresResponse = {
  auctions?: StorageTreasuresAuction[];
};

export const storageTreasuresConnector: SourceConnector = {
  source: "storagetreasures",
  render: false,
  buildSeedUrls: ({ cities, radiusMiles }) => {
    const zipCodes = zipCodesForCities(cities);
    const searchTerms = zipCodes.length ? zipCodes : ["92805"];
    const radius = normalizeSearchRadius(radiusMiles);

    return searchTerms.map((zipCode) => buildAuctionApiUrl(zipCode, radius));
  },
  async fetch(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`StorageTreasures API fetch failed (${response.status}).`);
    }

    return {
      url: response.url,
      html: await response.text()
    };
  },
  async extract(body, url) {
    const data = parseResponse(body);
    const auctions = Array.isArray(data?.auctions) ? data.auctions : [];
    const candidates: NormalizedLeadCandidate[] = [];
    const seen = new Set<string>();

    for (const auction of auctions) {
      const candidate = mapAuction(auction, url);

      if (!candidate || seen.has(candidate.url)) {
        continue;
      }

      seen.add(candidate.url);
      candidates.push(candidate);
    }

    return candidates;
  }
};

function buildAuctionApiUrl(zipCode: string, radiusMiles: number): string {
  const params = new URLSearchParams({
    page_num: "1",
    page_count: "25",
    search_type: "zipcode",
    search_term: zipCode,
    search_radius: String(radiusMiles),
    filter_types: "1,2,3",
    sort_column: "expire_date",
    sort_direction: "asc"
  });

  return `https://api.storagetreasures.com/auctions?${params.toString()}`;
}

function normalizeSearchRadius(radiusMiles: number): number {
  const allowedRadii = [5, 10, 25, 50, 100, 150, 200, 500];
  return allowedRadii.find((radius) => radius >= radiusMiles) ?? 500;
}

function parseResponse(body: string): StorageTreasuresResponse | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mapAuction(auction: StorageTreasuresAuction, searchUrl: string): NormalizedLeadCandidate | null {
  const sourceListingId = cleanText(String(auction.auction_id ?? ""));
  const city = cleanText(auction.city);
  const state = cleanText(auction.state).toUpperCase();
  const unitSize = cleanText(auction.unit_size) || buildUnitSize(auction);

  if (!sourceListingId || !city || !state) {
    return null;
  }

  const listingUrl = buildListingUrl(state, city, sourceListingId);
  const facility = cleanText(auction.facility_name);
  const contents = cleanText(auction.unit_contents);
  const cleanoutTime = cleanText(auction.cleanout_time);
  const cleaningDeposit = cleanText(auction.cleaning_deposit?.formatted);
  const price = cleanText(
    auction.current_bid?.formatted ?? auction.minimum_bid?.formatted ?? auction.initial_bid?.formatted
  );

  return {
    source: "storagetreasures",
    sourceListingId,
    title: [unitSize ? `${unitSize} storage unit` : "Storage unit auction", city].filter(Boolean).join(" in "),
    description: [
      facility,
      unitSize ? `Unit size: ${unitSize}` : "",
      contents ? `Appears to contain: ${contents}` : "",
      cleanoutTime ? `Cleanout time: ${cleanoutTime}` : "",
      cleaningDeposit ? `Cleaning deposit: ${cleaningDeposit}` : ""
    ]
      .filter(Boolean)
      .join(". "),
    city,
    state,
    url: listingUrl,
    price: price || undefined,
    imageCount: auction.image?.image_path ? 1 : 0,
    eventEnd: parseUtcDate(auction.expire_date?.utc?.datetime),
    rawData: {
      searchUrl,
      facilityName: facility,
      unitSize,
      unitContents: contents,
      cleanoutTime,
      cleaningDeposit,
      auctionEndText: cleanText(auction.expire_date?.user?.formatted),
      totalBids: auction.total_bids,
      totalViews: auction.total_views,
      zipcode: cleanText(auction.zipcode),
      imagePath: cleanText(auction.image?.image_path)
    }
  };
}

function buildListingUrl(state: string, city: string, auctionId: string): string {
  const stateSlug = encodeURIComponent(state.toLowerCase());
  const citySlug = encodeURIComponent(city.toLowerCase().replace(/\s+/g, "-"));

  return `https://www.storagetreasures.com/auctions/${stateSlug}/${citySlug}/${auctionId}`;
}

function buildUnitSize(auction: StorageTreasuresAuction): string {
  const width = cleanText(String(auction.unit_width ?? ""));
  const length = cleanText(String(auction.unit_length ?? ""));

  return width && length ? `${width} x ${length}` : "";
}

function parseUtcDate(value: string | undefined): string | undefined {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return undefined;
  }

  const timestamp = Date.parse(`${cleanValue.replace(" ", "T")}Z`);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function isRecord(value: unknown): value is StorageTreasuresResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
