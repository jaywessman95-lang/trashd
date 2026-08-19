import type { JobSize, LeadType } from "@/lib/types";

export type QuoteJobType = "junk" | "moving" | "both";

export type JunkVolume = "few_items" | "quarter" | "half" | "three_quarter" | "full" | "multiple_loads";

export type MoveSize = "studio" | "one_bed" | "two_bed" | "three_bed" | "four_plus_bed";

export type ItemCategory =
  | "furniture"
  | "appliance"
  | "mattress"
  | "electronics"
  | "yard_waste"
  | "construction"
  | "boxes"
  | "exercise_equipment"
  | "hot_tub_large";

export type QuoteWizardInput = {
  jobType: QuoteJobType;
  junkVolume?: JunkVolume;
  moveSize?: MoveSize;
  itemCategories: ItemCategory[];
  stairs: boolean;
  photoCount: number;
};

export type QuoteEstimateLine = {
  label: string;
  low: number;
  high: number;
};

export type QuoteEstimate = {
  low: number;
  high: number;
  lines: QuoteEstimateLine[];
  jobSize: JobSize;
  leadType: LeadType;
};

export const JUNK_VOLUME_OPTIONS: Array<{ value: JunkVolume; label: string; hint: string; fillPct: number }> = [
  { value: "few_items", label: "A few items", hint: "1-3 items, no truck needed", fillPct: 10 },
  { value: "quarter", label: "1/4 truck load", hint: "Small room or a handful of furniture pieces", fillPct: 25 },
  { value: "half", label: "1/2 truck load", hint: "A garage, spare room, or several furniture pieces", fillPct: 50 },
  { value: "three_quarter", label: "3/4 truck load", hint: "Multiple rooms or a full garage", fillPct: 75 },
  { value: "full", label: "Full truck load", hint: "Whole apartment or heavy garage + yard", fillPct: 100 },
  { value: "multiple_loads", label: "Multiple truckloads", hint: "Full house or estate cleanout", fillPct: 130 }
];

export const MOVE_SIZE_OPTIONS: Array<{ value: MoveSize; label: string; hint: string }> = [
  { value: "studio", label: "Studio", hint: "~1-2 hours, 2-person crew" },
  { value: "one_bed", label: "1 Bedroom", hint: "~2-3 hours, 2-person crew" },
  { value: "two_bed", label: "2 Bedroom", hint: "~3-5 hours, 2-3 person crew" },
  { value: "three_bed", label: "3 Bedroom", hint: "~5-7 hours, 3-person crew" },
  { value: "four_plus_bed", label: "4+ Bedroom", hint: "Full day, 3-4 person crew" }
];

export const ITEM_CATEGORY_OPTIONS: Array<{ value: ItemCategory; label: string; icon: string }> = [
  { value: "furniture", label: "Furniture", icon: "🛋️" },
  { value: "appliance", label: "Appliances", icon: "🧊" },
  { value: "mattress", label: "Mattress / Box Spring", icon: "🛏️" },
  { value: "electronics", label: "Electronics", icon: "📺" },
  { value: "yard_waste", label: "Yard Waste", icon: "🌿" },
  { value: "construction", label: "Construction Debris", icon: "🧱" },
  { value: "boxes", label: "Boxes / General Junk", icon: "📦" },
  { value: "exercise_equipment", label: "Exercise Equipment", icon: "🏋️" },
  { value: "hot_tub_large", label: "Hot Tub / Extra-Large Item", icon: "🛁" }
];

const JUNK_VOLUME_PRICE: Record<JunkVolume, { low: number; high: number }> = {
  few_items: { low: 75, high: 125 },
  quarter: { low: 175, high: 250 },
  half: { low: 275, high: 375 },
  three_quarter: { low: 375, high: 475 },
  full: { low: 475, high: 600 },
  multiple_loads: { low: 650, high: 1200 }
};

const MOVE_SIZE_PRICE: Record<MoveSize, { low: number; high: number }> = {
  studio: { low: 300, high: 450 },
  one_bed: { low: 450, high: 650 },
  two_bed: { low: 650, high: 950 },
  three_bed: { low: 950, high: 1400 },
  four_plus_bed: { low: 1400, high: 2200 }
};

const ITEM_SURCHARGE: Partial<Record<ItemCategory, { low: number; high: number; label: string }>> = {
  mattress: { low: 25, high: 40, label: "Mattress / box spring fee" },
  appliance: { low: 30, high: 50, label: "Appliance disposal fee" },
  electronics: { low: 10, high: 20, label: "E-waste disposal fee" },
  construction: { low: 40, high: 75, label: "Construction debris fee" },
  exercise_equipment: { low: 20, high: 35, label: "Heavy item handling fee" },
  hot_tub_large: { low: 125, high: 250, label: "Oversized item fee" }
};

const STAIRS_SURCHARGE = { low: 25, high: 40 };

export function computeQuoteEstimate(input: QuoteWizardInput): QuoteEstimate {
  const lines: QuoteEstimateLine[] = [];

  if (input.jobType === "junk" || input.jobType === "both") {
    const volume = input.junkVolume ?? "quarter";
    const price = JUNK_VOLUME_PRICE[volume];
    lines.push({ label: `Junk removal - ${JUNK_VOLUME_OPTIONS.find((o) => o.value === volume)?.label ?? volume}`, ...price });
  }

  if (input.jobType === "moving" || input.jobType === "both") {
    const size = input.moveSize ?? "one_bed";
    const price = MOVE_SIZE_PRICE[size];
    lines.push({ label: `Moving help - ${MOVE_SIZE_OPTIONS.find((o) => o.value === size)?.label ?? size}`, ...price });
  }

  for (const category of input.itemCategories) {
    const surcharge = ITEM_SURCHARGE[category];
    if (surcharge) {
      lines.push({ label: surcharge.label, low: surcharge.low, high: surcharge.high });
    }
  }

  if (input.stairs) {
    lines.push({ label: "Stairs / no elevator access", ...STAIRS_SURCHARGE });
  }

  const low = lines.reduce((sum, line) => sum + line.low, 0);
  const high = lines.reduce((sum, line) => sum + line.high, 0);

  return {
    low,
    high,
    lines,
    jobSize: jobSizeFromInput(input),
    leadType: leadTypeFromInput(input)
  };
}

function jobSizeFromInput(input: QuoteWizardInput): JobSize {
  if (input.jobType === "junk" || input.jobType === "both") {
    if (input.junkVolume === "full" || input.junkVolume === "multiple_loads") return "large";
    if (input.junkVolume === "half" || input.junkVolume === "three_quarter") return "medium";
  }

  if (input.jobType === "moving" || input.jobType === "both") {
    if (input.moveSize === "three_bed" || input.moveSize === "four_plus_bed") return "large";
    if (input.moveSize === "two_bed") return "medium";
  }

  return "small";
}

function leadTypeFromInput(input: QuoteWizardInput): LeadType {
  if (input.jobType === "moving") return "moving";
  if (input.jobType === "both") return "moving";
  return "residential";
}

export function formatCurrencyRange(low: number, high: number): string {
  const fmt = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
  return `${fmt(low)} - ${fmt(high)}`;
}
