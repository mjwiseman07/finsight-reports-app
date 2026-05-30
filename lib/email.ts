export type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  reply_to?: string[];
};

export const salesEmail = "sales@advisacor.com";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getEarlyAccessEmailConfig() {
  return {
    notificationEmail: process.env.EARLY_ACCESS_NOTIFICATION_EMAIL || salesEmail,
    replyToEmail: salesEmail,
    fromEmail: process.env.EARLY_ACCESS_FROM_EMAIL || `Advisacor Team <${salesEmail}>`,
  };
}

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || "support@advisacor.com";
}

export async function sendEmail(payload: EmailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey || resendApiKey === "PASTE_RESEND_API_KEY_HERE") {
    throw new Error("Email provider is not configured. Missing RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider request failed: ${detail || response.statusText}`);
  }
}
