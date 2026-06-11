"use client";

import { useState, useMemo } from "react";
import type { ServiceOperator, PricingTier, Testimonial } from "@/lib/service-operators/types";
import { generateOperatorSummary } from "@/lib/service-operators/summary";

// ── Constants ────────────────────────────────────────────────────────────────

const OC_CITIES = [
  "Anaheim","Brea","Buena Park","Costa Mesa","Cypress","Dana Point",
  "Fountain Valley","Fullerton","Garden Grove","Huntington Beach","Irvine",
  "La Habra","La Palma","Laguna Beach","Laguna Hills","Laguna Niguel",
  "Laguna Woods","Lake Forest","Los Alamitos","Mission Viejo","Newport Beach",
  "Orange","Placentia","Rancho Santa Margarita","San Clemente","San Juan Capistrano",
  "Santa Ana","Seal Beach","Stanton","Tustin","Villa Park","Westminster","Yorba Linda",
];

const SERVICES_LIST = [
  "Full House Cleanouts","Estate Sale Cleanouts","Post-Sale Cleanouts",
  "Pre-Listing Cleanup","Hoarding Cleanouts","Furniture Removal Only",
  "Appliance Removal","Yard / Garage Junk","Construction Debris",
  "Donation Drop-Off","Eco-Friendly Recycling","Same-Day Service",
  "Local Moving","Long-Distance Moving","Piano Moving","Office Moving",
];

const CERT_OPTIONS = [
  "Licensed Waste Hauler",
  "EPA Certified",
  "Proper Disposal Certified",
  "BBB Accredited",
  "OSHA Compliant",
  "Background Checked",
  "Background Checked (All Crew)",
  "CA Contractor License",
  "DOT Registered",
  "AMSA ProMover",
  "Google Guaranteed",
];

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu",
  friday:"Fri", saturday:"Sat", sunday:"Sun",
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  junk_removal: "Junk Removal",
  movers: "Moving Services",
  both: "Junk Removal & Moving",
};

const STARS = ["★","★","★","★","★"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function avatarInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function StarBar({ rating }: { rating: number }) {
  return (
    <span className="profile-star-bar" aria-label={`${rating} stars`}>
      {STARS.map((s, i) => (
        <span key={i} className={i < Math.round(rating) ? "star-filled" : "star-empty"}>{s}</span>
      ))}
    </span>
  );
}

// ── Multi-checkbox ───────────────────────────────────────────────────────────

function MultiCheck({
  options, selected, onChange,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  return (
    <div className="profile-multicheck">
      {options.map(opt => (
        <label key={opt} className="profile-check-item">
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ── Tag input (for ZIPs) ─────────────────────────────────────────────────────

function TagInput({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim().replace(/\s+/g, "");
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="profile-tag-input-wrap">
      <div className="profile-tag-list">
        {tags.map(t => (
          <span key={t} className="profile-tag-chip">
            {t}
            <button type="button" className="profile-tag-remove" onClick={() => onChange(tags.filter(x => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <div className="profile-tag-input-row">
        <input
          className="profile-field-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <button type="button" className="profile-tag-add-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ── Pricing tier editor ──────────────────────────────────────────────────────

function PricingTierEditor({
  tiers, onChange,
}: { tiers: PricingTier[]; onChange: (v: PricingTier[]) => void }) {
  const update = (i: number, field: keyof PricingTier, val: string) => {
    const next = tiers.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    onChange(next);
  };
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));
  const add = () => onChange([...tiers, { label: "", price: "", note: "" }]);
  return (
    <div className="profile-tier-editor">
      {tiers.map((t, i) => (
        <div key={i} className="profile-tier-row">
          <input className="profile-field-input profile-tier-label"
            value={t.label} placeholder="e.g. 1/4 truck"
            onChange={e => update(i, "label", e.target.value)} />
          <input className="profile-field-input profile-tier-price"
            value={t.price} placeholder="e.g. $250–$350"
            onChange={e => update(i, "price", e.target.value)} />
          <input className="profile-field-input profile-tier-note"
            value={t.note ?? ""} placeholder="e.g. small room"
            onChange={e => update(i, "note", e.target.value)} />
          <button type="button" className="profile-tier-remove" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" className="profile-add-row-btn" onClick={add}>+ Add pricing tier</button>
    </div>
  );
}

// ── Testimonial editor ───────────────────────────────────────────────────────

function TestimonialEditor({
  items, onChange,
}: { items: Testimonial[]; onChange: (v: Testimonial[]) => void }) {
  const update = (i: number, field: keyof Testimonial, val: string) => {
    onChange(items.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { text: "", author: "", jobType: "", date: "" }]);
  return (
    <div className="profile-testimonial-editor">
      {items.map((t, i) => (
        <div key={i} className="profile-testimonial-edit-block">
          <textarea className="profile-field-input profile-field-textarea"
            value={t.text} placeholder='e.g. "Removed full house estate, same-day service, donated usable items."'
            onChange={e => update(i, "text", e.target.value)} rows={3} />
          <div className="profile-field-row">
            <input className="profile-field-input" value={t.author ?? ""} placeholder="Customer name (optional)"
              onChange={e => update(i, "author", e.target.value)} />
            <input className="profile-field-input" value={t.jobType ?? ""} placeholder="Job type (e.g. Estate Cleanout)"
              onChange={e => update(i, "jobType", e.target.value)} />
            <input className="profile-field-input" value={t.date ?? ""} placeholder="Date (e.g. March 2024)"
              onChange={e => update(i, "date", e.target.value)} />
          </div>
          <button type="button" className="profile-remove-item-btn" onClick={() => remove(i)}>Remove testimonial</button>
        </div>
      ))}
      <button type="button" className="profile-add-row-btn" onClick={add}>+ Add testimonial</button>
    </div>
  );
}

// ── Photo URL editor ─────────────────────────────────────────────────────────

function PhotoEditor({
  urls, onChange,
}: { urls: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !urls.includes(v)) onChange([...urls, v]);
    setInput("");
  };
  return (
    <div className="profile-photo-editor">
      {urls.map((u, i) => (
        <div key={i} className="profile-photo-edit-row">
          <span className="profile-photo-url-preview">{u.replace(/^https?:\/\//, "").slice(0, 50)}{u.length > 55 ? "…" : ""}</span>
          <button type="button" className="profile-tier-remove" onClick={() => onChange(urls.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <div className="profile-tag-input-row">
        <input className="profile-field-input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Paste photo URL (https://...)" />
        <button type="button" className="profile-tag-add-btn" onClick={add}>Add</button>
      </div>
      <p className="profile-field-hint">Add URLs for before/after photos. Scraped from your website automatically when you verify.</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  operator: ServiceOperator;
  token: string | null;
  canEdit: boolean;
};

type FormState = {
  company: string;
  name: string;
  phone: string;
  email: string;
  websiteUrl: string;
  city: string;
  state: string;
  serviceType: "junk_removal" | "movers" | "both";
  tagline: string;
  isLicensed: boolean;
  isInsured: boolean;
  yearsInBusiness: number | "";
  crewSize: number | "";
  numTrucks: number | "";
  servicesOffered: string[];
  serviceAreas: string[];
  serviceAreaZips: string[];
  maxJobSize: string;
  pricingInfo: string;
  pricingTiers: PricingTier[];
  photoUrls: string[];
  certifications: string[];
  licenseNumber: string;
  licenseState: string;
  testimonials: Testimonial[];
  fleetDescription: string;
  jobsCompleted: number | "";
  hoursJson: Record<string, string>;
  hasReferralProgram: boolean;
  referralCommission: number | "";
  ecoFriendly: boolean;
  instagramUrl: string;
};

export function OperatorProfileClient({ operator, token, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const defaultHours: Record<string, string> = {
    monday: "", tuesday: "", wednesday: "", thursday: "",
    friday: "", saturday: "", sunday: "",
  };

  const [form, setForm] = useState<FormState>({
    company:            operator.company          ?? "",
    name:               operator.name             ?? "",
    phone:              operator.phone            ?? "",
    email:              operator.email            ?? "",
    websiteUrl:         operator.websiteUrl       ?? "",
    city:               operator.city             ?? "",
    state:              operator.state            ?? "CA",
    serviceType:        operator.serviceType      ?? "junk_removal",
    tagline:            operator.tagline          ?? "",
    isLicensed:         operator.isLicensed       ?? false,
    isInsured:          operator.isInsured        ?? false,
    yearsInBusiness:    operator.yearsInBusiness  ?? "",
    crewSize:           operator.crewSize         ?? "",
    numTrucks:          operator.numTrucks        ?? "",
    servicesOffered:    operator.servicesOffered  ?? [],
    serviceAreas:       operator.serviceAreas     ?? [],
    serviceAreaZips:    operator.serviceAreaZips  ?? [],
    maxJobSize:         operator.maxJobSize       ?? "",
    pricingInfo:        operator.pricingInfo      ?? "",
    pricingTiers:       operator.pricingTiers     ?? [],
    photoUrls:          operator.photoUrls        ?? [],
    certifications:     operator.certifications   ?? [],
    licenseNumber:      operator.licenseNumber    ?? "",
    licenseState:       operator.licenseState     ?? "",
    testimonials:       operator.testimonials     ?? [],
    fleetDescription:   operator.fleetDescription ?? "",
    jobsCompleted:      operator.jobsCompleted    ?? "",
    hoursJson:          operator.hoursJson        ?? defaultHours,
    hasReferralProgram: operator.hasReferralProgram ?? false,
    referralCommission: operator.referralCommission ?? "",
    ecoFriendly:        operator.ecoFriendly      ?? false,
    instagramUrl:       operator.instagramUrl     ?? "",
  });

  const f = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const summary = useMemo(() => generateOperatorSummary(operator), [operator]);

  const displayName = form.company || form.name || "Orange County Service Provider";
  const isVerified  = operator.profileStatus === "verified";

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/profiles/operators/${operator.id}`, {
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

  // ── VIEW MODE ─────────────────────────────────────────────────────────────

  const hasRating    = !!operator.googleMapsRating && operator.googleMapsRating > 0;
  const hasHours     = Object.values(form.hoursJson ?? {}).some(v => v);
  const hasPhotos    = form.photoUrls.length > 0;
  const hasPricing   = form.pricingTiers.length > 0 || !!form.pricingInfo;
  const hasCerts     = form.certifications.length > 0 || !!form.licenseNumber;
  const hasTestims   = form.testimonials.length > 0;

  return (
    <div className="profile-card">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          {operator.logoUrl ? (
            <img
              src={operator.logoUrl}
              alt={`${form.company || "Company"} logo`}
              className="profile-avatar profile-avatar-logo"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="profile-avatar profile-avatar-initials"
            style={{ display: operator.logoUrl ? "none" : "flex" }}
          >
            {avatarInitials(form.company || form.name || undefined)}
          </div>
        </div>
        <div className="profile-identity">
          <h1 className="profile-name">{displayName}</h1>
          {form.tagline && !editing && <div className="profile-tagline">{form.tagline}</div>}
          <div className="profile-service-type">{SERVICE_TYPE_LABEL[form.serviceType] ?? form.serviceType}</div>
          <div className="profile-badges">
            <span className={isVerified ? "verified-badge" : "unverified-badge"}>
              {isVerified ? "Verified" : "Unverified"}
            </span>
            {form.isLicensed  && <span className="profile-badge-green">Licensed</span>}
            {form.isInsured   && <span className="profile-badge-green">Insured</span>}
            {form.ecoFriendly && <span className="profile-badge-eco">Eco-Friendly</span>}
          </div>
        </div>
        {canEdit && !editing && (
          <button className="profile-edit-btn" type="button" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {saved  && <p className="profile-save-success">Profile updated!</p>}
      {error  && <p className="profile-save-error">{error}</p>}

      {/* ══════════════════════════════════════════════════════════════════
          EDIT MODE
      ══════════════════════════════════════════════════════════════════ */}
      {editing ? (
        <div className="profile-edit-form">

          {/* Business Info */}
          <h2 className="profile-section-title">Business Info</h2>
          <label className="profile-field-label">
            Business Name
            <input className="profile-field-input" value={form.company}
              onChange={e => f("company", e.target.value)} placeholder="Company name" />
          </label>
          <label className="profile-field-label">
            Contact / Owner Name
            <input className="profile-field-input" value={form.name}
              onChange={e => f("name", e.target.value)} placeholder="Owner or manager name" />
          </label>
          <label className="profile-field-label">
            Tagline
            <input className="profile-field-input" value={form.tagline}
              onChange={e => f("tagline", e.target.value)}
              placeholder="e.g. Fast, reliable, same-day cleanouts across OC" />
          </label>
          <label className="profile-field-label">
            Service Type
            <select className="profile-field-input" value={form.serviceType}
              onChange={e => f("serviceType", e.target.value as FormState["serviceType"])}>
              <option value="junk_removal">Junk Removal</option>
              <option value="movers">Moving Services</option>
              <option value="both">Junk Removal & Moving</option>
            </select>
          </label>
          <div className="profile-field-row">
            <label className="profile-field-label profile-field-label-grow">
              Base City
              <input className="profile-field-input" value={form.city}
                onChange={e => f("city", e.target.value)} placeholder="Irvine" />
            </label>
            <label className="profile-field-label profile-field-label-short">
              State
              <input className="profile-field-input" value={form.state}
                onChange={e => f("state", e.target.value)} placeholder="CA" maxLength={2} />
            </label>
          </div>
          <label className="profile-field-label">
            Years in Business
            <input className="profile-field-input" type="number" min={0} max={80}
              value={form.yearsInBusiness}
              onChange={e => f("yearsInBusiness", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 8" />
          </label>

          {/* Contact */}
          <h2 className="profile-section-title">Contact</h2>
          <label className="profile-field-label">
            Phone
            <input className="profile-field-input" value={form.phone}
              onChange={e => f("phone", e.target.value)} placeholder="(949) 555-0100" />
          </label>
          <label className="profile-field-label">
            Email
            <input className="profile-field-input" type="email" value={form.email}
              onChange={e => f("email", e.target.value)} placeholder="you@yourbusiness.com" />
          </label>
          <label className="profile-field-label">
            Website
            <input className="profile-field-input" value={form.websiteUrl}
              onChange={e => f("websiteUrl", e.target.value)} placeholder="https://yourbusiness.com" />
          </label>
          <label className="profile-field-label">
            Instagram
            <input className="profile-field-input" value={form.instagramUrl}
              onChange={e => f("instagramUrl", e.target.value)} placeholder="https://instagram.com/yourbiz" />
          </label>

          {/* Crew & Capacity */}
          <h2 className="profile-section-title">Crew & Capacity</h2>
          <div className="profile-field-row">
            <label className="profile-field-label profile-field-label-grow">
              Crew Members
              <input className="profile-field-input" type="number" min={1} max={200}
                value={form.crewSize}
                onChange={e => f("crewSize", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 4" />
            </label>
            <label className="profile-field-label profile-field-label-grow">
              Trucks
              <input className="profile-field-input" type="number" min={1} max={100}
                value={form.numTrucks}
                onChange={e => f("numTrucks", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 2" />
            </label>
            <label className="profile-field-label profile-field-label-grow">
              Jobs Completed
              <input className="profile-field-input" type="number" min={0}
                value={form.jobsCompleted}
                onChange={e => f("jobsCompleted", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 500" />
            </label>
          </div>
          <label className="profile-field-label">
            Max Job Size
            <select className="profile-field-input" value={form.maxJobSize}
              onChange={e => f("maxJobSize", e.target.value)}>
              <option value="">Select max job size</option>
              <option value="small">Small (single room / few items)</option>
              <option value="medium">Medium (half a home)</option>
              <option value="large">Large (full home cleanout)</option>
              <option value="unlimited">Unlimited / any size</option>
            </select>
          </label>
          <label className="profile-field-label">
            Fleet & Equipment Description
            <textarea className="profile-field-input profile-field-textarea"
              value={form.fleetDescription}
              onChange={e => f("fleetDescription", e.target.value)}
              placeholder="e.g. 2 full-size 15-ft trucks, appliance dollies, piano moving equipment"
              rows={3} />
          </label>

          {/* Pricing */}
          <h2 className="profile-section-title">Pricing</h2>
          <p className="profile-field-hint">Add pricing tiers (Label / Price / Note). Shown as a table on your profile.</p>
          <PricingTierEditor tiers={form.pricingTiers} onChange={v => f("pricingTiers", v)} />
          <label className="profile-field-label" style={{ marginTop: 8 }}>
            Free-Text Pricing Note
            <input className="profile-field-input" value={form.pricingInfo}
              onChange={e => f("pricingInfo", e.target.value)}
              placeholder="e.g. Free quotes, starting at $150 for small loads" />
          </label>

          {/* Hours */}
          <h2 className="profile-section-title">Hours of Operation</h2>
          <div className="profile-hours-edit-grid">
            {DAYS.map(day => (
              <label key={day} className="profile-hours-edit-row">
                <span className="profile-hours-day-label">{DAY_LABELS[day]}</span>
                <input className="profile-field-input"
                  value={form.hoursJson[day] ?? ""}
                  onChange={e => f("hoursJson", { ...form.hoursJson, [day]: e.target.value })}
                  placeholder="e.g. 7am–7pm or Closed" />
              </label>
            ))}
          </div>

          {/* Photos */}
          <h2 className="profile-section-title">Before & After Photos</h2>
          <PhotoEditor urls={form.photoUrls} onChange={v => f("photoUrls", v)} />

          {/* Certifications */}
          <h2 className="profile-section-title">Certifications & Licenses</h2>
          <p className="profile-field-hint">Select all that apply to your business.</p>
          <MultiCheck options={CERT_OPTIONS} selected={form.certifications}
            onChange={v => f("certifications", v)} />
          <div className="profile-field-row" style={{ marginTop: 10 }}>
            <label className="profile-field-label profile-field-label-grow">
              License Number
              <input className="profile-field-input" value={form.licenseNumber}
                onChange={e => f("licenseNumber", e.target.value)}
                placeholder="e.g. WH-1234567" />
            </label>
            <label className="profile-field-label profile-field-label-short">
              State
              <input className="profile-field-input" value={form.licenseState}
                onChange={e => f("licenseState", e.target.value)}
                placeholder="CA" maxLength={2} />
            </label>
          </div>

          {/* Credentials */}
          <h2 className="profile-section-title">Credentials</h2>
          <div className="profile-checks-row">
            <label className="profile-check-item profile-check-large">
              <input type="checkbox" checked={form.isLicensed}
                onChange={e => f("isLicensed", e.target.checked)} />
              <span>Licensed</span>
            </label>
            <label className="profile-check-item profile-check-large">
              <input type="checkbox" checked={form.isInsured}
                onChange={e => f("isInsured", e.target.checked)} />
              <span>Insured / Bonded</span>
            </label>
            <label className="profile-check-item profile-check-large">
              <input type="checkbox" checked={form.ecoFriendly}
                onChange={e => f("ecoFriendly", e.target.checked)} />
              <span>Eco-Friendly / Recycles</span>
            </label>
          </div>
          <label className="profile-check-item profile-check-large profile-referral-check">
            <input type="checkbox" checked={form.hasReferralProgram}
              onChange={e => f("hasReferralProgram", e.target.checked)} />
            <span>I offer a realtor referral program</span>
          </label>
          {form.hasReferralProgram && (
            <label className="profile-field-label">
              Referral Commission (%)
              <input className="profile-field-input profile-field-short" type="number" min={0} max={50}
                value={form.referralCommission}
                onChange={e => f("referralCommission", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 5" />
            </label>
          )}

          {/* Services */}
          <h2 className="profile-section-title">Services Offered</h2>
          <p className="profile-field-hint">Select all services you provide.</p>
          <MultiCheck options={SERVICES_LIST} selected={form.servicesOffered}
            onChange={v => f("servicesOffered", v)} />

          {/* Service Areas */}
          <h2 className="profile-section-title">Service Areas</h2>
          <p className="profile-field-hint">Select all OC cities you cover.</p>
          <MultiCheck options={OC_CITIES} selected={form.serviceAreas}
            onChange={v => f("serviceAreas", v)} />
          <p className="profile-field-hint" style={{ marginTop: 10 }}>ZIP codes you serve (type and press Enter).</p>
          <TagInput tags={form.serviceAreaZips} onChange={v => f("serviceAreaZips", v)}
            placeholder="e.g. 92612" />

          {/* Testimonials */}
          <h2 className="profile-section-title">Customer Testimonials</h2>
          <p className="profile-field-hint">Add real quotes from customers you've served. Realtors read these closely.</p>
          <TestimonialEditor items={form.testimonials} onChange={v => f("testimonials", v)} />

          {/* Scraped data notice */}
          {(operator.googleMapsRating || operator.googleResponseTime) && (
            <div className="profile-scraped-notice">
              <strong>Auto-filled from Google:</strong> Star ratings, response time, and review snippets
              are scraped automatically from your Google Business Profile and cannot be edited here.
            </div>
          )}

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

        /* ══════════════════════════════════════════════════════════════
            VIEW MODE
        ══════════════════════════════════════════════════════════════ */
        <>
          {/* 1 — Reviews & Star Ratings ──────────────────────────────── */}
          {hasRating && (
            <div className="profile-section">
              <h2 className="profile-section-title">Reviews & Ratings</h2>
              <div className="profile-rating-block">
                <div className="profile-rating-big">
                  <span className="profile-rating-number">{operator.googleMapsRating!.toFixed(1)}</span>
                  <StarBar rating={operator.googleMapsRating!} />
                  <span className="profile-rating-count">
                    {operator.googleReviewCount?.toLocaleString()} review{operator.googleReviewCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {operator.googleLastReviewAt && (
                  <div className="profile-review-recency">
                    Last reviewed: {new Date(operator.googleLastReviewAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                )}
                {/* 2 — Response Time ──────────────────────────────────── */}
                {operator.googleResponseTime && (
                  <div className="profile-response-time">
                    <span className="profile-response-icon">⚡</span>
                    {operator.googleResponseTime}
                  </div>
                )}
                {!operator.googleResponseTime && operator.googleResponseRate && (
                  <div className="profile-response-time">
                    <span className="profile-response-icon">⚡</span>
                    Responds to {operator.googleResponseRate === "most" ? "most inquiries" : "some inquiries"}
                  </div>
                )}
                {operator.reviewSnippet && (
                  <blockquote className="profile-review-snippet">
                    &ldquo;{operator.reviewSnippet}&rdquo;
                  </blockquote>
                )}
              </div>
            </div>
          )}

          {/* AI Summary for Realtors */}
          {(summary.pros.length > 0 || summary.cons.length > 0 || summary.realtorNotes.length > 0) && (
            <div className="profile-section profile-summary-section">
              <h2 className="profile-section-title">Quick Summary for Realtors</h2>
              <div className="profile-summary-grid">
                {summary.pros.length > 0 && (
                  <div className="profile-summary-col profile-summary-pros">
                    <div className="profile-summary-col-label">Pros</div>
                    <ul className="profile-summary-list">
                      {summary.pros.map((item, i) => (
                        <li key={i} className="profile-summary-item profile-summary-pro">
                          <span className="profile-summary-icon">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.cons.length > 0 && (
                  <div className="profile-summary-col profile-summary-cons">
                    <div className="profile-summary-col-label">Cons</div>
                    <ul className="profile-summary-list">
                      {summary.cons.map((item, i) => (
                        <li key={i} className="profile-summary-item profile-summary-con">
                          <span className="profile-summary-icon">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {summary.realtorNotes.length > 0 && (
                <div className="profile-summary-realtor-notes">
                  <div className="profile-summary-col-label">Key Details for Realtors</div>
                  <ul className="profile-summary-list">
                    {summary.realtorNotes.map((note, i) => (
                      <li key={i} className="profile-summary-item profile-summary-note">
                        <span className="profile-summary-icon">→</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="profile-stat-row">
            {form.yearsInBusiness !== "" && (
              <div className="profile-stat">
                <span className="profile-stat-value">{form.yearsInBusiness}</span>
                <span className="profile-stat-label">yrs in business</span>
              </div>
            )}
            {form.jobsCompleted !== "" && (
              <div className="profile-stat profile-stat-highlight">
                <span className="profile-stat-value">{Number(form.jobsCompleted).toLocaleString()}+</span>
                <span className="profile-stat-label">jobs completed</span>
              </div>
            )}
            {form.crewSize !== "" && (
              <div className="profile-stat">
                <span className="profile-stat-value">{form.crewSize}</span>
                <span className="profile-stat-label">crew</span>
              </div>
            )}
            {form.numTrucks !== "" && (
              <div className="profile-stat">
                <span className="profile-stat-value">{form.numTrucks}</span>
                <span className="profile-stat-label">truck{Number(form.numTrucks) !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="profile-section">
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
            {form.websiteUrl && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Website</span>
                <a className="profile-contact-value" href={form.websiteUrl} target="_blank" rel="noreferrer">
                  {form.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
            {form.instagramUrl && (
              <div className="profile-contact-row">
                <span className="profile-contact-label">Instagram</span>
                <a className="profile-contact-value" href={form.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
              </div>
            )}
          </div>

          {/* Referral program */}
          {form.hasReferralProgram && (
            <div className="profile-referral-banner">
              Realtor Referral Program
              {form.referralCommission !== "" && form.referralCommission
                ? ` — ${form.referralCommission}% commission on completed jobs`
                : ""}
            </div>
          )}

          {/* Services */}
          {form.servicesOffered.length > 0 && (
            <div className="profile-section">
              <h2 className="profile-section-title">Services Offered</h2>
              <div className="profile-tags">
                {form.servicesOffered.map(s => <span key={s} className="profile-tag">{s}</span>)}
              </div>
            </div>
          )}

          {/* 3 — Service Area Coverage ───────────────────────────────── */}
          {(form.serviceAreas.length > 0 || form.serviceAreaZips.length > 0) && (
            <div className="profile-section">
              <h2 className="profile-section-title">Service Area Coverage</h2>
              {form.serviceAreas.length > 0 && (
                <div className="profile-tags" style={{ marginBottom: form.serviceAreaZips.length > 0 ? 8 : 0 }}>
                  {form.serviceAreas.map(c => <span key={c} className="profile-tag">{c}</span>)}
                </div>
              )}
              {form.serviceAreaZips.length > 0 && (
                <div className="profile-tags">
                  {form.serviceAreaZips.map(z => <span key={z} className="profile-tag profile-tag-zip">{z}</span>)}
                </div>
              )}
            </div>
          )}

          {/* 4 — Pricing ─────────────────────────────────────────────── */}
          {hasPricing && (
            <div className="profile-section">
              <h2 className="profile-section-title">Pricing</h2>
              {form.pricingTiers.length > 0 && (
                <table className="profile-pricing-table">
                  <thead>
                    <tr>
                      <th>Load Size</th>
                      <th>Price Range</th>
                      <th className="profile-pricing-note-col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.pricingTiers.map((t, i) => (
                      <tr key={i}>
                        <td>{t.label}</td>
                        <td className="profile-pricing-price">{t.price}</td>
                        <td className="profile-pricing-note-col">{t.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {form.pricingInfo && <p className="profile-bio" style={{ marginTop: 8 }}>{form.pricingInfo}</p>}
            </div>
          )}

          {/* 5 — Hours of Operation ──────────────────────────────────── */}
          {hasHours && (
            <div className="profile-section">
              <h2 className="profile-section-title">Hours of Operation</h2>
              <div className="profile-hours-grid">
                {DAYS.filter(d => form.hoursJson[d]).map(day => (
                  <div key={day} className="profile-hours-row">
                    <span className="profile-hours-day">{DAY_LABELS[day]}</span>
                    <span className="profile-hours-time">{form.hoursJson[day]}</span>
                  </div>
                ))}
              </div>
              {operator.hoursDescription && !hasHours && (
                <p className="profile-bio">{operator.hoursDescription}</p>
              )}
            </div>
          )}
          {!hasHours && operator.hoursDescription && (
            <div className="profile-section">
              <h2 className="profile-section-title">Availability</h2>
              <p className="profile-bio">{operator.hoursDescription}</p>
            </div>
          )}

          {/* 6 — Photos ─────────────────────────────────────────────── */}
          {hasPhotos && (
            <div className="profile-section">
              <h2 className="profile-section-title">Photos</h2>
              <div className="profile-photo-grid">
                {form.photoUrls.map((url, i) => {
                  const label = /before/i.test(url) ? "Before" :
                    /after/i.test(url) ? "After" :
                    /truck|fleet|vehicle/i.test(url) ? "Fleet" :
                    /team|crew|staff/i.test(url) ? "Team" :
                    /logo/i.test(url) ? "Logo" :
                    `Photo ${i + 1}`;
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="profile-photo-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={label} className="profile-photo-img" loading="lazy"
                        onError={e => { (e.currentTarget.closest(".profile-photo-item") as HTMLElement | null)?.remove(); }}
                      />
                      <span className="profile-photo-label">{label}</span>
                    </a>
                  );
                })}
              </div>
              <p className="profile-photo-source-note">Photos sourced from Google Maps and company website</p>
            </div>
          )}

          {/* 7 — Certifications & Licenses ──────────────────────────── */}
          {hasCerts && (
            <div className="profile-section">
              <h2 className="profile-section-title">Certifications & Licenses</h2>
              {form.certifications.length > 0 && (
                <div className="profile-cert-list">
                  {form.certifications.map(c => (
                    <span key={c} className="profile-cert-badge">✓ {c}</span>
                  ))}
                </div>
              )}
              {(form.licenseNumber || form.licenseState) && (
                <div className="profile-license-row">
                  <span className="profile-contact-label">License</span>
                  <span className="profile-contact-value">
                    {form.licenseNumber}
                    {form.licenseState ? ` (${form.licenseState})` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 10 — Vehicle Fleet & Equipment ─────────────────────────── */}
          {(form.fleetDescription || (form.numTrucks !== "" && form.numTrucks)) && (
            <div className="profile-section">
              <h2 className="profile-section-title">Fleet & Equipment</h2>
              {form.fleetDescription
                ? <p className="profile-bio">{form.fleetDescription}</p>
                : (
                  <p className="profile-bio">
                    {form.numTrucks} truck{Number(form.numTrucks) !== 1 ? "s" : ""}
                    {form.maxJobSize ? `, handles ${form.maxJobSize} jobs` : ""}
                  </p>
                )
              }
            </div>
          )}

          {/* 8 — Customer Testimonials ──────────────────────────────── */}
          {hasTestims && (
            <div className="profile-section">
              <h2 className="profile-section-title">Customer Testimonials</h2>
              <div className="profile-testimonial-list">
                {form.testimonials.map((t, i) => (
                  <blockquote key={i} className="profile-testimonial">
                    <p className="profile-testimonial-text">&ldquo;{t.text}&rdquo;</p>
                    {(t.author || t.jobType || t.date) && (
                      <footer className="profile-testimonial-meta">
                        {t.author && <strong>{t.author}</strong>}
                        {t.jobType && <span> · {t.jobType}</span>}
                        {t.date    && <span> · {t.date}</span>}
                      </footer>
                    )}
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* 9 — Jobs Completed — shown in stats row above if set */}
          {/* Max job size */}
          {form.maxJobSize && (
            <div className="profile-section">
              <h2 className="profile-section-title">Max Job Capacity</h2>
              <p className="profile-bio">
                {{
                  small: "Small loads — single room or a few items",
                  medium: "Medium loads — up to half a home",
                  large: "Large loads — full home cleanouts",
                  unlimited: "Any size — no job too big",
                }[form.maxJobSize] ?? form.maxJobSize}
              </p>
            </div>
          )}
        </>
      )}

      <div className="profile-footer-note">
        Listed on <strong>Trashd</strong> — connecting Orange County realtors with trusted junk removal &amp; moving services.
      </div>
    </div>
  );
}
