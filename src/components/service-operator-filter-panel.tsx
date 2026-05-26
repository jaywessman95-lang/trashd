import type { ServiceOperatorFilters, ServiceType } from "@/lib/service-operators/types";

const SERVICE_TYPES: ServiceType[] = ["junk_removal", "movers", "both"];

type Props = {
  filters: ServiceOperatorFilters;
  count: number;
};

export function ServiceOperatorFilterPanel({ filters, count }: Props) {
  return (
    <section className="container lead-filter-panel" aria-label="Service operator filters">
      <form className="lead-filter-form" action="/services-for-realtors">
        <label>
          City
          <input defaultValue={filters.city ?? ""} name="soCity" placeholder="Any city" />
        </label>
        <label>
          Service type
          <select defaultValue={filters.serviceType ?? ""} name="soServiceType">
            <option value="">All services</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatServiceType(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Has email
          <select defaultValue={filters.hasEmail ? "1" : ""} name="soHasEmail">
            <option value="">Any</option>
            <option value="1">Email only</option>
          </select>
        </label>
        <label>
          Sort
          <select defaultValue={filters.sort ?? "score"} name="soSort">
            <option value="score">Best score</option>
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <div className="lead-filter-actions">
          <button className="button" type="submit">
            Apply
          </button>
          <a className="small-button" href="/services-for-realtors">
            Clear
          </a>
        </div>
      </form>
      <div className="filter-summary-row">
        <p className="filter-summary">{count} service{count !== 1 ? "s" : ""} shown</p>
      </div>
    </section>
  );
}

export function parseOperatorFilters(
  params: Record<string, string | string[] | undefined>
): ServiceOperatorFilters {
  return {
    city: parseString(params.soCity),
    serviceType: parseEnum<ServiceType>(params.soServiceType, SERVICE_TYPES),
    hasEmail: params.soHasEmail === "1" ? true : undefined,
    sort: parseEnum(params.soSort, ["score", "newest", "name"] as const) ?? "score",
  };
}

function parseString(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function parseEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const first = parseString(value);
  return first && allowed.includes(first as T) ? (first as T) : undefined;
}

function formatServiceType(t: ServiceType): string {
  if (t === "junk_removal") return "Junk Removal";
  if (t === "movers") return "Movers";
  return "Junk Removal + Movers";
}
