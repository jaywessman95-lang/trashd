export type ScrapeCoverage = "conservative" | "standard" | "deep" | "maximum";

export type ScrapeCoveragePreset = {
  id: ScrapeCoverage;
  label: string;
  description: string;
  maxListingsPerSource: number;
  maxPagesPerSource: number;
  lookbackHours: number;
};

export const SCRAPE_COVERAGE_PRESETS: ScrapeCoveragePreset[] = [
  {
    id: "conservative",
    label: "Conservative",
    description: "Small, quick scans for lower volume markets.",
    maxListingsPerSource: 25,
    maxPagesPerSource: 1,
    lookbackHours: 24
  },
  {
    id: "standard",
    label: "Standard",
    description: "Balanced coverage for most territories.",
    maxListingsPerSource: 75,
    maxPagesPerSource: 3,
    lookbackHours: 48
  },
  {
    id: "deep",
    label: "Deep",
    description: "More pages and older posts for busy markets.",
    maxListingsPerSource: 200,
    maxPagesPerSource: 6,
    lookbackHours: 96
  },
  {
    id: "maximum",
    label: "Maximum",
    description: "Highest coverage with firm caps to protect cost and stability.",
    maxListingsPerSource: 500,
    maxPagesPerSource: 10,
    lookbackHours: 168
  }
];

export const DEFAULT_SCRAPE_COVERAGE: ScrapeCoverage = "standard";
