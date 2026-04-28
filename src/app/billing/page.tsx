import { AppShell } from "@/components/app-shell";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { PLANS } from "@/lib/config/plans";

export default function BillingPage() {
  return (
    <AppShell>
      <section className="container hero">
        <h1>Billing</h1>
        <p>All paid plans include every website. Plans differ by territories, lead limits, alerts, seats, and support.</p>
      </section>
      <section className="container grid">
        {PLANS.map((plan) => (
          <article className="card" key={plan.id}>
            <h2>{plan.label}</h2>
            <p className="muted">${plan.monthlyPrice}/mo</p>
            <p>{plan.features.join(", ")}</p>
            <PlanCheckoutButton planId={plan.id} />
          </article>
        ))}
      </section>
    </AppShell>
  );
}
