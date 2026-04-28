import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <AppShell navItems={[{ href: "/signup", label: "Signup" }]}>
      <section className="container hero compact-hero">
        <h1>Log in</h1>
        <p>Open the lead dashboard, settings, alerts, and billing for your junk removal territory.</p>
      </section>
      <section className="container auth-layout">
        <AuthForm mode="login" />
        <p className="muted">
          Need an account? <Link href="/signup">Create one</Link>. Forgot your password?{" "}
          <Link href="/reset-password">Reset it</Link>.
        </p>
      </section>
    </AppShell>
  );
}
