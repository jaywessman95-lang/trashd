import { zyteGet } from "./zyte-client";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

const URL =
  "https://www.realtor.com/realestateandhomes-search/Orange-County_CA/show-recently-sold/pg-1";

export async function scrapeRealtorCom(
  apiKey: string
): Promise<{ leads: Partial<SoldHomeLead>[]; rawCount: number }> {
  const { html } = await zyteGet(apiKey, { url: URL, browserHtml: true });

  const leads: Partial<SoldHomeLead>[] = [];

  // Realtor.com renders listing data in JSON-LD or __NEXT_DATA__
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>;
      // Drill into props.pageProps.searchResults.home_listing_list
      const results =
        (nextData as any)?.props?.pageProps?.searchResults?.home_listing_list ??
        (nextData as any)?.props?.pageProps?.propertiesInfo?.properties ??
        [];

      for (const prop of results.slice(0, 20)) {
        const address = [prop.location?.address?.line, prop.location?.address?.city]
          .filter(Boolean)
          .join(", ");
        const price = prop.last_sold_price ?? prop.list_price;
        if (address && price) {
          leads.push({
            address,
            city: prop.location?.address?.city ?? "",
            salePrice: Number(price),
            soldDate: prop.last_sold_date
              ? new Date(prop.last_sold_date).toISOString()
              : new Date().toISOString(),
            agentName: prop.branding?.[0]?.name,
            agentPhone: prop.branding?.[0]?.phone,
            source: "realtor_com",
            saleType: "standard",
            priority: "good",
            score: 50,
          });
        }
      }
    } catch {
      // JSON parse failed
    }
  }

  // Fallback count from raw HTML
  const rawCount = [...html.matchAll(/\$[\d,]{4,}/g)].length;
  return { leads, rawCount };
}
