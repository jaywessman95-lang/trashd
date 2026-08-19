import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendInstantHotLeadAlerts } from "@/lib/alerts/instant";
import { computeQuoteEstimate, formatCurrencyRange, type QuoteWizardInput } from "@/lib/quotes/pricing";
import { priorityFromScore } from "@/lib/scoring/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const payloadSchema = z.object({
  jobType: z.enum(["junk", "moving", "both"]),
  junkVolume: z.enum(["few_items", "quarter", "half", "three_quarter", "full", "multiple_loads"]).optional(),
  moveSize: z.enum(["studio", "one_bed", "two_bed", "three_bed", "four_plus_bed"]).optional(),
  itemCategories: z
    .array(z.enum(["furniture", "appliance", "mattress", "electronics", "yard_waste", "construction", "boxes", "exercise_equipment", "hot_tub_large"]))
    .default([]),
  stairs: z.boolean().default(false),
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().min(7, "Phone is required").max(30),
  email: z.string().email().optional().or(z.literal("")),
  zip: z.string().min(3, "ZIP is required").max(12),
  city: z.string().max(80).optional(),
  preferredDate: z.string().max(40).optional(),
  honeypot: z.string().max(0, "Spam check failed").optional()
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    return NextResponse.json({ error: "Missing quote details." }, { status: 400 });
  }

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(JSON.parse(rawPayload));
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid quote details." : "Invalid quote details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_PHOTOS);

  if (photos.some((photo) => photo.size > MAX_PHOTO_BYTES)) {
    return NextResponse.json({ error: "One of your photos is too large. Please use smaller images." }, { status: 400 });
  }

  const wizardInput: QuoteWizardInput = {
    jobType: parsed.jobType,
    junkVolume: parsed.junkVolume,
    moveSize: parsed.moveSize,
    itemCategories: parsed.itemCategories,
    stairs: parsed.stairs,
    photoCount: photos.length
  };

  const estimate = computeQuoteEstimate(wizardInput);
  const leadId = randomUUID();
  const supabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

  let photoUrls: string[] = [];

  if (supabaseConfigured && photos.length) {
    const supabase = createSupabaseAdminClient();
    const uploads = await Promise.all(
      photos.map(async (photo, index) => {
        const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${leadId}/${index}.${extension}`;
        const { error } = await supabase.storage
          .from("quote-photos")
          .upload(path, await photo.arrayBuffer(), { contentType: photo.type || "image/jpeg", upsert: true });

        if (error) return null;

        return supabase.storage.from("quote-photos").getPublicUrl(path).data.publicUrl;
      })
    );
    photoUrls = uploads.filter((url): url is string => Boolean(url));
  }

  const jobLabel = parsed.jobType === "moving" ? "Moving help" : parsed.jobType === "both" ? "Junk removal + moving help" : "Junk removal";
  const score = estimate.jobSize === "large" ? 99 : estimate.jobSize === "medium" ? 95 : 90;

  const title = `${jobLabel} request - ${parsed.zip}`;
  const description = [
    `${jobLabel} quote submitted through the Trashd website.`,
    `Estimated range: ${formatCurrencyRange(estimate.low, estimate.high)}`,
    ...estimate.lines.map((line) => `- ${line.label}: ${formatCurrencyRange(line.low, line.high)}`),
    parsed.preferredDate ? `Preferred date: ${parsed.preferredDate}` : null,
    photos.length ? `${photos.length} photo(s) attached.` : "No photos attached."
  ]
    .filter(Boolean)
    .join("\n");

  if (!supabaseConfigured) {
    return NextResponse.json({ estimate, leadId, saved: false });
  }

  const supabase = createSupabaseAdminClient();
  const { error: insertError } = await supabase.from("leads").insert({
    id: leadId,
    source: "website_quote",
    title,
    description,
    city: parsed.city || parsed.zip,
    state: "CA",
    url: `internal://quote/${leadId}`,
    price: formatCurrencyRange(estimate.low, estimate.high),
    image_count: photoUrls.length,
    score,
    priority: priorityFromScore(score),
    job_size: estimate.jobSize,
    lead_type: estimate.leadType,
    ai_reason: "Homeowner-submitted quote request with contact info - high intent, ready to book.",
    scoring_version: "quote-wizard-v1",
    contact_name: parsed.name,
    contact_phone: parsed.phone,
    contact_email: parsed.email || null,
    photo_urls: photoUrls
  });

  if (insertError) {
    console.error("Failed to insert quote lead:", insertError);
    return NextResponse.json({ error: "Could not save your quote request. Please try again." }, { status: 500 });
  }

  try {
    await sendInstantHotLeadAlerts();
  } catch {
    // Alert delivery failure shouldn't block the homeowner's confirmation.
  }

  return NextResponse.json({ estimate, leadId, saved: true });
}
