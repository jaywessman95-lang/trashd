import { env } from "@/lib/env";
import type { ServiceOperator, ServiceOperatorFilters } from "./types";

export async function getServiceOperator(id: string): Promise<ServiceOperator | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data } = await db.from("service_operators").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name ?? undefined,
    company: data.company ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    address: data.address ?? undefined,
    city: data.city ?? undefined,
    state: data.state ?? undefined,
    zip: data.zip ?? undefined,
    serviceType: (data.service_type ?? "junk_removal") as ServiceOperator["serviceType"],
    websiteUrl: data.website_url ?? undefined,
    source: data.source,
    score: data.score,
    priority: (data.priority ?? "good") as ServiceOperator["priority"],
    profileStatus: data.profile_status ?? undefined,
    scrapedAt: data.scraped_at,
  };
}

export async function listServiceOperators(
  filters: ServiceOperatorFilters = {}
): Promise<ServiceOperator[]> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.from("service_operators").select("*");

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.serviceType) q = q.eq("service_type", filters.serviceType);
  if (filters.hasEmail) q = q.not("email", "is", null);

  if (filters.sort === "newest") {
    q = q.order("scraped_at", { ascending: false });
  } else if (filters.sort === "name") {
    q = q.order("company", { ascending: true });
  } else {
    q = q.order("score", { ascending: false }).order("scraped_at", { ascending: false });
  }

  const { data, error } = await q.limit(300);
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name ?? undefined,
    company: r.company ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    zip: r.zip ?? undefined,
    serviceType: (r.service_type as ServiceOperator["serviceType"]) ?? "junk_removal",
    websiteUrl: r.website_url ?? undefined,
    source: r.source,
    score: r.score,
    priority: (r.priority as ServiceOperator["priority"]) ?? "good",
    profileStatus: r.profile_status ?? undefined,
    scrapedAt: r.scraped_at,
  }));
}
