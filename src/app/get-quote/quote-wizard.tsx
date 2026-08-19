"use client";

import { useMemo, useState } from "react";
import {
  computeQuoteEstimate,
  formatCurrencyRange,
  ITEM_CATEGORY_OPTIONS,
  JUNK_VOLUME_OPTIONS,
  MOVE_SIZE_OPTIONS,
  type ItemCategory,
  type JunkVolume,
  type MoveSize,
  type QuoteJobType,
  type QuoteWizardInput
} from "@/lib/quotes/pricing";

type WizardStep = "jobType" | "junkVolume" | "moveSize" | "items" | "photos" | "access" | "estimate" | "contact" | "success";

type PhotoEntry = { id: string; file: File; previewUrl: string };

type ContactState = {
  name: string;
  phone: string;
  email: string;
  zip: string;
  city: string;
  preferredDate: string;
};

const MAX_PHOTOS = 8;

const JOB_TYPE_OPTIONS: Array<{ value: QuoteJobType; label: string; hint: string; icon: string }> = [
  { value: "junk", label: "Junk Removal", hint: "Haul away items you don't want", icon: "🗑️" },
  { value: "moving", label: "Moving Help", hint: "Load, move, and unload your stuff", icon: "🚚" },
  { value: "both", label: "Both", hint: "Some things go, some things move", icon: "📦" }
];

function stepsForJobType(jobType: QuoteJobType | null): WizardStep[] {
  const steps: WizardStep[] = ["jobType"];
  if (jobType === "junk" || jobType === "both") steps.push("junkVolume");
  if (jobType === "moving" || jobType === "both") steps.push("moveSize");
  if (jobType === "junk" || jobType === "both") steps.push("items");
  steps.push("photos", "access", "estimate", "contact", "success");
  return steps;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function QuoteWizard() {
  const [jobType, setJobType] = useState<QuoteJobType | null>(null);
  const [junkVolume, setJunkVolume] = useState<JunkVolume | null>(null);
  const [moveSize, setMoveSize] = useState<MoveSize | null>(null);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [stairs, setStairs] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [contact, setContact] = useState<ContactState>({ name: "", phone: "", email: "", zip: "", city: "", preferredDate: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverEstimate, setServerEstimate] = useState<{ low: number; high: number } | null>(null);

  const steps = useMemo(() => stepsForJobType(jobType), [jobType]);
  const step = steps[stepIndex] ?? "jobType";
  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  const wizardInput: QuoteWizardInput = {
    jobType: jobType ?? "junk",
    junkVolume: junkVolume ?? undefined,
    moveSize: moveSize ?? undefined,
    itemCategories,
    stairs,
    photoCount: photos.length
  };
  const estimate = computeQuoteEstimate(wizardInput);

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function selectJobType(value: QuoteJobType) {
    setJobType(value);
    setStepIndex(0);
    setTimeout(() => setStepIndex(1), 0);
  }

  function toggleCategory(value: ItemCategory) {
    setItemCategories((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handlePhotoInput(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setPhotoBusy(true);
    const remainingSlots = MAX_PHOTOS - photos.length;
    const incoming = Array.from(fileList).slice(0, Math.max(0, remainingSlots));
    const compressed = await Promise.all(incoming.map(compressImage));
    const entries: PhotoEntry[] = compressed.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setPhotos((prev) => [...prev, ...entries]);
    setPhotoBusy(false);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function updateContact<K extends keyof ContactState>(key: K, value: ContactState[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
  }

  const contactValid = contact.name.trim().length > 0 && contact.phone.trim().length >= 7 && contact.zip.trim().length >= 3;

  async function submitQuote() {
    if (!contactValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        jobType: jobType ?? "junk",
        junkVolume: junkVolume ?? undefined,
        moveSize: moveSize ?? undefined,
        itemCategories,
        stairs,
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        zip: contact.zip.trim(),
        city: contact.city.trim(),
        preferredDate: contact.preferredDate.trim(),
        honeypot
      };

      const formData = new FormData();
      formData.set("payload", JSON.stringify(payload));
      photos.forEach((p) => formData.append("photos", p.file, p.file.name));

      const response = await fetch("/api/quotes", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setServerEstimate({ low: data.estimate.low, high: data.estimate.high });
      goNext();
    } catch {
      setSubmitError("Network error - please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="quote-wizard-card">
      {step !== "success" && (
        <div className="quote-progress" aria-hidden>
          <div className="quote-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {step === "jobType" && (
        <div className="quote-step">
          <h2 className="quote-step-title">What do you need done?</h2>
          <p className="quote-step-sub">Pick one to get started - takes about a minute.</p>
          <div className="quote-option-grid">
            {JOB_TYPE_OPTIONS.map((opt) => (
              <button className="quote-option-card" key={opt.value} onClick={() => selectJobType(opt.value)} type="button">
                <span className="quote-option-icon">{opt.icon}</span>
                <span className="quote-option-label">{opt.label}</span>
                <span className="quote-option-hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "junkVolume" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">How much needs to go?</h2>
          <p className="quote-step-sub">Think in terms of truck space - doesn&apos;t need to be exact.</p>
          <div className="quote-option-grid quote-option-grid-list">
            {JUNK_VOLUME_OPTIONS.map((opt) => (
              <button
                className="quote-option-card quote-option-row"
                key={opt.value}
                onClick={() => {
                  setJunkVolume(opt.value);
                  goNext();
                }}
                type="button"
              >
                <span className="quote-truck-fill" aria-hidden>
                  <span className="quote-truck-fill-inner" style={{ width: `${Math.min(opt.fillPct, 100)}%` }} />
                </span>
                <span className="quote-option-row-text">
                  <span className="quote-option-label">{opt.label}</span>
                  <span className="quote-option-hint">{opt.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "moveSize" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">What size is the move?</h2>
          <p className="quote-step-sub">Rough home size is fine.</p>
          <div className="quote-option-grid quote-option-grid-list">
            {MOVE_SIZE_OPTIONS.map((opt) => (
              <button
                className="quote-option-card quote-option-row"
                key={opt.value}
                onClick={() => {
                  setMoveSize(opt.value);
                  goNext();
                }}
                type="button"
              >
                <span className="quote-option-row-text">
                  <span className="quote-option-label">{opt.label}</span>
                  <span className="quote-option-hint">{opt.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "items" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">What kind of items?</h2>
          <p className="quote-step-sub">Tap all that apply - this helps us catch any special handling fees.</p>
          <div className="quote-chip-grid">
            {ITEM_CATEGORY_OPTIONS.map((opt) => (
              <button
                className={`quote-chip${itemCategories.includes(opt.value) ? " quote-chip-selected" : ""}`}
                key={opt.value}
                onClick={() => toggleCategory(opt.value)}
                type="button"
              >
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
          <button className="button full-width quote-continue" onClick={goNext} type="button">
            Continue
          </button>
        </div>
      )}

      {step === "photos" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">Add a few photos</h2>
          <p className="quote-step-sub">Optional, but it helps your local pro show up with the right truck and crew.</p>

          <div className="quote-photo-grid">
            {photos.map((photo) => (
              <div className="quote-photo-thumb" key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Upload preview" src={photo.previewUrl} />
                <button aria-label="Remove photo" className="quote-photo-remove" onClick={() => removePhoto(photo.id)} type="button">
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="quote-photo-upload-btn">
                <input
                  accept="image/*"
                  capture="environment"
                  hidden
                  multiple
                  onChange={(e) => handlePhotoInput(e.target.files)}
                  type="file"
                />
                <span>{photoBusy ? "Adding…" : "+ Add Photo"}</span>
              </label>
            )}
          </div>

          <button className="button full-width quote-continue" onClick={goNext} type="button">
            {photos.length ? "Continue" : "Skip Photos"}
          </button>
        </div>
      )}

      {step === "access" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">Anything about access we should know?</h2>
          <label className="toggle-row" htmlFor="quote-stairs-toggle">
            <span className={`toggle-switch${stairs ? " toggle-on" : ""}`}>
              <input checked={stairs} id="quote-stairs-toggle" onChange={(e) => setStairs(e.target.checked)} type="checkbox" />
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">Stairs, and no elevator</span>
          </label>
          <button className="button full-width quote-continue" onClick={goNext} type="button">
            Continue
          </button>
        </div>
      )}

      {step === "estimate" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">Your instant estimate</h2>
          <div className="quote-estimate-price">{formatCurrencyRange(estimate.low, estimate.high)}</div>
          <p className="quote-step-sub">Final price is confirmed on-site - most jobs take 30-60 minutes.</p>
          <ul className="quote-estimate-breakdown">
            {estimate.lines.map((line) => (
              <li className="quote-estimate-line" key={line.label}>
                <span>{line.label}</span>
                <span>{formatCurrencyRange(line.low, line.high)}</span>
              </li>
            ))}
          </ul>
          <button className="button full-width quote-continue" onClick={goNext} type="button">
            Get My Free Quote →
          </button>
        </div>
      )}

      {step === "contact" && (
        <div className="quote-step">
          <BackButton onClick={goBack} />
          <h2 className="quote-step-title">Where should we send it?</h2>
          <p className="quote-step-sub">A local Trashd operator will confirm your price and book a time.</p>
          <div className="quote-contact-form">
            <label>
              Full name
              <input onChange={(e) => updateContact("name", e.target.value)} placeholder="Jane Smith" type="text" value={contact.name} />
            </label>
            <label>
              Phone number
              <input onChange={(e) => updateContact("phone", e.target.value)} placeholder="(555) 555-5555" type="tel" value={contact.phone} />
            </label>
            <label>
              Email (optional)
              <input onChange={(e) => updateContact("email", e.target.value)} placeholder="jane@email.com" type="email" value={contact.email} />
            </label>
            <label>
              ZIP code
              <input onChange={(e) => updateContact("zip", e.target.value)} placeholder="92614" type="text" value={contact.zip} />
            </label>
            <label>
              Preferred date (optional)
              <input onChange={(e) => updateContact("preferredDate", e.target.value)} type="date" value={contact.preferredDate} />
            </label>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="quote-honeypot"
              name="company_website"
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              type="text"
              value={honeypot}
            />
          </div>
          {submitError && <p className="quote-error">{submitError}</p>}
          <button className="button full-width quote-continue" disabled={!contactValid || submitting} onClick={submitQuote} type="button">
            {submitting ? "Submitting…" : "Send My Quote Request"}
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="quote-step quote-success">
          <span className="quote-success-icon">✅</span>
          <h2 className="quote-step-title">You&apos;re all set, {contact.name.split(" ")[0] || "there"}!</h2>
          <div className="quote-estimate-price">
            {serverEstimate ? formatCurrencyRange(serverEstimate.low, serverEstimate.high) : formatCurrencyRange(estimate.low, estimate.high)}
          </div>
          <p className="quote-step-sub">
            A local Trashd operator will text or call you at {contact.phone} shortly to confirm your price and get you on the schedule.
          </p>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="quote-back-btn" onClick={onClick} type="button">
      ← Back
    </button>
  );
}
