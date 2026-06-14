import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ChartEntry = {
  date: string;      // "YYYY-MM-DD"
  realtors: number;
  operators: number;
  sent: number;
  verifiedRealtors: number;
  verifiedOperators: number;
};

export type AdminStats = {
  realtors: { total: number; hasEmail: number; emailed: number; verified: number };
  operators: { total: number; hasEmail: number; emailed: number; verified: number };
  queue: { pending: number; sent: number; failed: number };
  chart: ChartEntry[];
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const db = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    rTotal, rHasEmail, rEmailed, rVerified,
    opTotal, opHasEmail, opEmailed, opVerified,
    qPending, qSent, qFailed,
    rDates, opDates, sentDates, rVerifiedDates, opVerifiedDates,
  ] = await Promise.all([
    db.from("realtor_contacts").select("*", { count: "exact", head: true }),
    db.from("realtor_contacts").select("*", { count: "exact", head: true }).not("email", "is", null),
    db.from("realtor_contacts").select("*", { count: "exact", head: true }).not("onboarding_email_sent_at", "is", null),
    db.from("realtor_contacts").select("*", { count: "exact", head: true }).eq("profile_status", "verified"),

    db.from("service_operators").select("*", { count: "exact", head: true }),
    db.from("service_operators").select("*", { count: "exact", head: true }).not("email", "is", null),
    db.from("service_operators").select("*", { count: "exact", head: true }).not("outreach_sent_at", "is", null),
    db.from("service_operators").select("*", { count: "exact", head: true }).eq("profile_status", "verified"),

    db.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "sent"),
    db.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),

    db.from("realtor_contacts").select("scraped_at").gte("scraped_at", thirtyDaysAgo).limit(10000),
    db.from("service_operators").select("scraped_at").gte("scraped_at", thirtyDaysAgo).limit(10000),
    db.from("email_queue").select("sent_at, type").eq("status", "sent").not("sent_at", "is", null).gte("sent_at", thirtyDaysAgo).limit(10000),
    db.from("realtor_contacts").select("verified_at").eq("profile_status", "verified").not("verified_at", "is", null).gte("verified_at", thirtyDaysAgo).limit(10000),
    db.from("service_operators").select("verified_at").eq("profile_status", "verified").not("verified_at", "is", null).gte("verified_at", thirtyDaysAgo).limit(10000),
  ]);

  // Build 30-day chart map initialised to zero
  const map = new Map<string, ChartEntry>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    map.set(key, { date: key, realtors: 0, operators: 0, sent: 0, verifiedRealtors: 0, verifiedOperators: 0 });
  }
  for (const r of rDates.data ?? []) {
    const e = map.get(r.scraped_at.slice(0, 10));
    if (e) e.realtors++;
  }
  for (const op of opDates.data ?? []) {
    const e = map.get(op.scraped_at.slice(0, 10));
    if (e) e.operators++;
  }
  for (const q of sentDates.data ?? []) {
    if (!q.sent_at) continue;
    const e = map.get(q.sent_at.slice(0, 10));
    if (e) e.sent++;
  }
  for (const r of rVerifiedDates.data ?? []) {
    if (!r.verified_at) continue;
    const e = map.get(r.verified_at.slice(0, 10));
    if (e) e.verifiedRealtors++;
  }
  for (const op of opVerifiedDates.data ?? []) {
    if (!op.verified_at) continue;
    const e = map.get(op.verified_at.slice(0, 10));
    if (e) e.verifiedOperators++;
  }

  return {
    realtors: {
      total:    rTotal.count    ?? 0,
      hasEmail: rHasEmail.count ?? 0,
      emailed:  rEmailed.count  ?? 0,
      verified: rVerified.count ?? 0,
    },
    operators: {
      total:    opTotal.count    ?? 0,
      hasEmail: opHasEmail.count ?? 0,
      emailed:  opEmailed.count  ?? 0,
      verified: opVerified.count ?? 0,
    },
    queue: {
      pending: qPending.count ?? 0,
      sent:    qSent.count    ?? 0,
      failed:  qFailed.count  ?? 0,
    },
    chart: Array.from(map.values()),
  };
}
