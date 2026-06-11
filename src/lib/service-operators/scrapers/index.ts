import { scrapeGoogleDorkEmails } from "./google-dork";
import { scrapeYellowPagesProfiles } from "./yellowpages-profiles";
import { scrapeGoogleMapsVendors } from "./google-maps";
import type { ServiceOperator } from "../types";

export { scrapeGoogleMapsVendors };

export async function runOperatorScrapers(maxLeads = 100): Promise<{
  operators: ServiceOperator[];
  bySource: Record<string, number>;
}> {
  const seenIds = new Set<string>();
  const operators: ServiceOperator[] = [];

  function addUnique(ops: ServiceOperator[]) {
    for (const op of ops) {
      if (!seenIds.has(op.id)) {
        seenIds.add(op.id);
        operators.push(op);
      }
    }
  }

  const [dork, ypProfiles] = await Promise.all([
    scrapeGoogleDorkEmails(Math.ceil(maxLeads * 0.6)),
    scrapeYellowPagesProfiles(Math.ceil(maxLeads * 0.4)),
  ]);

  addUnique(dork);
  addUnique(ypProfiles);

  const bySource: Record<string, number> = {};
  for (const op of operators) {
    bySource[op.source] = (bySource[op.source] ?? 0) + 1;
  }

  return { operators, bySource };
}
