import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <AppShell>
      <section className="container hero">
        <h1>Settings</h1>
        <p>Control territories, score thresholds, sources, urgency, keywords, alert frequency, and lead limits.</p>
      </section>
      <section className="container">
        <SettingsForm />
      </section>
    </AppShell>
  );
}
