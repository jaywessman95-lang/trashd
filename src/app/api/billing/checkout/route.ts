import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/lib/config/plans";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/integrations/stripe";
import { getCurrentUser } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  planId: z.enum(["starter", "pro", "elite"])
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Log in before starting checkout." }, { status: 401 });
  }

  const { planId } = checkoutSchema.parse(await request.json());
  const plan = PLANS.find((item) => item.id === planId);
  const origin = new URL(request.url).origin;

  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const priceId = env[plan.stripePriceEnvKey];

  if (!priceId) {
    return NextResponse.json({ error: `Missing ${plan.stripePriceEnvKey}.` }, { status: 500 });
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId: user.id,
        planId
      }
    },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    metadata: {
      userId: user.id,
      planId
    }
  });

  return NextResponse.json({ url: session.url });
}
