"use client";

import { useState } from "react";
import type { ServiceOperator } from "@/lib/service-operators/types";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  junk_removal: "Junk Removal",
  movers: "Moving Services",
  both: "Junk Removal & Moving",
};

function avatarInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type Props = {
  operator: ServiceOperator;
  token: string | null;
  canEdit: boolean;
};

export function OperatorProfileClient({ operator, token, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    company: operator.company ?? "",
    name: operator.name ?? "",
    phone: operator.phone ?? "",
    email: operator.email ?? "",
    websiteUrl: operator.websiteUrl ?? "",
    city: operator.city ?? "",
    state: operator.state ?? "CA",
  });

  const displayName = form.company || form.name || "Orange County Service Provider";
  const isVerified = operator.profileStatus === "verified";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/operators/${operator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar profile-avatar-initials">
            {avatarInitials(form.company || form.name || undefined)}
          </div>
        </div>
        <div className="profile-identity">
          <h1 className="profile-name">{displayName}</h1>
          {form.name && form.company && !editing && (
            <div className="profile-brokerage">{form.name}</div>
          )}
          <div className="profile-service-type">
            {SERVICE_TYPE_LABEL[operator.serviceType] ?? operator.serviceType}
          </div>
          <span className={isVerified ? "verified-badge" : "unverified-badge"}>
            {isVerified ? "Verified" : "Unverified"}
          </span>
        </div>
        {canEdit && !editing && (
          <button className="profile-edit-btn" type="button" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {saved && <p className="profile-save-success">Profile updated!</p>}
      {error && <p className="profile-save-error">{error}</p>}

      {editing ? (
        <div className="profile-edit-form">
          <label className="profile-field-label">
            Business Name
            <input
              className="profile-field-input"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company or business name"
            />
          </label>
          <label className="profile-field-label">
            Contact Name
            <input
              className="profile-field-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Owner or contact name"
            />
          </label>
          <label className="profile-field-label">
            Phone
            <input
              className="profile-field-input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(949) 555-0100"
            />
          </label>
          <label className="profile-field-label">
            Email
            <input
              className="profile-field-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@yourbusiness.com"
            />
          </label>
          <label className="profile-field-label">
            Website
            <input
              className="profile-field-input"
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              placeholder="https://yourbusiness.com"
            />
          </label>
          <div className="profile-field-row">
            <label className="profile-field-label profile-field-label-grow">
              City
              <input
                className="profile-field-input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Irvine"
              />
            </label>
            <label className="profile-field-label profile-field-label-short">
              State
              <input
                className="profile-field-input"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="CA"
                maxLength={2}
              />
            </label>
          </div>
          <div className="profile-edit-actions">
            <button
              className="profile-save-btn"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              className="profile-cancel-btn"
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {(form.city || form.state) && (
            <div className="profile-location">
              {[form.city, form.state].filter(Boolean).join(", ")}
            </div>
          )}

          <div className="profile-contact-section">
            <h2 className="profile-section-title">Contact</h2>
            {form.phone ? (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Phone</span>
                <a className="profile-contact-value" href={`tel:${form.phone.replace(/\D/g, "")}`}>
                  {form.phone}
                </a>
              </div>
            ) : null}
            {form.email ? (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Email</span>
                <a className="profile-contact-value" href={`mailto:${form.email}`}>
                  {form.email}
                </a>
              </div>
            ) : null}
            {form.websiteUrl ? (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Website</span>
                <a className="profile-contact-value" href={form.websiteUrl} target="_blank" rel="noreferrer">
                  {form.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ) : null}
            {!form.phone && !form.email && !form.websiteUrl && (
              <p className="muted">No contact information available.</p>
            )}
          </div>
        </>
      )}

      <div className="profile-footer-note">
        Listed on <strong>Trashd</strong> — connecting Orange County realtors with trusted junk removal &amp; moving services.
      </div>
    </div>
  );
}
