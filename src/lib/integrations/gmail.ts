import { env } from "@/lib/env";

export type LeadAlertEmail = {
  to: string;
  subject: string;
  text: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

/** Returns the sent message ID so callers can apply labels. */
async function sendRaw(email: LeadAlertEmail, accessToken: string): Promise<string> {
  const raw = buildRawMessage(email);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail send failed (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { id?: string };
  return data.id ?? "";
}

export async function sendLeadAlert(email: LeadAlertEmail): Promise<void> {
  const accessToken = await getGmailAccessToken();
  await sendRaw(email, accessToken);
}

/** Find an existing Gmail label by name, or create it if absent. Returns the label ID. */
async function getOrCreateLabel(name: string, accessToken: string): Promise<string> {
  const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (listRes.ok) {
    const { labels } = (await listRes.json()) as { labels?: { id: string; name: string }[] };
    const existing = (labels ?? []).find((l) => l.name === name);
    if (existing) return existing.id;
  }
  const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" })
  });
  const created = (await createRes.json()) as { id?: string };
  return created.id ?? "";
}

async function applyLabel(messageId: string, labelId: string, accessToken: string): Promise<void> {
  if (!messageId || !labelId) return;
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds: [labelId] })
  });
}

async function getGmailAccessToken(): Promise<string> {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
    throw new Error("Missing Gmail OAuth environment variables.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  const data = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Unable to refresh Gmail access token.");
  }
  return data.access_token;
}

// Converts any non-ASCII or problematic Unicode to plain ASCII equivalents.
// Prevents garbled characters (Ã¢Â€Â etc.) when email clients misread UTF-8.
function sanitizeText(text: string): string {
  return text
    .replace(/‘|’/g, "'")      // left/right single quotes -> '
    .replace(/“|”/g, '"')      // left/right double quotes -> "
    .replace(/–/g, "-")             // en dash -> -
    .replace(/—/g, " - ")           // em dash -> ' - '
    .replace(/…/g, "...")           // ellipsis -> ...
    .replace(/ /g, " ")            // non-breaking space -> space
    .replace(/[^\x00-\x7F]/g, "");      // strip any remaining non-ASCII
}

function buildRawMessage(email: LeadAlertEmail): string {
  if (!env.GMAIL_FROM_EMAIL) throw new Error("Missing GMAIL_FROM_EMAIL.");

  const subject = sanitizeText(email.subject);
  const body    = sanitizeText(email.text);

  const message = [
    `From: ${env.GMAIL_FROM_EMAIL}`,
    `To: ${email.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=us-ascii",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const APP_BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://trashd.vercel.app";

const REALTOR_SUBJECTS: Array<(first: string) => string> = [
  (first) => `Quick question, ${first} - do your OC clients ever need a cleanout crew?`,
  (first) => `${first}, same-day cleanout vendors ready for your listings in OC`,
  (first) => `${first} - post-sale cleanouts for your clients, handled same day`,
  (first) => `Your next OC listing may need a cleanout, ${first} - I can help`,
];

const OPERATOR_SUBJECTS: Array<(name: string) => string> = [
  (name) => `${name} - OC realtors are asking for cleanout vendors right now`,
  (name) => `New job for ${name} - post-sale cleanout referral in Orange County`,
  (name) => `${name}, can you take a cleanout job from an OC realtor this week?`,
  (name) => `OC realtor needs a reliable cleanout crew - is ${name} available?`,
];

function pickVariant<T>(arr: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}

export function buildRealtorOutreachEmail(
  agentName: string | null | undefined,
  activationToken?: string,
): { subject: string; body: string } {
  const first = agentName?.trim().split(" ")[0] ?? "there";
  const subject = pickVariant(REALTOR_SUBJECTS, first)(first);
  const activationLine = activationToken
    ? `\n\nWe also created a free profile for you on Trashd so cleanout crews can find and contact you directly. Activate it in one click - no account needed:\n` +
      `${APP_BASE_URL}/activate/${activationToken}\n`
    : "";
  const unsubLine = activationToken
    ? `\n\n---\nTo stop receiving emails from Trashd: ${APP_BASE_URL}/unsubscribe/${activationToken}`
    : "";
  const body =
    `Hi ${first},\n\n` +
    `Do your OC clients ever need help clearing out a home before or after a sale?\n\n` +
    `I run Trashd - we match Orange County real estate agents with same-day junk removal and cleanout crews, so you always have a reliable referral in your back pocket.\n\n` +
    `Whether it's a post-sale cleanout, an estate clear-out, or pre-listing staging - your clients get fast, affordable service and you get a referral you can genuinely stand behind.\n\n` +
    `No signup needed. When a client needs it, just send their info and we handle the rest.` +
    activationLine + `\n` +
    `Happy to answer any questions - just reply here.\n\n` +
    `- Minh\nWebsite: http://trashd.vercel.app/\n${env.GMAIL_FROM_EMAIL ?? "trashd.info@gmail.com"}` +
    unsubLine;
  return { subject, body };
}

export function buildOperatorOutreachEmail(
  companyName: string | null | undefined,
  activationToken?: string,
): { subject: string; body: string } {
  const name = companyName?.trim() ?? "there";
  const subject = pickVariant(OPERATOR_SUBJECTS, name)(name);
  const activationLine = activationToken
    ? `\n\nClaim your free listing now - one click, no account needed:\n` +
      `${APP_BASE_URL}/activate/${activationToken}\n`
    : "";
  const unsubLine = activationToken
    ? `\n\n---\nTo stop receiving emails from Trashd: ${APP_BASE_URL}/unsubscribe/${activationToken}`
    : "";
  const body =
    `Hi ${name},\n\n` +
    `Quick one - are you taking cleanout jobs in Orange County right now?\n\n` +
    `I run Trashd. OC real estate agents contact us regularly looking for reliable junk removal crews to send clients to after a home sale. Right now we have more realtor referrals than vendors to fill them.\n\n` +
    `A free listing puts your business in front of every OC agent on our platform. When they have a client who needs a post-sale or pre-listing cleanout, you're the first call they make.` +
    activationLine + `\n` +
    `If you're interested or have questions, just reply here.\n\n` +
    `- Minh\nWebsite: http://trashd.vercel.app/\n${env.GMAIL_FROM_EMAIL ?? "trashd.info@gmail.com"}` +
    unsubLine;
  return { subject, body };
}

export async function sendRealtorOutreach(
  to: string,
  agentName: string | null | undefined,
  activationToken?: string,
): Promise<void> {
  const { subject, body } = buildRealtorOutreachEmail(agentName, activationToken);
  const accessToken = await getGmailAccessToken();
  const messageId = await sendRaw({ to, subject, text: body }, accessToken);
  const labelId = await getOrCreateLabel("Outreach Realtor", accessToken);
  await applyLabel(messageId, labelId, accessToken);
}

export async function sendOperatorOutreach(
  to: string,
  companyName: string | null | undefined,
  activationToken?: string,
): Promise<void> {
  const { subject, body } = buildOperatorOutreachEmail(companyName, activationToken);
  const accessToken = await getGmailAccessToken();
  const messageId = await sendRaw({ to, subject, text: body }, accessToken);
  const labelId = await getOrCreateLabel("Outreach Junk/Movers", accessToken);
  await applyLabel(messageId, labelId, accessToken);
}
