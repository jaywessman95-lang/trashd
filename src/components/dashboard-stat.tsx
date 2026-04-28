type DashboardStatProps = {
  label: string;
  value: string;
};

export function DashboardStat({ label, value }: DashboardStatProps) {
  return (
    <div className="card metric">
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}
