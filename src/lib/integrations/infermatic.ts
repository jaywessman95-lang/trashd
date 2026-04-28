import { scoreLeadFallback } from "@/lib/scoring/rules";
import { priorityFromScore } from "@/lib/scoring/rules";
import { env } from "@/lib/env";
import type { LeadScore, NormalizedLeadCandidate } from "@/lib/types";

type InfermaticResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function scoreLeadWithInfermatic(candidate: NormalizedLeadCandidate): Promise<LeadScore> {
  if (!env.INFERMATIC_API_KEY || !env.INFERMATIC_MODEL) {
    return scoreLeadFallback(candidate);
  }

  try {
    const response = await fetch(env.INFERMATIC_BASE_URL ?? "https://api.totalgpt.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INFERMATIC_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.INFERMATIC_MODEL,
        temperature: 0.1,
        max_tokens: 500,
        top_k: 40,
        repetition_penalty: 1.1,
        messages: [
          {
            role: "system",
            content:
              [
                "You score leads for a junk removal company, not a resale buyer.",
                "Return only compact valid JSON with score, jobSize, leadType, and aiReason.",
                "score is 0-100.",
                "Score 90-100 only for urgent cleanout, moving, estate, storage, business liquidation, everything-must-go, or bulk removal signals.",
                "Score 70-89 for likely cleanout opportunities with multiple items, garage sale, moving sale, free bulky item, or strong deadline.",
                "Score ordinary single-item resale listings under 45, even if the item is furniture.",
                "Score delivery-available retail/reseller/dealer posts under 35 unless there is clear cleanout intent.",
                "Allowed jobSize values: small, medium, large, unknown.",
                "Allowed leadType values: residential, moving, estate, auction, storage, commercial, garage_sale, free_bulk_pickup, unknown."
              ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(candidate)
          }
        ]
      })
    });

    if (!response.ok) {
      return scoreLeadFallback(candidate);
    }

    const data = (await response.json()) as InfermaticResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return scoreLeadFallback(candidate);
    }

    const parsed = parseJsonContent(content);
    const score = clampScore(Number(parsed.score));

    return {
      score,
      priority: priorityFromScore(score),
      jobSize: normalizeJobSize(parsed.jobSize),
      leadType: normalizeLeadType(parsed.leadType),
      aiReason: typeof parsed.aiReason === "string" ? parsed.aiReason : "Infermatic scored this lead.",
      scoringVersion: "infermatic-v1"
    };
  } catch {
    return scoreLeadFallback(candidate);
  }
}

function parseJsonContent(content: string): Record<string, unknown> {
  const cleaned = content.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeJobSize(value: unknown): LeadScore["jobSize"] {
  if (value === "small" || value === "medium" || value === "large") return value;
  return "unknown";
}

function normalizeLeadType(value: unknown): LeadScore["leadType"] {
  const allowed = ["residential", "moving", "estate", "auction", "storage", "commercial", "garage_sale", "free_bulk_pickup", "unknown"];
  return typeof value === "string" && allowed.includes(value) ? (value as LeadScore["leadType"]) : "unknown";
}
