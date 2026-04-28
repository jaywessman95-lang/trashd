import { getSourceConfig } from "@/lib/config/sources";
import type { LeadPriority, LeadScore, LeadType, NormalizedLeadCandidate } from "@/lib/types";

const negativeSignals = [
  "wanted",
  "iso",
  "repair",
  "service offered",
  "dealer",
  "collectible",
  "shipping only"
];

export function scoreLeadFallback(candidate: NormalizedLeadCandidate): LeadScore {
  const text = `${candidate.title} ${candidate.description ?? ""} ${candidate.price ?? ""}`.toLowerCase();
  const lifeEventScore = hasAny(text, ["moving", "downsizing", "estate", "storage", "auction", "garage sale"]) ? 25 : 0;
  const urgencyScore = hasAny(text, ["must go", "asap", "need gone", "pickup today", "today", "this weekend"]) ? 25 : 0;
  const volumeScore = hasAny(text, ["everything", "take all", "bulk", "garage", "furniture", "boxes", "household", "many items", "lot"]) ? 25 : 0;
  const valueDropScore = hasAny(text, ["free", "$0", "low price", "cheap"]) ? 25 : 0;
  const categoryScore = categoryScoreFromUrl(candidate.url);
  const negativePenalty = negativeSignals.reduce((total, signal) => total + (text.includes(signal) ? 10 : 0), 0);
  const imageScore = Math.min(candidate.imageCount, 10);
  const sourceBoost = getSourceConfig(candidate.source).confidenceBoost;
  const score = clamp(lifeEventScore + urgencyScore + volumeScore + valueDropScore + categoryScore + imageScore + sourceBoost - negativePenalty, 0, 100);

  return {
    score,
    priority: priorityFromScore(score),
    jobSize: candidate.imageCount >= 12 ? "large" : candidate.imageCount >= 5 ? "medium" : "unknown",
    leadType: leadTypeFromText(text),
    aiReason: "Fallback rules score based on urgency, volume, source confidence, images, and low-intent penalties.",
    scoringVersion: "fallback-v1"
  };
}

export function priorityFromScore(score: number): LeadPriority {
  if (score >= 90) return "hot_now";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  return "hidden";
}

function leadTypeFromText(text: string): LeadType {
  if (text.includes("moving") || text.includes("downsizing")) return "moving";
  if (text.includes("storage")) return "storage";
  if (text.includes("auction")) return "auction";
  if (text.includes("estate")) return "estate";
  if (text.includes("garage")) return "garage_sale";
  if (text.includes("free") || text.includes("curb alert")) return "free_bulk_pickup";
  return "unknown";
}

function hasAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function categoryScoreFromUrl(url: string): number {
  if (url.includes("/gms/")) return 15;
  if (url.includes("/zip/")) return 10;
  if (url.includes("/fuo/") || url.includes("/fua/")) return 5;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
