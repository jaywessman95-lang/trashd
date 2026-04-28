import type { LeadType, NormalizedLeadCandidate } from "@/lib/types";

export function buildOutreachMessage(lead: Pick<NormalizedLeadCandidate, "city" | "source" | "title"> & { leadType?: LeadType }) {
  const city = lead.city ?? "your area";

  if (lead.leadType === "estate") {
    return `Hi, I saw your estate sale in ${city}. We help clear out leftover furniture, boxes, garage items, and donation piles after sales. If you need a quick cleanout after the sale, we can usually come same day or next morning.`;
  }

  if (lead.leadType === "storage") {
    return `Hi, I saw the storage auction listing in ${city}. We help remove leftover junk, furniture, and mixed items after storage unit pickups. If you need cleanup help, we can move quickly.`;
  }

  return `Hi, I saw your post in ${city}. If you still have leftover furniture, boxes, garage items, or bulky junk after people pick through it, we can remove it quickly.`;
}
