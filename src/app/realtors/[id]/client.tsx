"use client";

import { useState } from "react";
import type { RealtorContactProfile } from "@/lib/sold-homes/repository";

function avatarInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type Props = {
  contact: RealtorContactProfile;
  token: string | null;
  canEdit: boolean;
};

export function RealtorProfileClient({ contact, token, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: contact.name ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    brokerage: contact.brokerage ?? "",
    aiBio: contact.aiBio ?? "",
  });

  const displayName = form.name || "Orange County Realtor";
  const isVerified = contact.profileStatus === "verified";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/realtors/${contact.id}`, {
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
          {contact.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="profile-avatar profile-avatar-img" src={contact.imageUrl} alt={displayName} />
          ) : (
            <div className="profile-avatar profile-avatar-initials">
              {avatarInitials(form.name || undefined)}
            </div>
          )}
        </div>
        <div className="profile-identity">
          <h1 className="profile-name">{displayName}</h1>
          {form.brokerage && !editing && <div className="profile-brokerage">{form.brokerage}</div>}
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
            Name
            <input
              className="profile-field-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
            />
          </label>
          <label className="profile-field-label">
            Brokerage
            <input
              className="profile-field-input"
              value={form.brokerage}
              onChange={(e) => setForm((f) => ({ ...f, brokerage: e.target.value }))}
              placeholder="Brokerage or company"
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
              placeholder="you@example.com"
            />
          </label>
          <label className="profile-field-label">
            Short Bio
            <textarea
              className="profile-field-input profile-field-textarea"
              value={form.aiBio}
              onChange={(e) => setForm((f) => ({ ...f, aiBio: e.target.value }))}
              placeholder="A couple sentences about you and your specialties..."
              rows={3}
            />
          </label>
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
          {form.aiBio && <p className="profile-bio">{form.aiBio}</p>}

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
            {!form.phone && !form.email && (
              <p className="muted">No contact information available.</p>
            )}
          </div>
        </>
      )}

      <div className="profile-footer-note">
        Listed on <strong>Trashd</strong> — connecting Orange County realtors with trusted junk removal &amp; cleanout services.
      </div>
    </div>
  );
}
