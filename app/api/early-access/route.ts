import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFICATION_EMAIL = process.env.EARLY_ACCESS_NOTIFICATION_EMAIL || "sales@advisacor.com";
const FROM_EMAIL = process.env.EARLY_ACCESS_FROM_EMAIL || "sales@advisacor.com";

type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};

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

    await sendEmail({
      from: FROM_EMAIL,
      to: [NOTIFICATION_EMAIL],
      subject: "New Advisacor Early Access Request",
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Date/Time: ${timestamp}`,
        "Source: Advisacor Coming Soon Page",
      ].join("\n"),
    });

    await sendEmail({
      from: FROM_EMAIL,
      to: [email],
      subject: "Welcome to Advisacor Early Access",
      text: [
        `Hello ${name},`,
        "",
        "Thank you for your interest in Advisacor.",
        "",
        "We've received your request for early access and added you to our notification list.",
        "",
        "Advisacor is an AI-powered financial intelligence platform designed to help finance and operational leaders transform data into actionable insights through forecasting, analytics, and advisory intelligence.",
        "",
        "As we move toward launch, you'll receive updates on:",
        "* Product announcements",
        "* Early access opportunities",
        "* New feature releases",
        "* Platform demonstrations",
        "",
        "We appreciate your interest and look forward to sharing more soon.",
        "",
        "Sincerely,",
        "The Advisacor Team",
        "A product of Wiseman Financial Technologies LLC",
        "https://advisacor.com",
      ].join("\n"),
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
