"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/config/plans";

type PlanCheckoutButtonProps = {
  planId: PlanId;
};

export function PlanCheckoutButton({ planId }: PlanCheckoutButtonProps) {
  const [status, setStatus] = useState("");

  async function startCheckout() {
    setStatus("Opening checkout...");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId })
    });
    const data = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !data.url) {
      setStatus(data.error ?? "Checkout is not configured yet");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className="checkout-action">
      <button className="button" onClick={startCheckout} type="button">
        Start Trial
      </button>
      {status ? <span className="action-status">{status}</span> : null}
    </div>
  );
}
