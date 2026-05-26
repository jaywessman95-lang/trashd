import type { RealtorContact } from "./types";

const PHONE_RE = /(\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const CORP_AREA_CODES = new Set(["800", "844", "855", "866", "877", "888"]);
const CORP_EMAIL_RE =
  /example\.|schema\.|noreply|no-reply|\.png|\.jpg|\.gif|\.js$|sentry|@2x|privacy|legal|press|abuse@|webmaster@|support@|info@(?:bbb|manta|yp\.|yellow|ezlocal|fsbo)/i;

export function extractPhones(html: string): string[] {
  const raw = [...html.matchAll(PHONE_RE)].map((m) => m[0]);
  return [...new Set(raw)].filter((p) => {
    if (p.includes(".")) return false;
    const d = p.replace(/\D/g, "");
    if (d.length < 10 || d.length > 11) return false;
    const area = d.slice(-10, -7);
    return !CORP_AREA_CODES.has(area) && !d.endsWith("0000000");
  });
}

export function extractEmails(html: string): string[] {
  const raw = [...html.matchAll(EMAIL_RE)].map((m) => m[0]);
  return [...new Set(raw)].filter((e) => !CORP_EMAIL_RE.test(e));
}

/** Derive a name from an email like firstname.lastname@domain.com */
export function nameFromEmail(email: string): string | undefined {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  }
  return undefined;
}

/** Normalize a phone to (NXX) NXX-XXXX */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const ten = d.slice(-10);
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** Stable dedup ID: "{source}::{email}" or "{source}::{normalized_phone}" */
export function contactId(source: string, email?: string, phone?: string): string {
  const key = email ? email.toLowerCase() : phone ? normalizePhone(phone) : "unknown";
  return `${source}::${key}`;
}

/**
 * Try to extract agent names from nearby HTML. Looks for h2/h3/strong/b tags
 * within ±600 chars of an anchor string (phone or email).
 */
function extractNearbyName(html: string, anchor: string): string | undefined {
  const idx = html.indexOf(anchor);
  if (idx === -1) return undefined;
  const window = html.slice(Math.max(0, idx - 600), Math.min(html.length, idx + 600));
  const patterns = [
    /<h[23][^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})<\/h[23]>/,
    /<strong[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})<\/strong>/,
    /<b[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})<\/b>/,
    /class="[^"]*(?:name|agent|realtor)[^"]*"[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})</,
  ];
  for (const p of patterns) {
    const m = window.match(p);
    if (m) return m[1].trim();
  }
  return undefined;
}

/**
 * Build contact records from a page of HTML.
 * Segments by card boundaries if possible, otherwise pairs emails+phones by proximity.
 */
export function buildContacts(
  html: string,
  source: string,
  brokerage?: string
): RealtorContact[] {
  const now = new Date().toISOString();
  const contacts: RealtorContact[] = [];
  const seenIds = new Set<string>();

  // Try card segmentation first — split on common card/article boundaries
  const segments = html
    .split(/(?=<(?:article|li|div)[^>]*(?:agent|card|profile|result|member|team)[^>]*>)/i)
    .filter((s) => s.length > 100);

  const useSegments = segments.length > 3;
  const chunks = useSegments ? segments : [html];

  for (const chunk of chunks) {
    const phones = extractPhones(chunk);
    const emails = extractEmails(chunk);

    // Pair emails with nearby phones (best-effort)
    const maxPairs = Math.max(emails.length, phones.length, 1);
    for (let i = 0; i < maxPairs; i++) {
      const email = emails[i];
      const phone = phones[i];
      if (!email && !phone) continue;

      const id = contactId(source, email, phone);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const name =
        (email ? extractNearbyName(chunk, email) : undefined) ??
        (phone ? extractNearbyName(chunk, phone) : undefined) ??
        (email ? nameFromEmail(email) : undefined);

      contacts.push({
        id,
        name,
        phone: phone ? normalizePhone(phone) : undefined,
        email,
        brokerage,
        source,
        scrapedAt: now,
      });
    }
  }

  return contacts;
}
