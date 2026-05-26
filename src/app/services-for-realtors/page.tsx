import { AppShell } from "@/components/app-shell";
import { ServiceOperatorFilterPanel, parseOperatorFilters } from "@/components/service-operator-filter-panel";
import { ServiceOperatorScrapeSettings } from "@/components/service-operator-scrape-settings";
import { ServiceOperatorTable } from "@/components/service-operator-table";
import { listServiceOperators } from "@/lib/service-operators/repository";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServicesForRealtorsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const filters = parseOperatorFilters(resolved);
  const operators = await listServiceOperators(filters);

  return (
    <AppShell>
      <section className="container hero">
        <h1>Services for Realtors</h1>
        <p>
          Browse vetted junk removal and moving services to refer your clients. Copy a referral
          message or contact them directly.
        </p>
      </section>

      <ServiceOperatorScrapeSettings />
      <ServiceOperatorFilterPanel filters={filters} count={operators.length} />
      <ServiceOperatorTable operators={operators} />
    </AppShell>
  );
}
