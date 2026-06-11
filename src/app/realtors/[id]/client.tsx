"use client";

import { useState } from "react";
import type { RealtorContactProfile } from "@/lib/sold-homes/repository";

const OC_CITIES = [
  "Anaheim","Brea","Buena Park","Costa Mesa","Cypress","Dana Point",
  "Fountain Valley","Fullerton","Garden Grove","Huntington Beach","Irvine",
  "La Habra","La Palma","Laguna Beach","Laguna Hills","Laguna Niguel",
  "Laguna Woods","Lake Forest","Los Alamitos","Mission Viejo","Newport Beach",
  "Orange","Placentia","Rancho Santa Margarita","San Clemente","San Juan Capistrano",
  "Santa Ana","Seal Beach","Stanton","Tustin","Villa Park","Westminster","Yorba Linda",
];

const SPECIALTIES = [
  "Estate Sales","Pre-Listing Cleanouts","Post-Sale Cleanouts","Luxury Homes",
  "Investment Properties","Foreclosures & REO","Trust & Probate","Senior Transitions",
  "New Construction","First-Time Buyers",
];

function avatarInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function MultiCheck({
  options, selected, onChange,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  return (
    <div className="profile-multicheck">
      {options.map(opt => (
        <label key={opt} className="profile-check-item">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

type ExtendedRealtor = RealtorContactProfile & {
  licenseNumber?: string;
  yearsInRealEstate?: number;
  serviceAreas?: string[];
  specialties?: string[];
  preferredContact?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
};

type Props = {
  contact: ExtendedRealtor;
  token: string | null;
  canEdit: boolean;
};

export function RealtorProfileClient({ contact, token, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    name:               contact.name             ?? "",
    phone:              contact.phone            ?? "",
    email:              contact.email            ?? "",
    brokerage:          contact.brokerage        ?? "",
    aiBio:              contact.aiBio            ?? "",
    licenseNumber:      contact.licenseNumber    ?? "",
    yearsInRealEstate:  contact.yearsInRealEstate ?? "" as number | "",
    serviceAreas:       contact.serviceAreas     ?? [] as string[],
    specialties:        contact.specialties      ?? [] as string[],
    preferredContact:   contact.preferredContact ?? "email",
    websiteUrl:         contact.websiteUrl       ?? "",
    instagramUrl:       contact.instagramUrl     ?? "",
    linkedinUrl:        contact.linkedinUrl      ?? "",
  });

  const f = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const displayName = form.name || "Orange County Realtor";
  const isVerified  = contact.profileStatus === "verified";

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/profiles/realtors/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  return (
    <div className="profile-card">
      {/* Header */}
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
          {form.licenseNumber && !editing && (
            <div className="profile-license">CA DRE #{form.licenseNumber}</div>
          )}
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
          <h2 className="profile-section-title">Basic Info</h2>

          <label className="profile-field-label">
            Full Name
            <input className="profile-field-input" value={form.name}
              onChange={e => f("name", e.target.value)} placeholder="Your full name" />
          </label>
          <label className="profile-field-label">
            Brokerage / Company
            <input className="profile-field-input" value={form.brokerage}
              onChange={e => f("brokerage", e.target.value)} placeholder="Coldwell Banker, Keller Williams…" />
          </label>
          <label className="profile-field-label">
            CA DRE License #
            <input className="profile-field-input" value={form.licenseNumber}
              onChange={e => f("licenseNumber", e.target.value)} placeholder="01234567" />
          </label>
          <label className="profile-field-label">
            Years in Real Estate
            <input className="profile-field-input" type="number" min={0} max={60}
              value={form.yearsInRealEstate}
              onChange={e => f("yearsInRealEstate", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 8" />
          </label>
          <label className="profile-field-label">
            Short Bio
            <textarea className="profile-field-input profile-field-textarea" rows={3} value={form.aiBio}
              onChange={e => f("aiBio", e.target.value)}
              placeholder="A couple sentences about your focus and how you serve OC clients…" />
          </label>

          <h2 className="profile-section-title">Contact</h2>
          <label className="profile-field-label">
            Phone
            <input className="profile-field-input" value={form.phone}
              onChange={e => f("phone", e.target.value)} placeholder="(949) 555-0100" />
          </label>
          <label className="profile-field-label">
            Email
            <input className="profile-field-input" type="email" value={form.email}
              onChange={e => f("email", e.target.value)} placeholder="you@brokerage.com" />
          </label>
          <label className="profile-field-label">
            Preferred Contact Method
            <select className="profile-field-input" value={form.preferredContact}
              onChange={e => f("preferredContact", e.target.value)}>
              <option value="email">Email</option>
              <option value="phone">Phone call</option>
              <option value="text">Text message</option>
            </select>
          </label>
          <label className="profile-field-label">
            Website
            <input className="profile-field-input" value={form.websiteUrl}
              onChange={e => f("websiteUrl", e.target.value)} placeholder="https://yoursite.com" />
          </label>
          <label className="profile-field-label">
            Instagram
            <input className="profile-field-input" value={form.instagramUrl}
              onChange={e => f("instagramUrl", e.target.value)} placeholder="https://instagram.com/yourhandle" />
          </label>
          <label className="profile-field-label">
            LinkedIn
            <input className="profile-field-input" value={form.linkedinUrl}
              onChange={e => f("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/yourname" />
          </label>

          <h2 className="profile-section-title">Service Areas</h2>
          <p className="profile-field-hint">Select all OC cities you actively work in.</p>
          <MultiCheck options={OC_CITIES} selected={form.serviceAreas}
            onChange={v => f("serviceAreas", v)} />

          <h2 className="profile-section-title">Specialties</h2>
          <p className="profile-field-hint">Select the transaction types you specialize in.</p>
          <MultiCheck options={SPECIALTIES} selected={form.specialties}
            onChange={v => f("specialties", v)} />

          <div className="profile-edit-actions">
            <button className="profile-save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button className="profile-cancel-btn" type="button"
              onClick={() => { setEditing(false); setError(null); }} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {form.aiBio && <p className="profile-bio">{form.aiBio}</p>}

          {(form.yearsInRealEstate !== "") && (
            <div className="profile-stat-row">
              <span className="profile-stat">{form.yearsInRealEstate} years in real estate</span>
            </div>
          )}

          {/* Contact */}
          <div className="profile-contact-section">
            <h2 className="profile-section-title">Contact</h2>
            {form.phone && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Phone</span>
                <a className="profile-contact-value" href={`tel:${form.phone.replace(/\D/g,"")}`}>{form.phone}</a>
              </div>
            )}
            {form.email && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Email</span>
                <a className="profile-contact-value" href={`mailto:${form.email}`}>{form.email}</a>
              </div>
            )}
            {form.preferredContact && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Prefers</span>
                <span className="profile-contact-value">{form.preferredContact}</span>
              </div>
            )}
            {form.websiteUrl && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Website</span>
                <a className="profile-contact-value" href={form.websiteUrl} target="_blank" rel="noreferrer">
                  {form.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
            {(form.instagramUrl || form.linkedinUrl) && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Social</span>
                <span className="profile-contact-value profile-social-links">
                  {form.instagramUrl && (
                    <a href={form.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
                  )}
                  {form.linkedinUrl && (
                    <a href={form.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Service areas */}
          {form.serviceAreas.length > 0 && (
            <div className="profile-tags-section">
              <h2 className="profile-section-title">Service Areas</h2>
              <div className="profile-tags">
                {form.serviceAreas.map(c => <span key={c} className="profile-tag">{c}</span>)}
              </div>
            </div>
          )}

          {/* Specialties */}
          {form.specialties.length > 0 && (
            <div className="profile-tags-section">
              <h2 className="profile-section-title">Specialties</h2>
              <div className="profile-tags">
                {form.specialties.map(s => <span key={s} className="profile-tag profile-tag-accent">{s}</span>)}
              </div>
            </div>
          )}
        </>
      )}

      <div className="profile-footer-note">
        Listed on <strong>Trashd</strong> — connecting Orange County realtors with trusted junk removal &amp; cleanout services.
      </div>
    </div>
  );
}
