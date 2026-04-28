import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/integrations/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const payload = await request.text();
  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await upsertCheckoutSubscription(session);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await updateSubscriptionStatus(subscription);
  }

  return NextResponse.json({ received: true });
}

async function upsertCheckoutSubscription(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.planId ?? "starter";

  if (!userId || !session.customer || !session.subscription) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: String(session.customer),
      stripe_subscription_id: String(session.subscription),
      plan,
      status: "active",
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

async function updateSubscriptionStatus(subscription: Stripe.Subscription) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      updated_at: new Date().toISOString()
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw error;
  }
}
