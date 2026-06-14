import { fetchAdminStats } from "@/lib/admin/stats";
import { AdminStatsChart } from "@/components/admin-stats-chart";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function pct(n: number, of: number) {
  if (!of) return "";
  return ` (${Math.round((n / of) * 100)}%)`;
}

type PipelineProps = {
  label: string;
  dot: "teal" | "blue";
  total: number;
  hasEmail: number;
  emailed: number;
  verified: number;
};

function Pipeline({ label, dot, total, hasEmail, emailed, verified }: PipelineProps) {
  const steps = [
    { value: total,    sub: "",                        name: "Scraped" },
    { value: hasEmail, sub: pct(hasEmail, total),      name: "Has email" },
    { value: emailed,  sub: pct(emailed, hasEmail),    name: "Outreached" },
    { value: verified, sub: pct(verified, emailed),    name: "Verified" },
  ];

  return (
    <div className="card admin-pipeline-card">
      <div className="admin-pipeline-title">
        <span className={`admin-pipeline-dot admin-dot-${dot}`} />
        {label}
      </div>
      <div className="admin-funnel">
        {steps.map((step, i) => (
          <>
            <div key={step.name} className={`admin-funnel-item${step.name === "Verified" ? " admin-funnel-highlight" : ""}`}>
              <span className="admin-funnel-value">{fmt(step.value)}</span>
              <span className="admin-funnel-label">
                {step.name}
                {step.sub ? <em className="admin-pct">{step.sub}</em> : null}
              </span>
            </div>
            {i < steps.length - 1 && <span key={`arr-${i}`} className="admin-funnel-arrow">→</span>}
          </>
        ))}
      </div>
    </div>
  );
}

export async function AdminOnboardingStats() {
  const stats = await fetchAdminStats();
  const { realtors, operators, queue } = stats;

  return (
    <section className="container admin-stats-section">
      <div className="admin-stats-header">
        <div>
          <h2>Outreach Dashboard</h2>
          <p className="muted">Real-time pipeline for realtor and operator outreach.</p>
        </div>
      </div>

      <div className="admin-pipeline-cols">
        <Pipeline label="Realtors" dot="teal"
          total={realtors.total} hasEmail={realtors.hasEmail}
          emailed={realtors.emailed} verified={realtors.verified}
        />
        <Pipeline label="Junk / Movers" dot="blue"
          total={operators.total} hasEmail={operators.hasEmail}
          emailed={operators.emailed} verified={operators.verified}
        />
      </div>

      <div className="card admin-queue-card">
        <div className="admin-pipeline-title">Verified Accounts</div>
        <div className="admin-queue-row">
          <div className="admin-queue-item">
            <span className="admin-queue-value admin-verified-realtor-val">{fmt(realtors.verified)}</span>
            <span className="admin-queue-label">Realtors verified</span>
          </div>
          <div className="admin-queue-divider" />
          <div className="admin-queue-item">
            <span className="admin-queue-value admin-verified-operator-val">{fmt(operators.verified)}</span>
            <span className="admin-queue-label">Junk / Movers verified</span>
          </div>
        </div>
      </div>

      <div className="card admin-queue-card">
        <div className="admin-pipeline-title">Email Queue</div>
        <div className="admin-queue-row">
          <div className="admin-queue-item">
            <span className="admin-queue-value admin-queue-pending-val">{fmt(queue.pending)}</span>
            <span className="admin-queue-label">Pending (scheduled)</span>
          </div>
          <div className="admin-queue-divider" />
          <div className="admin-queue-item">
            <span className="admin-queue-value admin-queue-sent-val">{fmt(queue.sent)}</span>
            <span className="admin-queue-label">Sent total</span>
          </div>
          <div className="admin-queue-divider" />
          <div className="admin-queue-item">
            <span className="admin-queue-value admin-queue-failed-val">{fmt(queue.failed)}</span>
            <span className="admin-queue-label">Failed</span>
          </div>
        </div>
      </div>

      <div className="card admin-chart-card">
        <div className="admin-pipeline-title">Activity — last 30 days</div>
        <AdminStatsChart data={stats.chart} />
      </div>
    </section>
  );
}
