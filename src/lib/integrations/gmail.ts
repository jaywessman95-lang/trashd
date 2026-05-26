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

export async function sendLeadAlert(email: LeadAlertEmail): Promise<void> {
  const accessToken = await getGmailAccessToken();
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

function buildRawMessage(email: LeadAlertEmail): string {
  if (!env.GMAIL_FROM_EMAIL) {
    throw new Error("Missing GMAIL_FROM_EMAIL.");
  }

  const message = [
    `From: ${env.GMAIL_FROM_EMAIL}`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    email.text
  ].join("\r\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildRealtorOutreachEmail(agentName: string | null | undefined): {
  subject: string;
  body: string;
} {
  const first = agentName?.trim().split(" ")[0] ?? "there";
  const subject = `Quick intro — post-sale cleanout partner for your listings`;
  const body =
    `Hi ${first},\n\n` +
    `I came across your profile and wanted to introduce myself — I run Trashd, ` +
    `a junk removal and cleanout service in Orange County.\n\n` +
    `I work closely with real estate agents on post-sale cleanouts, estate clear-outs, ` +
    `and pre-listing staging clean-ups. Fast, affordable, and reliable.\n\n` +
    `If you ever need a cleanout vendor you can count on, I'd love to be your go-to. ` +
    `Happy to give your clients a free, same-day quote.\n\n` +
    `Feel free to reply to this email anytime.\n\n` +
    `Best,\nTrashd Crew\n${env.GMAIL_FROM_EMAIL ?? "trashd.info@gmail.com"}`;
  return { subject, body };
}

export async function sendRealtorOutreach(to: string, agentName: string | null | undefined): Promise<void> {
  const { subject, body } = buildRealtorOutreachEmail(agentName);
  await sendLeadAlert({ to, subject, text: body });
}
