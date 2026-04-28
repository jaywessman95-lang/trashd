"use client";

import { useState } from "react";
import { buildOutreachMessage } from "@/lib/messaging/templates";
import type { DisplayLead } from "@/lib/sample-data";

type LeadActionsProps = {
  lead: DisplayLead;
};

export function LeadActions({ lead }: LeadActionsProps) {
  const [status, setStatus] = useState<string>("");

  async function copyMessage() {
    await navigator.clipboard.writeText(buildOutreachMessage(lead));
    setStatus("Message copied");
  }

  async function mark(action: "contacted" | "booked" | "dismissed" | "notAFit") {
    if (!lead.id) {
      setStatus("Action route ready. Database lead id required after ingestion.");
      return;
    }

    await fetch(`/api/leads/${lead.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [action]: true })
    });
    setStatus("Saved");
  }

  return (
    <>
      <div className="lead-actions">
        <a className="small-button" href={lead.url} rel="noreferrer" target="_blank">
          View Listing
        </a>
        <button className="small-button" onClick={copyMessage} type="button">
          Copy Message
        </button>
        <button className="small-button" onClick={() => mark("contacted")} type="button">
          Mark Contacted
        </button>
        <button className="small-button" onClick={() => mark("booked")} type="button">
          Booked
        </button>
        <button className="small-button" onClick={() => mark("notAFit")} type="button">
          Not A Fit
        </button>
      </div>
      {status ? <span className="action-status">{status}</span> : null}
    </>
  );
}
