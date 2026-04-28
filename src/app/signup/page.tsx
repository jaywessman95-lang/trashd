import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <AppShell navItems={[{ href: "/login", label: "Login" }]}>
      <section className="container hero compact-hero">
        <h1>Create account</h1>
        <p>Start the 7-day trial and configure your first lead territory.</p>
      </section>
      <section className="container auth-layout">
        <AuthForm mode="signup" />
        <p className="muted">
          Already have an account? <Link href="/login">Log in</Link>.
        </p>
      </section>
    </AppShell>
  );
}
