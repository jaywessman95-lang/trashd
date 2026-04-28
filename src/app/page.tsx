import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PLANS } from "@/lib/config/plans";

export default function HomePage() {
  return (
    <AppShell>
      <section className="container hero">
        <h1>AI lead finder for junk removal companies.</h1>
        <p>
          Find local cleanout opportunities before competitors see them, rank the best jobs, and alert operators when
          there is money nearby.
        </p>
        <div className="button-row">
          <Link className="button" href="/dashboard">
            Open Dashboard
          </Link>
          <Link className="button secondary" href="/settings">
            Configure Sources
          </Link>
        </div>
      </section>

      <section className="container grid" aria-label="Plans">
        {PLANS.map((plan) => (
          <article className="card" key={plan.id}>
            <h2>{plan.label}</h2>
            <p className="muted">${plan.monthlyPrice}/mo</p>
            <p>{plan.features.join(", ")}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
