import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/guards";
import { listLeads } from "@/lib/leads/repository";

export async function GET(request: Request) {
  const { response } = await requireSignedInUser();
  if (response) return response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const minScore = Number(url.searchParams.get("minScore") ?? "0");
  const leads = await listLeads({ limit, minScore });

  return NextResponse.json({ leads });
}
