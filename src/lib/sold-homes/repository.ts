import { sampleSoldHomes } from "@/lib/sold-homes/sample-data";
import type { SoldHomeFilters, SoldHomeLead } from "@/lib/sold-homes/types";

export async function listSoldHomes(filters: SoldHomeFilters = {}): Promise<SoldHomeLead[]> {
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

  if (filters.minBeds) {
    results = results.filter((h) => (h.beds ?? 0) >= filters.minBeds!);
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
