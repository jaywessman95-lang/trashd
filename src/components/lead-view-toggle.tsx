"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function LeadViewToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCard = searchParams.get("view") === "card";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());

    if (isCard) {
      params.delete("view");
    } else {
      params.set("view", "card");
    }

    router.push(`/leads?${params.toString()}`);
  }

  return (
    <button className="small-button" onClick={toggle} type="button">
      {isCard ? "View Table Format" : "View Card Format"}
    </button>
  );
}
