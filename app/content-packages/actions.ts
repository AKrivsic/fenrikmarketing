"use server";

import { insertSampleRequest } from "@/lib/api/client-delivery-admin";
import { sendSampleRequestNotification } from "@/lib/email/sendSampleRequestNotification";
import { normalizeWebsiteUrl } from "@/lib/knowledge/websiteUrl";

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

function buildNotesBlock(input: {
  businessType: string;
  monthlyRevenue: string;
  notes: string;
  requestVariant: string;
  clientProjectId?: string;
  clientProjectTitle?: string;
}): string {
  const lines = [
    input.requestVariant === "full_package"
      ? "Request: Full content package (after sample review)"
      : "Request: Free sample",
    ...(input.clientProjectTitle
      ? [`Sample project: ${input.clientProjectTitle}`]
      : []),
    ...(input.clientProjectId
      ? [`Review link: /client-review/${input.clientProjectId}`]
      : []),
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
  const requestVariant = String(formData.get("requestVariant") ?? "free_sample").trim();
  const clientProjectId = String(formData.get("clientProjectId") ?? "").trim();
  const clientProjectTitle = String(formData.get("clientProjectTitle") ?? "").trim();

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email.";
  }
  const normalizedWebsiteUrl = websiteUrl
    ? normalizeWebsiteUrl(websiteUrl)
    : null;
  if (!websiteUrl) fieldErrors.websiteUrl = "Website URL is required.";
  else if (!normalizedWebsiteUrl) {
    fieldErrors.websiteUrl = "Enter a valid website (e.g. example.com or https://example.com).";
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
      websiteUrl: normalizedWebsiteUrl!,
      notes: buildNotesBlock({
        businessType,
        monthlyRevenue,
        notes,
        requestVariant,
        clientProjectId: clientProjectId || undefined,
        clientProjectTitle: clientProjectTitle || undefined,
      }),
    });
  } catch {
    return { ok: false, error: "Could not save your request. Please try again." };
  }

  await sendSampleRequestNotification({
    name,
    email,
    websiteUrl: normalizedWebsiteUrl!,
    businessType,
    monthlyRevenue,
    notes,
    submittedAt,
    requestVariant,
    clientProjectId: clientProjectId || undefined,
    clientProjectTitle: clientProjectTitle || undefined,
  });

  return { ok: true };
}
