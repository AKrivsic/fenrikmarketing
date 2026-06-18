"use server";

import { insertSampleRequest } from "@/lib/api/client-delivery-admin";
import { sendSampleRequestNotification } from "@/lib/email/sendSampleRequestNotification";

export type SampleFormResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const BUSINESS_TYPES = new Set([
  "SaaS",
  "AI Tool",
  "Agency",
  "Consultant",
  "Ecommerce",
  "Local Business",
  "Freelancer",
  "Other",
]);

const REVENUE_BANDS = new Set([
  "Pre-revenue",
  "Under $1k / month",
  "$1k–10k / month",
  "$10k–50k / month",
  "$50k+ / month",
]);

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildNotesBlock(input: {
  businessType: string;
  monthlyRevenue: string;
  notes: string;
}): string {
  const lines = [
    `Business type: ${input.businessType}`,
    `Monthly revenue: ${input.monthlyRevenue}`,
    "",
    input.notes,
  ];
  return lines.join("\n").trim();
}

const HONEYPOT_FIELD = "company_website_url";

export async function submitSampleRequest(formData: FormData): Promise<SampleFormResult> {
  const honeypot = String(formData.get(HONEYPOT_FIELD) ?? "").trim();
  if (honeypot) {
    return { ok: true };
  }

  const fieldErrors: Record<string, string> = {};
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const businessType = String(formData.get("businessType") ?? "").trim();
  const monthlyRevenue = String(formData.get("monthlyRevenue") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email.";
  }
  if (!websiteUrl) fieldErrors.websiteUrl = "Website URL is required.";
  else if (!isValidUrl(websiteUrl)) {
    fieldErrors.websiteUrl = "Enter a valid http(s) URL.";
  }
  if (!businessType || !BUSINESS_TYPES.has(businessType)) {
    fieldErrors.businessType = "Select a business type.";
  }
  if (!monthlyRevenue || !REVENUE_BANDS.has(monthlyRevenue)) {
    fieldErrors.monthlyRevenue = "Select monthly revenue.";
  }
  if (!notes) {
    fieldErrors.notes = "Tell us what you sell or what we should focus on.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const submittedAt = new Date();

  try {
    await insertSampleRequest({
      name,
      email,
      websiteUrl,
      notes: buildNotesBlock({ businessType, monthlyRevenue, notes }),
    });
  } catch {
    return { ok: false, error: "Could not save your request. Please try again." };
  }

  await sendSampleRequestNotification({
    name,
    email,
    websiteUrl,
    businessType,
    monthlyRevenue,
    notes,
    submittedAt,
  });

  return { ok: true };
}
