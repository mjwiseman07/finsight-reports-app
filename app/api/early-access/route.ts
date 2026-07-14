import { NextResponse } from "next/server";
import { escapeHtml, getEarlyAccessEmailConfig, sendEmail, salesEmail } from "../../../lib/email";
import { rateLimit } from "../../../lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rateLimitResponse = rateLimit(request, { key: "early-access", limit: 5, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

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
    const { notificationEmail, replyToEmail, fromEmail } = getEarlyAccessEmailConfig();

    await sendEmail({
      from: fromEmail,
      to: [notificationEmail],
      reply_to: [replyToEmail],
      subject: "New Advisacor Early Access Request",
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Date/Time: ${timestamp}`,
        "Source: Advisacor Coming Soon Page",
      ].join("\n"),
      html: [
        "<div style=\"font-family:Arial,sans-serif;color:#28251D;line-height:1.6;\">",
        "<h2 style=\"font-size:18px;margin:0 0 16px;color:#111112;\">New Advisacor Early Access Request</h2>",
        `<p><strong>Name:</strong> ${safeName}</p>`,
        `<p><strong>Email:</strong> ${safeEmail}</p>`,
        `<p><strong>Date/Time:</strong> ${escapeHtml(timestamp)}</p>`,
        "<p><strong>Source:</strong> Advisacor Coming Soon Page</p>",
        "</div>",
      ].join(""),
    });

    await sendEmail({
      from: fromEmail,
      to: [email],
      reply_to: [replyToEmail],
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
        "<div style=\"margin:0;padding:0;background:#F7F6F2;\">",
        "<div style=\"max-width:640px;margin:0 auto;padding:32px 20px;\">",
        "<div style=\"background:#ffffff;border:1px solid #E5E7EB;border-radius:18px;padding:32px;font-family:Arial,sans-serif;color:#28251D;line-height:1.6;\">",
        `<p style=\"margin:0 0 16px;\">Hello ${safeName},</p>`,
        "<p style=\"margin:0 0 16px;\">Thank you for your interest in Advisacor.</p>",
        "<p style=\"margin:0 0 16px;\">We have received your request for early access and added you to our notification list.</p>",
        "<p style=\"margin:0 0 16px;\">Advisacor is a financial intelligence platform designed to help finance and operational leaders turn business data into clear reporting, forecasting, and advisory insight.</p>",
        "<p style=\"margin:0 0 24px;\">As we move toward launch, we will share product updates, early access opportunities, and platform demonstrations.</p>",
        "<p style=\"margin:0 0 4px;\">Sincerely,</p>",
        "<p style=\"margin:0 0 28px;\">The Advisacor Team</p>",
        "<div style=\"border-top:1px solid #E5E7EB;padding-top:18px;color:#6B7280;font-size:13px;line-height:1.5;\">",
        "<p style=\"margin:0;font-weight:700;color:#111112;\">Advisacor</p>",
        "<p style=\"margin:0;\">A product of Wiseman Financial Technologies LLC</p>",
        "<p style=\"margin:0;\">Covington, Virginia, USA</p>",
        "<p style=\"margin:0;\"><a href=\"https://advisacor.com\" style=\"color:#C9A961;text-decoration:none;\">https://advisacor.com</a></p>",
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
      { error: `Something went wrong. Please try again or email ${salesEmail}.` },
      { status: 500 },
    );
  }
}
