import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { QuoteWizard } from "./quote-wizard";

export const metadata: Metadata = {
  title: "Get a Free Junk Removal & Moving Quote | Trashd",
  description: "Answer a few quick questions and get an instant price estimate for junk removal or moving help. No sign-up required."
};

const TRUST_POINTS = [
  { icon: "⚡", label: "Instant price range" },
  { icon: "📸", label: "Photos help your crew show up prepared" },
  { icon: "🔒", label: "No account or payment needed to get a quote" }
];

export default function GetQuotePage() {
  return (
    <AppShell>
      <section className="container quote-page">
        <div className="quote-hero">
          <div className="home-eyebrow quote-eyebrow">
            <span className="home-eyebrow-dot" />
            Free Instant Estimate
          </div>
          <h1 className="quote-h1">Get a Junk Removal or Moving Quote in Under a Minute</h1>
          <p className="quote-hero-sub">Answer a few quick questions, add photos if you have them, and see your price range instantly.</p>
          <div className="quote-trust-row">
            {TRUST_POINTS.map((point) => (
              <span className="quote-trust-item" key={point.label}>
                <span aria-hidden>{point.icon}</span> {point.label}
              </span>
            ))}
          </div>
        </div>

        <QuoteWizard />
      </section>
    </AppShell>
  );
}
