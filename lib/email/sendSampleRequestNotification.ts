import { Resend } from "resend";

export interface SampleRequestNotificationPayload {
  name: string;
  email: string;
  websiteUrl: string;
  businessType: string;
  monthlyRevenue: string;
  notes: string;
  submittedAt: Date;
}

function getEmailConfig(): {
  apiKey: string;
  from: string;
  to: string;
} | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM?.trim();
  const to = process.env.CONTACT_TO?.trim();
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function buildEmailBody(payload: SampleRequestNotificationPayload): string {
  const lines = [
    "New free sample request",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Website: ${payload.websiteUrl}`,
    `Business type: ${payload.businessType}`,
    `Monthly revenue: ${payload.monthlyRevenue}`,
    "",
    "Notes:",
    payload.notes,
    "",
    `Submitted at: ${formatTimestamp(payload.submittedAt)}`,
  ];
  return lines.join("\n");
}

export async function sendSampleRequestNotification(
  payload: SampleRequestNotificationPayload,
): Promise<void> {
  const config = getEmailConfig();
  if (!config) {
    console.error(
      "[sample-request-email] Not configured: set RESEND_API_KEY, CONTACT_FROM, and CONTACT_TO.",
    );
    return;
  }

  const resend = new Resend(config.apiKey);
  const subject = `Sample request: ${payload.name}`;

  try {
    const { error } = await resend.emails.send({
      from: config.from,
      to: config.to,
      replyTo: payload.email,
      subject,
      text: buildEmailBody(payload),
    });
    if (error) {
      console.error("[sample-request-email] Resend error:", error);
    }
  } catch (err) {
    console.error("[sample-request-email] Failed to send:", err);
  }
}
