import { NextResponse } from "next/server";
import { SOURCES } from "@/lib/config/sources";
import { PLANS } from "@/lib/config/plans";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "trashd",
    sourceCount: SOURCES.length,
    planCount: PLANS.length
  });
}
