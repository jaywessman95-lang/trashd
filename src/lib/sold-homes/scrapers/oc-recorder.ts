import { zyteGet } from "./zyte-client";
import type { SoldHomeLead } from "@/lib/sold-homes/types";

// OC Recorder "Grantor/Grantee" deed search — grant deeds = property sales
const URL = "https://cr.ocgov.com/recorderef/efstart.asp";

export async function scrapeOCRecorder(
  apiKey: string
): Promise<{ leads: Partial<SoldHomeLead>[]; rawCount: number }> {
  const { html } = await zyteGet(apiKey, { url: URL, httpResponseBody: true });

  const leads: Partial<SoldHomeLead>[] = [];

  // OC Recorder is a form-gated system; it requires POST searches
  // We can detect if the page loaded (form present) vs blocked
  const hasForm = html.includes("efstart") || html.includes("DocumentType") || html.includes("Search");
  const rawCount = hasForm ? 1 : 0;

  // Actual search would need a POST with document type "Grant Deed"
  // and date range filter — not fetchable with a simple GET

  return { leads, rawCount };
}
