import type { SoldHomeFilters, PropertyType, ContactFilter } from "@/lib/sold-homes/types";

const CONTACT_FILTERS: { value: ContactFilter | ""; label: string }[] = [
  { value: "email_and_phone", label: "Email & Phone" },
  { value: "email_only",      label: "Email only" },
  { value: "phone_only",      label: "Phone only" },
  { value: "no_contact",      label: "No contact info" },
  { value: "",                label: "Show all" },
];

export const propertyTypes: PropertyType[] = ["single_family", "condo", "townhouse", "multi_family"];

type SoldHomeFilterPanelProps = {
  filters: SoldHomeFilters;
  homeCount: number;
};

export function SoldHomeFilterPanel({ filters, homeCount }: SoldHomeFilterPanelProps) {
  return (
    <section className="container lead-filter-panel" aria-label="Sold home filters">
      <form className="lead-filter-form" action="/leads">
        <input type="hidden" name="tab" value="realtors-just-sold" />
        <label>
          City
          <input defaultValue={filters.city ?? ""} name="shCity" placeholder="Any city" />
        </label>
        <label>
          Min sale price
          <select defaultValue={filters.minPrice ?? ""} name="shMinPrice">
            <option value="">Any price</option>
            <option value="200000">$200k+</option>
            <option value="400000">$400k+</option>
            <option value="600000">$600k+</option>
            <option value="800000">$800k+</option>
            <option value="1000000">$1M+</option>
          </select>
        </label>
        <label>
          Sold within
          <select defaultValue={filters.soldWithinHours ?? ""} name="shSoldWithin">
            <option value="">Any time</option>
            <option value="168">Last 7 days</option>
            <option value="336">Last 14 days</option>
            <option value="720">Last 30 days</option>
            <option value="1440">Last 60 days</option>
          </select>
        </label>
        <label>
          Property type
          <select defaultValue={filters.propertyType ?? ""} name="shPropertyType">
            <option value="">Any type</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatTitle(type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contact info
          <select defaultValue={filters.contactFilter ?? "email_and_phone"} name="shContactFilter">
            {CONTACT_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select defaultValue={filters.sort ?? "score"} name="shSort">
            <option value="score">Best score</option>
            <option value="newest">Newest sold</option>
            <option value="highest_price">Highest price</option>
            <option value="lowest_price">Lowest price</option>
          </select>
        </label>
        <div className="lead-filter-actions">
          <button className="button" type="submit">
            Apply Filters
          </button>
          <a className="small-button" href="/leads?tab=realtors-just-sold">
            Clear
          </a>
        </div>
      </form>
      <div className="filter-summary-row">
        <p className="filter-summary">{homeCount} sold homes shown</p>
      </div>
    </section>
  );
}

const contactFilterValues = ["phone_only", "email_only", "email_and_phone", "no_contact"] as const;

export function parseSoldHomeFilters(params: Record<string, string | string[] | undefined>): SoldHomeFilters {
  return {
    city: parseString(params.shCity),
    minPrice: parseOptionalNumber(params.shMinPrice),
    soldWithinHours: parseOptionalNumber(params.shSoldWithin),
    propertyType: parseEnum<PropertyType>(params.shPropertyType, propertyTypes),
    contactFilter: parseEnum<ContactFilter>(params.shContactFilter, contactFilterValues) ?? "email_and_phone",
    sort: parseEnum(params.shSort, ["newest", "highest_price", "lowest_price", "score"] as const) ?? "score"
  };
}

function parseString(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function parseOptionalNumber(value: string | string[] | undefined) {
  const parsed = Number(parseString(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const first = parseString(value);
  return first && allowed.includes(first as T) ? (first as T) : undefined;
}

function formatTitle(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
