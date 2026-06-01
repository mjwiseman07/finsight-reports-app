import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { resolveSuperAdminAccess } from "../../../../lib/super-admin-security";
import { supabaseAdmin } from "../../../../lib/supabase";
import { normalizeSupportTicket, supportTicketStatuses } from "../../../../lib/support-center";
import { auditSecurityEvent } from "../../../../lib/security-audit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-support-ticket-list", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  let builder = supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (query) {
    builder = builder.or(`subject.ilike.%${query}%,description.ilike.%${query}%,company_name.ilike.%${query}%,user_email.ilike.%${query}%`);
  }

  const { data, error } = await builder;

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the support tickets migration before using the admin support dashboard." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to load support tickets." }, { status: 500 });
  }

  const tickets = (data || []).map(normalizeSupportTicket);
  const summary = tickets.reduce(
    (counts, ticket) => {
      if (ticket.type === "Feature Request") counts.featureRequests += 1;
      else if (ticket.type === "Bug Report") counts.bugs += 1;
      else counts.supportIssues += 1;
      return counts;
    },
    { bugs: 0, supportIssues: 0, featureRequests: 0 },
  );

  return NextResponse.json({ tickets, summary });
}

export async function PATCH(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-support-ticket-update", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const ticketId = String(body.ticket_id || "").trim();
  if (!ticketId) return NextResponse.json({ error: "Ticket id is required." }, { status: 400 });

  const status = supportTicketStatuses.includes(body.status) ? body.status : undefined;
  const updates = {
    ...(status ? { status, closed_at: ["Resolved", "Closed"].includes(status) ? new Date().toISOString() : null } : {}),
    ...(typeof body.assigned_to === "string" ? { assigned_to: body.assigned_to.trim() } : {}),
    ...(typeof body.admin_notes === "string" ? { admin_notes: body.admin_notes.trim() } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the support tickets migration before using the admin support dashboard." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to update support ticket." }, { status: 500 });
  }

  await auditSecurityEvent({
    eventType: "admin_support_ticket_updated",
    actorUserId: access.userId,
    actorEmail: access.email,
    resourceType: "support_ticket",
    resourceId: ticketId,
    metadata: {
      status: updates.status || null,
      assigned_to_updated: typeof body.assigned_to === "string",
      admin_notes_updated: typeof body.admin_notes === "string",
    },
  });

  return NextResponse.json({ ticket: normalizeSupportTicket(data) });
}
