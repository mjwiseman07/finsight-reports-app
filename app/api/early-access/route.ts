import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFICATION_EMAIL = process.env.EARLY_ACCESS_NOTIFICATION_EMAIL || "sales@advisacor.com";
const REPLY_TO_EMAIL = "sales@advisacor.com";
const FROM_EMAIL = process.env.EARLY_ACCESS_FROM_EMAIL || `Advisacor Team <${REPLY_TO_EMAIL}>`;

type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  reply_to?: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(payload: EmailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);

    await sendEmail({
      from: FROM_EMAIL,
      to: [NOTIFICATION_EMAIL],
      reply_to: [REPLY_TO_EMAIL],
      subject: "New Advisacor Early Access Request",
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Date/Time: ${timestamp}`,
        "Source: Advisacor Coming Soon Page",
      ].join("\n"),
      html: [
        "<div style=\"font-family:Arial,sans-serif;color:#111827;line-height:1.6;\">",
        "<h2 style=\"font-size:18px;margin:0 0 16px;color:#0A1020;\">New Advisacor Early Access Request</h2>",
        `<p><strong>Name:</strong> ${safeName}</p>`,
        `<p><strong>Email:</strong> ${safeEmail}</p>`,
        `<p><strong>Date/Time:</strong> ${escapeHtml(timestamp)}</p>`,
        "<p><strong>Source:</strong> Advisacor Coming Soon Page</p>",
        "</div>",
      ].join(""),
    });

    await sendEmail({
      from: FROM_EMAIL,
      to: [email],
      reply_to: [REPLY_TO_EMAIL],
      subject: "Welcome to Advisacor Early Access",
      text: [
        `Hello ${name},`,
        "",
        "Thank you for your interest in Advisacor.",
        "",
        "We've received your request for early access and added you to our notification list.",
        "",
        "Advisacor is a financial intelligence platform designed to help finance and operational leaders turn business data into clear reporting, forecasting, and advisory insight.",
        "",
        "As we move toward launch, we will share product updates, early access opportunities, and platform demonstrations.",
        "",
        "We appreciate your interest and look forward to sharing more soon.",
        "",
        "Sincerely,",
        "The Advisacor Team",
        "",
        "Advisacor",
        "A product of Wiseman Financial Technologies LLC",
        "Covington, Virginia, USA",
        "https://advisacor.com",
      ].join("\n"),
      html: [
        "<div style=\"margin:0;padding:0;background:#F5F7FA;\">",
        "<div style=\"max-width:640px;margin:0 auto;padding:32px 20px;\">",
        "<div style=\"background:#ffffff;border:1px solid #E5E7EB;border-radius:18px;padding:32px;font-family:Arial,sans-serif;color:#111827;line-height:1.6;\">",
        `<p style=\"margin:0 0 16px;\">Hello ${safeName},</p>`,
        "<p style=\"margin:0 0 16px;\">Thank you for your interest in Advisacor.</p>",
        "<p style=\"margin:0 0 16px;\">We have received your request for early access and added you to our notification list.</p>",
        "<p style=\"margin:0 0 16px;\">Advisacor is a financial intelligence platform designed to help finance and operational leaders turn business data into clear reporting, forecasting, and advisory insight.</p>",
        "<p style=\"margin:0 0 24px;\">As we move toward launch, we will share product updates, early access opportunities, and platform demonstrations.</p>",
        "<p style=\"margin:0 0 4px;\">Sincerely,</p>",
        "<p style=\"margin:0 0 28px;\">The Advisacor Team</p>",
        "<div style=\"border-top:1px solid #E5E7EB;padding-top:18px;color:#6B7280;font-size:13px;line-height:1.5;\">",
        "<p style=\"margin:0;font-weight:700;color:#0A1020;\">Advisacor</p>",
        "<p style=\"margin:0;\">A product of Wiseman Financial Technologies LLC</p>",
        "<p style=\"margin:0;\">Covington, Virginia, USA</p>",
        "<p style=\"margin:0;\"><a href=\"https://advisacor.com\" style=\"color:#1E6BFF;text-decoration:none;\">https://advisacor.com</a></p>",
        "</div>",
        "</div>",
        "</div>",
        "</div>",
      ].join(""),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[early-access] submission failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or email sales@advisacor.com." },
      { status: 500 },
    );
  }
}
