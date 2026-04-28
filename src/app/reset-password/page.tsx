import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/components/auth-form";

export default function ResetPasswordPage() {
  return (
    <AppShell navItems={[{ href: "/login", label: "Login" }]}>
      <section className="container hero compact-hero">
        <h1>Reset password</h1>
        <p>Send a password reset link to the email attached to your account.</p>
      </section>
      <section className="container auth-layout">
        <AuthForm mode="reset" />
        <p className="muted">
          Remembered it? <Link href="/login">Log in</Link>.
        </p>
      </section>
    </AppShell>
  );
}
