import { sampleSoldHomes } from "@/lib/sold-homes/sample-data";
import type { SoldHomeFilters, SoldHomeLead } from "@/lib/sold-homes/types";
import { env } from "@/lib/env";

export type RealtorContactProfile = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  brokerage?: string;
  imageUrl?: string;
  aiBio?: string;
  profileStatus: string;
  source: string;
  scrapedAt: string;
};

export async function getRealtorContact(id: string): Promise<RealtorContactProfile | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data } = await db.from("realtor_contacts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    brokerage: data.brokerage ?? undefined,
    imageUrl: data.image_url ?? undefined,
    aiBio: data.ai_bio ?? undefined,
    profileStatus: data.profile_status ?? "unverified",
    source: data.source,
    scrapedAt: data.scraped_at,
  };
}

async function listFromSupabase(filters: SoldHomeFilters): Promise<SoldHomeLead[]> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();

  // Pull sold listings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.from("realtor_sold_listings").select("*");

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.minPrice) q = q.gte("sale_price", filters.minPrice);
  if (filters.soldWithinHours) {
    const cutoff = new Date(Date.now() - filters.soldWithinHours * 3600000).toISOString();
    q = q.gte("sold_date", cutoff);
  }
  if (filters.propertyType) q = q.eq("property_type", filters.propertyType);

  const cf = filters.contactFilter ?? "email_and_phone";
  if (cf === "phone_only") q = q.not("agent_phone", "is", null);
  else if (cf === "email_only") q = q.not("agent_email", "is", null);
  else if (cf === "email_and_phone") q = q.not("agent_phone", "is", null).not("agent_email", "is", null);
  else if (cf === "no_contact") q = q.is("agent_phone", null).is("agent_email", null);

  if (filters.sort === "newest") {
    q = q.order("sold_date", { ascending: false });
  } else if (filters.sort === "highest_price") {
    q = q.order("sale_price", { ascending: false });
  } else if (filters.sort === "lowest_price") {
    q = q.order("sale_price", { ascending: true });
  } else {
    q = q.order("score", { ascending: false }).order("sold_date", { ascending: false });
  }

  const { data: listingRows, error: listingErr } = await q.limit(200);
  if (listingErr) throw listingErr;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings: SoldHomeLead[] = (listingRows ?? []).map((r: any) => ({
    id: r.id,
    address: r.address,
    city: r.city,
    state: r.state,
    zip: r.zip ?? undefined,
    salePrice: r.sale_price,
    soldDate: r.sold_date,
    propertyType: r.property_type as SoldHomeLead["propertyType"],
    saleType: r.sale_type as SoldHomeLead["saleType"],
    cashSale: r.cash_sale,
    score: r.score,
    priority: r.priority as SoldHomeLead["priority"],
    scoreReason: r.score_reason ?? undefined,
    listingUrl: r.listing_url ?? undefined,
    source: r.source,
    agentName: r.agent_name ?? undefined,
    agentPhone: r.agent_phone ?? undefined,
    agentEmail: r.agent_email ?? undefined,
    agentBrokerage: r.agent_brokerage ?? undefined,
    agentImageUrl: r.agent_image_url ?? undefined,
    agentProfileStatus: r.agent_profile_status ?? "unverified",
    scrapedAt: r.created_at,
    bedrooms: r.bedrooms ?? undefined,
  }));

  // Pull contact-only leads (no sold listing, just scraped agent info)
  // Skip if minPrice filter is active (contacts have no price data)
  if (!filters.minPrice && !filters.soldWithinHours && !filters.propertyType) {
    let cq = db
      .from("realtor_contacts")
      .select("*")
      .or("email.not.is.null,phone.not.is.null")
      .order("scraped_at", { ascending: false })
      .limit(100);

    if (filters.city) cq = cq.ilike("name", `%${filters.city}%`);

    const { data: contactRows } = await cq;
    const existingIds = new Set(listings.map((l) => l.id));

    const contacts: SoldHomeLead[] = (contactRows ?? [])
      .filter((c) => !existingIds.has(c.id))
      .map((c) => {
        const hasPhone = !!c.phone;
        const hasEmail = !!c.email;
        const score = hasPhone && hasEmail ? 45 : hasEmail ? 35 : hasPhone ? 25 : 10;
        const priority: SoldHomeLead["priority"] = score >= 40 ? "strong" : "good";
        return {
          id: c.id,
          address: "",
          city: "Orange County",
          state: "CA",
          salePrice: 0,
          soldDate: c.scraped_at,
          propertyType: "unknown" as SoldHomeLead["propertyType"],
          saleType: "standard" as SoldHomeLead["saleType"],
          score,
          priority,
          scoreReason: `${hasEmail ? "email" : ""}${hasPhone && hasEmail ? "+" : ""}${hasPhone ? "phone" : ""} contact`,
          source: c.source,
          agentName: c.name ?? undefined,
          agentPhone: c.phone ?? undefined,
          agentEmail: c.email ?? undefined,
          agentBrokerage: c.brokerage ?? undefined,
          scrapedAt: c.scraped_at,
          contactOnly: true,
        };
      });

    return [...listings, ...contacts];
  }

  return listings;
}

export async function listSoldHomes(filters: SoldHomeFilters = {}): Promise<SoldHomeLead[]> {
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const rows = await listFromSupabase(filters);
      if (rows.length > 0) return rows;
    } catch {
      // fall through to sample data
    }
  }

  // Fallback: apply filters to sample data
  let results = [...sampleSoldHomes];

  if (filters.city) {
    results = results.filter((h) => h.city.toLowerCase().includes(filters.city!.toLowerCase()));
  }
  if (filters.minPrice) {
    results = results.filter((h) => h.salePrice >= filters.minPrice!);
  }
  if (filters.soldWithinHours) {
    const cutoff = Date.now() - filters.soldWithinHours * 60 * 60 * 1000;
    results = results.filter((h) => Date.parse(h.soldDate) >= cutoff);
  }
  if (filters.propertyType) {
    results = results.filter((h) => h.propertyType === filters.propertyType);
  }

  if (filters.sort === "newest") {
    results.sort((a, b) => Date.parse(b.soldDate) - Date.parse(a.soldDate));
  } else if (filters.sort === "highest_price") {
    results.sort((a, b) => b.salePrice - a.salePrice);
  } else if (filters.sort === "lowest_price") {
    results.sort((a, b) => a.salePrice - b.salePrice);
  } else {
    results.sort((a, b) => b.score - a.score || Date.parse(b.soldDate) - Date.parse(a.soldDate));
  }

  return results;
}
