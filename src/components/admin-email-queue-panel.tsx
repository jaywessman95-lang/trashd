"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QueuedEmail } from "@/lib/admin/queue";

type Phase = "idle" | "sending" | "done";

async function waitWithCountdown(
  seconds: number,
  onTick: (n: number) => void,
  stopRef: React.MutableRefObject<boolean>
): Promise<void> {
  return new Promise<void>((resolve) => {
    let remaining = seconds;
    onTick(remaining);
    const tick = setInterval(() => {
      remaining -= 1;
      onTick(remaining);
      if (remaining <= 0 || stopRef.current) {
        clearInterval(tick);
        resolve();
      }
    }, 1000);
  });
}

export function AdminEmailQueuePanel({ initialEmails }: { initialEmails: QueuedEmail[] }) {
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nextN, setNextN] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("");
  const [countdown, setCountdown] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    setEmails(initialEmails);
    setSelected(new Set());
    setNextN("");
    setPhase("idle");
    setSentCount(0);
    setFailedCount(0);
  }, [initialEmails]);

  function handleNextNChange(value: string) {
    setNextN(value);
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setSelected(new Set(emails.slice(0, n).map((e) => e.id)));
    } else {
      setSelected(new Set());
    }
  }

  function toggleAll() {
    if (selected.size === emails.length && emails.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(emails.map((e) => e.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendSelected() {
    const toSend = emails.filter((e) => selected.has(e.id));
    if (!toSend.length) return;

    stopRef.current = false;
    setPhase("sending");
    setSentCount(0);
    setFailedCount(0);
    let localSent = 0;
    let localFailed = 0;

    for (let i = 0; i < toSend.length; i++) {
      if (stopRef.current) break;

      const email = toSend[i];
      setCurrentLabel(`${email.recipient_name ?? email.recipient_email} (${i + 1}/${toSend.length})`);

      try {
        const res = await fetch("/api/admin/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: email.id }),
        });
        const data = await res.json();
        if (data.result === "sent") {
          localSent++;
          setSentCount(localSent);
          setEmails((prev) => prev.filter((e) => e.id !== email.id));
          setSelected((prev) => {
            const s = new Set(prev);
            s.delete(email.id);
            return s;
          });
        } else {
          localFailed++;
          setFailedCount(localFailed);
        }
      } catch {
        localFailed++;
        setFailedCount(localFailed);
      }

      if (i < toSend.length - 1 && !stopRef.current) {
        const intervalSecs = Math.floor(Math.random() * 61) + 60; // 60-120s
        await waitWithCountdown(intervalSecs, setCountdown, stopRef);
        setCountdown(0);
      }
    }

    setPhase("done");
    setCurrentLabel("");
    setCountdown(0);
  }

  function handleRefresh() {
    router.refresh();
  }

  const allChecked = emails.length > 0 && selected.size === emails.length;
  const indeterminate = selected.size > 0 && selected.size < emails.length;

  return (
    <section className="container admin-email-queue-section">
      <div className="admin-email-queue-header">
        <h2>
          Email Queue
          <span className="admin-eq-count">{emails.length} pending</span>
        </h2>
        <button
          className="admin-eq-refresh-btn"
          onClick={handleRefresh}
          disabled={phase === "sending"}
        >
          Refresh
        </button>
      </div>

      <div className="admin-eq-controls">
        <div className="admin-eq-select-n">
          <label htmlFor="eq-next-n">Select next</label>
          <input
            id="eq-next-n"
            type="number"
            min={1}
            max={emails.length || 1}
            value={nextN}
            onChange={(e) => handleNextNChange(e.target.value)}
            placeholder="N"
            disabled={phase === "sending"}
            className="admin-eq-n-input"
          />
          <label htmlFor="eq-next-n">emails</label>
        </div>

        <div className="admin-eq-actions">
          {phase !== "sending" ? (
            <>
              <button
                className="admin-eq-send-btn"
                onClick={sendSelected}
                disabled={selected.size === 0}
              >
                Send {selected.size > 0 ? `${selected.size} ` : ""}selected
              </button>
              {phase === "done" && (
                <span className="admin-eq-done-msg">
                  Done — {sentCount} sent{failedCount > 0 ? `, ${failedCount} failed` : ""}
                </span>
              )}
            </>
          ) : (
            <div className="admin-eq-progress">
              <span className="admin-eq-progress-label">Sending: {currentLabel}</span>
              {countdown > 0 && (
                <span className="admin-eq-countdown">Next in {countdown}s</span>
              )}
              <button
                className="admin-eq-stop-btn"
                onClick={() => {
                  stopRef.current = true;
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="admin-eq-table-wrap">
        <table className="admin-eq-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = indeterminate;
                  }}
                  onChange={toggleAll}
                  disabled={phase === "sending"}
                />
              </th>
              <th>Type</th>
              <th>Name</th>
              <th>Email</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-eq-empty">
                  No pending emails in queue
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  className={selected.has(email.id) ? "admin-eq-row-selected" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(email.id)}
                      onChange={() => toggleOne(email.id)}
                      disabled={phase === "sending"}
                    />
                  </td>
                  <td>
                    <span
                      className={`admin-eq-type-badge ${
                        email.type === "realtor"
                          ? "admin-eq-type-realtor"
                          : "admin-eq-type-operator"
                      }`}
                    >
                      {email.type}
                    </span>
                  </td>
                  <td>{email.recipient_name ?? "—"}</td>
                  <td className="admin-eq-email-cell">{email.recipient_email}</td>
                  <td className="admin-eq-date-cell">
                    {new Date(email.scheduled_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
