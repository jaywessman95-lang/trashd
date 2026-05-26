import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Step 1: Visit /api/auth/gmail-reauth?secret=<CRON_SECRET> to start the Gmail OAuth flow
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GMAIL_CLIENT_ID) {
    return NextResponse.json({ error: "GMAIL_CLIENT_ID not set" }, { status: 500 });
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/gmail-reauth/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GMAIL_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // force consent to get fresh refresh_token

  return NextResponse.redirect(authUrl.toString());
}
