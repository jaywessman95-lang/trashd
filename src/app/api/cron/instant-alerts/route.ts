import { NextResponse } from "next/server";
import { sendInstantHotLeadAlerts } from "@/lib/alerts/instant";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Missing CRON_SECRET." }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendInstantHotLeadAlerts();
  return NextResponse.json(result);
}
