"use client";

import { useState } from "react";

type AuthFormProps = {
  mode: "login" | "signup" | "reset";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const endpoint = mode === "login" ? "/api/auth/login" : mode === "signup" ? "/api/auth/signup" : "/api/auth/reset";
  const submitLabel = mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link";
  const showGoogle = mode !== "reset";

  return (
    <div className="form-panel">
      {showGoogle ? (
        <>
          <form action="/api/auth/google" method="post">
            <button className="button secondary full-width" type="submit">
              Continue with Google
            </button>
          </form>
          <div className="divider" role="separator">
            <span>or</span>
          </div>
        </>
      ) : null}
      <form
        className="form-panel compact-form"
        onSubmit={() => {
          setPending(true);
        }}
        action={endpoint}
        method="post"
      >
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        {mode !== "reset" ? (
          <label>
            Password
            <input autoComplete={mode === "login" ? "current-password" : "new-password"} name="password" required type="password" />
          </label>
        ) : null}
        <button className="button" disabled={pending} type="submit">
          {pending ? "Working..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
