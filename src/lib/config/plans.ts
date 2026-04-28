export type PlanId = "starter" | "pro" | "elite";

export type PlanConfig = {
  id: PlanId;
  label: string;
  monthlyPrice: number;
  stripePriceEnvKey: "STRIPE_STARTER_PRICE_ID" | "STRIPE_PRO_PRICE_ID" | "STRIPE_ELITE_PRICE_ID";
  features: string[];
};

export const PLANS: PlanConfig[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyPrice: 49,
    stripePriceEnvKey: "STRIPE_STARTER_PRICE_ID",
    features: ["All sources", "Dashboard", "Basic filters", "Daily Gmail summary"]
  },
  {
    id: "pro",
    label: "Pro",
    monthlyPrice: 99,
    stripePriceEnvKey: "STRIPE_PRO_PRICE_ID",
    features: ["All sources", "Advanced filters", "Instant hot lead alerts", "Lead actions", "Saved settings"]
  },
  {
    id: "elite",
    label: "Elite",
    monthlyPrice: 199,
    stripePriceEnvKey: "STRIPE_ELITE_PRICE_ID",
    features: ["All sources", "Priority territories", "Concierge setup", "Higher lead limits", "Premium support"]
  }
];
