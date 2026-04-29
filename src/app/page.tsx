import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TestimonialSlider } from "@/components/testimonial-slider";

const STATS = [
  { value: "7", label: "Platforms scanned" },
  { value: "0–100", label: "AI score per lead" },
  { value: "6am–9pm", label: "Daily coverage" }
];

const SOURCES = [
  "Craigslist", "OfferUp", "EstateSales.net", "StorageTreasures",
  "AuctionZip", "EstateSales.org", "GarageSaleFinder", "GSalr.com",
  "Craigslist", "OfferUp", "EstateSales.net", "StorageTreasures",
  "AuctionZip", "EstateSales.org", "GarageSaleFinder", "GSalr.com"
];

const STEPS = [
  {
    num: "01",
    icon: (
      <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="32">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: "We scan 7 platforms for cleanout leads",
    desc: "Craigslist, OfferUp, estate sale sites, auction boards — all combed automatically from 6am to 9pm while you're on the road."
  },
  {
    num: "02",
    icon: (
      <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="32">
        <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" /><path d="M22 2 12 12" /><circle cx="22" cy="2" r="1" />
      </svg>
    ),
    title: "AI scores every listing 0–100",
    desc: "Each post is analyzed for job size, urgency, photo count, seller intent, and cleanup potential. You only see the leads worth calling on."
  },
  {
    num: "03",
    icon: (
      <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="32">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect height="13" rx="2" width="13" x="9" y="11" /><path d="M17 11v-2a2 2 0 0 0-2-2H9" />
      </svg>
    ),
    title: "You land the job before anyone else",
    desc: "Hot leads hit your dashboard the moment they're scored. Filter by city, job size, type, and priority. Table or card view — your call."
  }
];

const FEATURES = [
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "Territory control",
    desc: "Set your service cities and radius. Trashd only surfaces jobs near your trucks — no noise from distant markets."
  },
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: "Fresh lead monitoring",
    desc: "Active from 6am to 9pm daily. By the time you finish a job, fresh leads are already ranked and waiting."
  },
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z" /><circle cx="12" cy="7" r="2" />
      </svg>
    ),
    title: "AI-scored 0–100",
    desc: "Every listing gets a score and a plain-English reason. Know exactly why a lead is hot before you make the call."
  },
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    title: "Instant alerts",
    desc: "Score 90+? You get notified immediately. Be the first operator to call on every high-value cleanout in your area."
  },
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
    title: "Smart filters",
    desc: "Slice by priority, job size, lead type, city, source, and time window. See exactly the jobs you want, nothing else."
  },
  {
    icon: (
      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
        <rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="3" x2="21" y1="15" y2="15" /><line x1="9" x2="9" y1="3" y2="21" />
      </svg>
    ),
    title: "Table & card view",
    desc: "Power-user table mode with sortable columns. Or classic card layout. Switch instantly without losing your filters."
  }
];

const LEAD_TYPES = [
  { label: "Estate Cleanouts", color: "#0f766e", bg: "#d9f3ef", icon: "🏠" },
  { label: "Moving Sales", color: "#1d4ed8", bg: "#eff6ff", icon: "📦" },
  { label: "Storage Auctions", color: "#7c3aed", bg: "#f5f3ff", icon: "🔒" },
  { label: "Curb Alerts", color: "#b45309", bg: "#fef9c3", icon: "🚨" },
  { label: "Garage Sales", color: "#0891b2", bg: "#ecfeff", icon: "🛒" },
  { label: "Free Bulk Pickup", color: "#dc2626", bg: "#fff1f2", icon: "♻️" }
];

export default function HomePage() {
  return (
    <AppShell>

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden />
        <div className="container home-hero-inner">
          <div className="home-hero-text">
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot" />
              AI-Powered Lead Engine for Junk Removal
            </div>
            <h1 className="home-h1">
              Stop Hunting Jobs.<br />
              <span className="home-h1-accent">Let Trashd Hunt for You.</span>
            </h1>
            <p className="home-hero-sub">
              Trashd scans 7 platforms, AI-scores every listing, and
              delivers the best cleanout opportunities straight to your dashboard —
              before your competitors even see them.
            </p>
            <div className="button-row">
              <Link className="button home-hero-cta" href="/dashboard">
                Start Finding Leads →
              </Link>
              <Link className="button secondary home-hero-secondary" href="/leads">
                See Live Leads
              </Link>
            </div>
          </div>

          {/* Mock lead card visual */}
          <div className="home-hero-visual" aria-hidden>
            <div className="mock-card mock-card-back">
              <div className="mock-card-header">
                <span className="mock-badge mock-badge-good">Good · 72</span>
                <span className="mock-source">craigslist</span>
              </div>
              <div className="mock-title">Garage cleanout — must go this weekend</div>
              <div className="mock-meta">Costa Mesa, CA · 14 photos</div>
            </div>
            <div className="mock-card mock-card-front">
              <div className="mock-card-header">
                <span className="mock-badge mock-badge-hot">🔥 Hot Now · 94</span>
                <span className="mock-source">estatesales.net</span>
              </div>
              <div className="mock-title">Full Estate Cleanout — 4BR House in Irvine</div>
              <div className="mock-meta">Irvine, CA · Large job · 38 photos</div>
              <div className="mock-reason">&quot;High urgency estate sale with full furniture, appliances, and yard items. Strong cleanup potential.&quot;</div>
              <div className="mock-actions">
                <span className="mock-btn">View Listing</span>
                <span className="mock-btn">Copy Message</span>
              </div>
            </div>
            <div className="mock-ping" />
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="home-stats">
        <div className="container home-stats-grid">
          {STATS.map((stat) => (
            <div className="home-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sources marquee ── */}
      <div className="home-marquee-wrap">
        <p className="home-marquee-label">Scanning</p>
        <div className="home-marquee">
          <div className="home-marquee-track">
            {SOURCES.map((src, i) => (
              <span className="home-marquee-item" key={i}>{src}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lead types ── */}
      <section className="home-leadtypes">
        <div className="container">
          <div className="home-section-label">What we find you</div>
          <h2 className="home-h2">Every Type of Cleanout Opportunity</h2>
          <div className="home-leadtypes-grid">
            {LEAD_TYPES.map((lt) => (
              <div className="home-leadtype-card" key={lt.label} style={{ "--lt-color": lt.color, "--lt-bg": lt.bg } as React.CSSProperties}>
                <span className="home-leadtype-icon">{lt.icon}</span>
                <span className="home-leadtype-label">{lt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="home-how">
        <div className="container">
          <div className="home-section-label">How it works</div>
          <h2 className="home-h2">Three Steps. Zero Manual Searching.</h2>
          <div className="home-steps">
            {STEPS.map((step) => (
              <div className="home-step" key={step.num}>
                <div className="home-step-num">{step.num}</div>
                <div className="home-step-icon">{step.icon}</div>
                <h3 className="home-step-title">{step.title}</h3>
                <p className="home-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="home-features">
        <div className="container">
          <div className="home-section-label">Platform features</div>
          <h2 className="home-h2">Built for Operators Who Move Fast</h2>
          <div className="home-features-grid">
            {FEATURES.map((f) => (
              <div className="home-feature-card" key={f.title}>
                <div className="home-feature-icon">{f.icon}</div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialSlider />

      {/* ── Final CTA ── */}
      <section className="home-final-cta">
        <div className="container home-final-cta-inner">
          <h2 className="home-final-title">Stop Refreshing Craigslist.<br />Start Landing Jobs.</h2>
          <p className="home-final-sub">
            Every hour you&apos;re not using Trashd, a competitor might be calling your next cleanout client.
          </p>
          <div className="button-row" style={{ justifyContent: "center" }}>
            <Link className="button home-final-btn" href="/dashboard">
              Open My Dashboard →
            </Link>
            <Link className="button secondary home-final-secondary" href="/settings">
              Configure Sources
            </Link>
          </div>
        </div>
      </section>

    </AppShell>
  );
}
