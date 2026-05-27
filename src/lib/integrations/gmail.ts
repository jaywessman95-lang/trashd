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
  // Create it
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
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

function mimeEncodeSubject(subject: string): string {
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(email: LeadAlertEmail): string {
  if (!env.GMAIL_FROM_EMAIL) {
    throw new Error("Missing GMAIL_FROM_EMAIL.");
  }

  const message = [
    `From: ${env.GMAIL_FROM_EMAIL}`,
    `To: ${email.to}`,
    `Subject: ${mimeEncodeSubject(email.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(email.text, "utf-8").toString("base64")
  ].join("\r\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const APP_BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://trashd.vercel.app";

export function buildRealtorOutreachEmail(
  agentName: string | null | undefined,
  activationToken?: string
): { subject: string; body: string } {
  const first = agentName?.trim().split(" ")[0] ?? "there";
  const subject = `Quick intro — post-sale cleanout partner for your listings`;
  const activationLine = activationToken
    ? `\n\nWe've also created a free profile for you on Trashd so junk removal operators ` +
      `can find and contact you directly. Click below to activate it (one click, no account needed):\n` +
      `${APP_BASE_URL}/activate/${activationToken}\n`
    : "";
  const body =
    `Hi ${first},\n\n` +
    `I came across your profile and wanted to introduce myself — I run Trashd, ` +
    `a junk removal and cleanout service in Orange County.\n\n` +
    `I work closely with real estate agents on post-sale cleanouts, estate clear-outs, ` +
    `and pre-listing staging clean-ups. Fast, affordable, and reliable.\n\n` +
    `If you ever need a cleanout vendor you can count on, I'd love to be your go-to. ` +
    `Happy to give your clients a free, same-day quote.` +
    activationLine + `\n` +
    `Feel free to reply to this email anytime.\n\n` +
    `Best,\nTrashd Crew\n${env.GMAIL_FROM_EMAIL ?? "trashd.info@gmail.com"}`;
  return { subject, body };
}

export function buildOperatorOutreachEmail(
  companyName: string | null | undefined,
  activationToken?: string
): { subject: string; body: string } {
  const name = companyName?.trim() ?? "there";
  const subject = `Get more realtor referrals — claim your free profile on Trashd`;
  const activationLine = activationToken
    ? `\nClick below to activate your free listing (one click, no account needed):\n` +
      `${APP_BASE_URL}/activate/${activationToken}\n`
    : "";
  const body =
    `Hi ${name},\n\n` +
    `We found your business while searching for top-rated junk removal and moving services ` +
    `in your area and wanted to reach out.\n\n` +
    `Trashd is a platform that connects real estate agents with reliable cleanout and ` +
    `moving services. Realtors use it to refer clients who need a cleanout after a home sale.\n\n` +
    `We'd love to list your business so local realtors can find and recommend you.` +
    activationLine + `\n` +
    `Feel free to reply with any questions.\n\n` +
    `Best,\nTrashd Team\n${env.GMAIL_FROM_EMAIL ?? "trashd.info@gmail.com"}`;
  return { subject, body };
}

export async function sendRealtorOutreach(
  to: string,
  agentName: string | null | undefined,
  activationToken?: string
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
  activationToken?: string
): Promise<void> {
  const { subject, body } = buildOperatorOutreachEmail(companyName, activationToken);
  const accessToken = await getGmailAccessToken();
  const messageId = await sendRaw({ to, subject, text: body }, accessToken);
  const labelId = await getOrCreateLabel("Outreach Junk", accessToken);
  await applyLabel(messageId, labelId, accessToken);
}
