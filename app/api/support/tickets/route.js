import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "../../../../lib/company-security";
import { escapeHtml, getEarlyAccessEmailConfig, getSupportEmail, sendEmail } from "../../../../lib/email";
import { getRecentIntuitTidForUser } from "../../../../lib/qbo/recent-intuit-tid";
import { rateLimit } from "../../../../lib/rate-limit";
import { withAutoFile } from "../../../../lib/support/api-error-wrapper";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  aiSupportAssistantArchitecture,
  getSupportTicketType,
  normalizeSupportTicket,
  supportTicketCategories,
  supportTicketPriorities,
} from "../../../../lib/support-center";

async function resolvePrimaryCompany(userId) {
  const { data: membership } = await supabaseAdmin
    .from("company_users")
    .select("role, companies(id, name, package_level, primary_persona)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return membership?.companies || null;
}

async function sendSupportNotification(ticket) {
  try {
    const { fromEmail, replyToEmail } = getEarlyAccessEmailConfig();
    await sendEmail({
      from: fromEmail,
      to: [getSupportEmail()],
      reply_to: [replyToEmail],
      subject: `Support Ticket #${ticket.ticket_number}: ${ticket.subject}`,
      text: [
        `Ticket #${ticket.ticket_number}`,
        `Category: ${ticket.category}`,
        `Priority: ${ticket.priority}`,
        `Company: ${ticket.company_name || "Not available"}`,
        `User: ${ticket.user_email || "Not available"}`,
        `Correlation ID: ${ticket.correlation_id || "(not generated)"}`,
        `QBO realm: ${ticket.qbo_realm_id || "not connected"}`,
        `Recent Intuit request ID (last 24h): ${ticket.last_intuit_tid || "none captured"}`,
        "",
        ticket.description,
      ].join("\n"),
    });
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Support notification failed." };
  }

  return { sent: true, error: null };
}

async function sendCustomerConfirmation(ticket) {
  try {
    if (!ticket.user_email) return { sent: false, error: "Ticket user email is missing." };

    const { fromEmail, replyToEmail } = getEarlyAccessEmailConfig();
    const submittedAt = ticket.created_at ? new Date(ticket.created_at).toLocaleString("en-US") : new Date().toLocaleString("en-US");
    const safeSubject = escapeHtml(ticket.subject || "");
    const safeCategory = escapeHtml(ticket.category || "Other");
    const safePriority = escapeHtml(ticket.priority || "Normal");
    const safeStatus = escapeHtml(ticket.status || "Open");
    const safeSubmittedAt = escapeHtml(submittedAt);

    await sendEmail({
      from: fromEmail,
      to: [ticket.user_email],
      reply_to: [replyToEmail],
      subject: `Advisacor Support Ticket #${ticket.ticket_number} Received`,
      text: [
        "Your support request has been received.",
        "",
        `Ticket #${ticket.ticket_number}`,
        `Subject: ${ticket.subject}`,
        `Category: ${ticket.category}`,
        `Priority: ${ticket.priority}`,
        `Status: ${ticket.status}`,
        `Date submitted: ${submittedAt}`,
        `Correlation ID: ${ticket.correlation_id || ""}`,
        "",
        "A member of the Advisacor support team will review your request.",
        "",
        "Advisacor Support",
      ].join("\n"),
      html: [
        "<div style=\"margin:0;padding:0;background:#F7F6F2;\">",
        "<div style=\"max-width:640px;margin:0 auto;padding:32px 20px;\">",
        "<div style=\"background:#ffffff;border:1px solid #E5E7EB;border-radius:18px;padding:32px;font-family:Arial,sans-serif;color:#28251D;line-height:1.6;\">",
        "<p style=\"margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#C9A961;\">Advisacor Support</p>",
        "<h2 style=\"margin:0 0 16px;font-size:22px;color:#111112;\">Your support request has been received.</h2>",
        "<p style=\"margin:0 0 20px;color:#374151;\">A member of the Advisacor support team will review your request.</p>",
        "<div style=\"border:1px solid #E5E7EB;border-radius:14px;padding:18px;background:#F9FAFB;\">",
        `<p style=\"margin:0 0 8px;\"><strong>Ticket #:</strong> ${ticket.ticket_number}</p>`,
        `<p style=\"margin:0 0 8px;\"><strong>Subject:</strong> ${safeSubject}</p>`,
        `<p style=\"margin:0 0 8px;\"><strong>Category:</strong> ${safeCategory}</p>`,
        `<p style=\"margin:0 0 8px;\"><strong>Priority:</strong> ${safePriority}</p>`,
        `<p style=\"margin:0 0 8px;\"><strong>Status:</strong> ${safeStatus}</p>`,
        `<p style=\"margin:0 0 8px;\"><strong>Date submitted:</strong> ${safeSubmittedAt}</p>`,
        `<p style=\"margin:8px 0 0;\"><strong>Correlation ID:</strong> ${escapeHtml(ticket.correlation_id || "")}</p>`,
        "</div>",
        "<p style=\"margin:22px 0 0;color:#6B7280;font-size:13px;\">Advisacor Support</p>",
        "</div>",
        "</div>",
        "</div>",
      ].join(""),
    });
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Customer confirmation email failed." };
  }

  return { sent: true, error: null };
}

async function auditSupportTicketCreated({ ticket, userId, companyId, category, priority }) {
  const { error } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      event_type: "support_ticket_created",
      actor_user_id: userId || null,
      company_id: companyId || null,
      resource_type: "support_ticket",
      resource_id: ticket.id,
      metadata: {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        user_id: userId,
        company_id: companyId,
        category,
        priority,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

  if (error) {
    // Audit logging should not block customer support submission.
  }
}

async function getImpl(request) {
  const rateLimitResponse = rateLimit(request, { key: "support-ticket-list", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;
  try {
    // Attach user id header for the wrapper's fallback error path
    request.headers.set?.("x-advisacor-user-id", access.user.id);
  } catch { /* headers may be immutable — ignore */ }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the support tickets migration before using Support Center." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to load support tickets." }, { status: 500 });
  }

  return NextResponse.json({
    tickets: (data || []).map(normalizeSupportTicket),
    ai_support_assistant: aiSupportAssistantArchitecture,
  });
}

async function postImpl(request) {
  const rateLimitResponse = rateLimit(request, { key: "support-ticket-create", limit: 12, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;
  try {
    // Attach user id header for the wrapper's fallback error path
    request.headers.set?.("x-advisacor-user-id", access.user.id);
  } catch { /* headers may be immutable — ignore */ }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const category = supportTicketCategories.includes(body.category) ? body.category : "Other";
  const priority = supportTicketPriorities.includes(body.priority) ? body.priority : "Normal";
  const subject = String(body.subject || "").trim();
  const description = String(body.description || "").trim();

  if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 });

  const company = await resolvePrimaryCompany(access.user.id);

  // Resolve active QBO connection (nullable — user may have none connected)
  const { data: qboConnection } = await supabaseAdmin
    .from("qbo_connections_unified")
    .select("realm_id")
    .eq("user_id", access.user.id)
    .limit(1)
    .maybeSingle();
  const qboRealmId = qboConnection?.realm_id || null;

  // Most recent intuit_tid captured for this user in the last 24 hours
  const recentTid = await getRecentIntuitTidForUser(access.user.id);
  const lastIntuitTid = recentTid?.intuit_tid || null;

  // Correlation UUID — appears in both emails
  const correlationId = crypto.randomUUID();

  // Client-supplied workflow context — sanitize to known shape only
  const workflowContext = (() => {
    const raw = body.workflow_context;
    if (!raw || typeof raw !== "object") return null;
    return {
      path: typeof raw.path === "string" ? raw.path.slice(0, 240) : "",
      referrer: typeof raw.referrer === "string" ? raw.referrer.slice(0, 240) : "",
      error_message:
        typeof raw.error_message === "string" ? raw.error_message.slice(0, 500) : "",
    };
  })();

  // Block 2.6: parent_ticket_id + prefill_attribution
  const rawParentId = typeof body.parent_ticket_id === "string" ? body.parent_ticket_id.trim() : "";
  let validatedParentId = null;
  if (rawParentId && /^[a-f0-9-]{36}$/.test(rawParentId)) {
    const { data: parent } = await supabaseAdmin
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", rawParentId)
      .maybeSingle();
    if (parent && parent.user_id === access.user.id) {
      validatedParentId = parent.id;
    }
  }
  const prefillAttribution =
    body.prefill_attribution && typeof body.prefill_attribution === "object"
      ? body.prefill_attribution
      : null;
  // Fold prefill_attribution into workflow_context so we don't need a new column
  const workflowContextForInsert = workflowContext
    ? { ...workflowContext, prefill_attribution: prefillAttribution }
    : prefillAttribution
      ? { prefill_attribution: prefillAttribution }
      : null;

  const attachmentMetadata = {
    screenshot: body.screenshot ? String(body.screenshot).slice(0, 240) : "",
    attachment: body.attachment ? String(body.attachment).slice(0, 240) : "",
  };

  const { data: insertedTicket, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({
      user_id: access.user.id,
      user_email: access.user.email || "",
      company_id: company?.id || null,
      company_name: company?.name || "",
      package_level: company?.package_level || "",
      persona: company?.primary_persona || "",
      category,
      ticket_type: getSupportTicketType(category),
      priority,
      status: "Open",
      subject,
      description,
      browser: request.headers.get("user-agent") || body.browser || "",
      attachment_metadata: attachmentMetadata,
      ai_support_context: {
        architecture: aiSupportAssistantArchitecture,
        attempted: Boolean(body.ai_support_attempted),
      },
      qbo_realm_id: qboRealmId,
      last_intuit_tid: lastIntuitTid,
      workflow_context: workflowContextForInsert,
      correlation_id: correlationId,
      parent_ticket_id: validatedParentId,
    })
    .select("*")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the support tickets migration before submitting support tickets." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to submit support ticket." }, { status: 500 });
  }

  await auditSupportTicketCreated({
    ticket: insertedTicket,
    userId: access.user.id,
    companyId: company?.id || null,
    category,
    priority,
  });

  const notification = await sendSupportNotification(insertedTicket);
  const confirmation = await sendCustomerConfirmation(insertedTicket);
  const notificationErrors = [
    notification.error ? `support_notification: ${notification.error}` : "",
    confirmation.error ? `customer_confirmation: ${confirmation.error}` : "",
  ].filter(Boolean);

  await supabaseAdmin
    .from("support_tickets")
    .update({
      notification_sent: notification.sent,
      notification_error: notificationErrors.join(" | ") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", insertedTicket.id);

  return NextResponse.json({
    ok: true,
    ticket: normalizeSupportTicket({ ...insertedTicket, notification_sent: notification.sent }),
    email: {
      support_notification_sent: notification.sent,
      customer_confirmation_sent: confirmation.sent,
    },
    message: `Your support request has been received.\nTicket #${insertedTicket.ticket_number}\nA member of the Advisacor support team will review your request.`,
  });
}

export const GET = withAutoFile(getImpl, { source: "internal" });
export const POST = withAutoFile(postImpl, { source: "internal" });
