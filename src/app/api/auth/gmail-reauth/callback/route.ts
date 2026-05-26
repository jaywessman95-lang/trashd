import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Step 2: Google redirects here after consent — exchange code for tokens and display refresh_token
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No code returned from Google" }, { status: 400 });
  }

  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    return NextResponse.json({ error: "Missing Gmail OAuth env vars" }, { status: 500 });
  }

  const redirectUri = `${url.origin}/api/auth/gmail-reauth/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokens.refresh_token) {
    return NextResponse.json(
      { error: tokens.error_description ?? tokens.error ?? "Token exchange failed", tokens },
      { status: 500 }
    );
  }

  // Return HTML page showing the new refresh token to copy into Vercel
  const html = `<!DOCTYPE html>
<html>
<head><title>Gmail OAuth Success</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 20px; }
  h1 { color: #166534; }
  .token-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0; word-break: break-all; font-family: monospace; font-size: 13px; }
  .step { background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin: 10px 0; font-size: 14px; }
  code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
  <h1>✓ Gmail Re-authorized Successfully</h1>
  <p>Copy the refresh token below and update it in Vercel:</p>
  <div class="token-box">${tokens.refresh_token}</div>
  <div class="step">1. Go to <a href="https://vercel.com" target="_blank">vercel.com</a> → Trashd project → Settings → Environment Variables</div>
  <div class="step">2. Find <code>GMAIL_REFRESH_TOKEN</code> and update it with the token above</div>
  <div class="step">3. Redeploy the project for the change to take effect</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
