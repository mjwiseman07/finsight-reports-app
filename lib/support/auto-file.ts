import crypto from "node:crypto";
import { supabaseAdmin } from "../supabase";
import { getEarlyAccessEmailConfig, getSupportEmail, sendEmail, escapeHtml } from "../email";
import { classifyError, normalizeEndpoint } from "./error-classifier";
import { ERROR_CLASS, adaptiveDedupWindowMinutes, humanNameForErrorClass } from "./error-taxonomy";
import { humanContext } from "./human-names";

const CIRCUIT_WINDOW_MS = 15 * 60 * 1000;
const CIRCUIT_TRIP_THRESHOLD = 100;
const CIRCUIT_COOLDOWN_MS = 30 * 60 * 1000;

const USER_NEW_FINGERPRINT_BUDGET = 10;
const USER_NEW_FINGERPRINT_WINDOW_MS = 60 * 60 * 1000;

export interface AutoFileArgs {
  userId: string;
  source: "qbo" | "cdc" | "internal" | "bedrock" | "stripe";
  httpStatus?: number;
  qboFaultCode?: string | null;
  qboFaultMessage?: string | null;
  errorMessage?: string | null;
  errorName?: string | null;
  realmId?: string | null;
  intuit_tid?: string | null;
  endpoint?: string | null;
  method?: string;
  workflowContext?: { path?: string; referrer?: string; error_message?: string } | null;
}

export interface AutoFileResult {
  outcome: "filed" | "deduped" | "circuit_open" | "umbrella" | "skipped";
  ticketId?: string;
  ticketNumber?: number;
  errorClass: string;
  dedupeKey: string;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function priorityForClass(errorClass: string): "Critical" | "High" | "Standard" {
  if (
    errorClass.startsWith("qbo.auth") ||
    errorClass === ERROR_CLASS.INTERNAL_UNCAUGHT ||
    errorClass === ERROR_CLASS.INTERNAL_DB_ERROR
  ) {
    return "Critical";
  }
  if (errorClass.startsWith("qbo.write") || errorClass === ERROR_CLASS.CDC_FAILED) return "High";
  return "Standard";
}

async function checkAndUpdateCircuit(errorClass: string): Promise<"open" | "closed"> {
  if (!supabaseAdmin) return "closed";
  const now = new Date();
  const { data: row } = await supabaseAdmin
    .from("support_error_circuit")
    .select("*")
    .eq("error_class", errorClass)
    .maybeSingle();

  if (row?.tripped_until && new Date(row.tripped_until) > now) {
    return "open";
  }

  const windowStart = row?.window_start ? new Date(row.window_start) : now;
  const withinWindow = now.getTime() - windowStart.getTime() < CIRCUIT_WINDOW_MS;
  const nextCount = withinWindow ? (row?.occurrence_count ?? 0) + 1 : 1;
  const nextWindowStart = withinWindow ? windowStart.toISOString() : now.toISOString();

  const shouldTrip = nextCount > CIRCUIT_TRIP_THRESHOLD;
  const trippedAt = shouldTrip ? now.toISOString() : row?.tripped_at ?? null;
  const trippedUntil = shouldTrip
    ? new Date(now.getTime() + CIRCUIT_COOLDOWN_MS).toISOString()
    : row?.tripped_until && new Date(row.tripped_until) > now
      ? row.tripped_until
      : null;

  await supabaseAdmin.from("support_error_circuit").upsert(
    {
      error_class: errorClass,
      window_start: nextWindowStart,
      occurrence_count: nextCount,
      tripped_at: trippedAt,
      tripped_until: trippedUntil,
      last_updated: now.toISOString(),
    },
    { onConflict: "error_class" },
  );

  return shouldTrip || (row?.tripped_until && new Date(row.tripped_until) > now) ? "open" : "closed";
}

async function countRecentUserFingerprints(userId: string): Promise<number> {
  if (!supabaseAdmin) return 0;
  const since = new Date(Date.now() - USER_NEW_FINGERPRINT_WINDOW_MS).toISOString();
  const { data } = await supabaseAdmin
    .from("support_tickets")
    .select("auto_file_dedupe_key")
    .eq("user_id", userId)
    .eq("auto_filed", true)
    .gte("created_at", since);
  if (!data) return 0;
  const set = new Set(data.map((r) => r.auto_file_dedupe_key).filter(Boolean));
  return set.size;
}

async function attachToUmbrella(
  userId: string,
  errorClass: string,
): Promise<{ ticketId: string; ticketNumber: number } | null> {
  if (!supabaseAdmin) return null;
  const today = new Date().toISOString().slice(0, 10);
  const umbrellaKey = sha256(`umbrella_${userId}_${today}`);

  const { data: existing } = await supabaseAdmin
    .from("support_tickets")
    .select("id, ticket_number, workflow_context, auto_file_count")
    .eq("auto_file_dedupe_key", umbrellaKey)
    .eq("auto_filed", true)
    .neq("status", "closed")
    .maybeSingle();

  if (existing) {
    const wf = (existing.workflow_context as Record<string, unknown>) || {};
    const classes = Array.isArray(wf.umbrella_classes) ? (wf.umbrella_classes as string[]) : [];
    if (!classes.includes(errorClass)) classes.push(errorClass);
    await supabaseAdmin
      .from("support_tickets")
      .update({
        auto_file_count: (existing.auto_file_count ?? 1) + 1,
        workflow_context: { ...wf, umbrella_classes: classes },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { ticketId: existing.id, ticketNumber: existing.ticket_number };
  }

  // Create the umbrella ticket
  const correlationId = crypto.randomUUID();
  const { data: inserted, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({
      user_id: userId,
      subject: "[Auto] Multiple issues detected on your account",
      description:
        "Advisacor detected multiple distinct errors on your account within the last hour. " +
        "We've grouped them into this umbrella ticket. Our team is investigating.",
      category: "Bug Report",
      ticket_type: "Platform Instability",
      priority: "Critical",
      status: "Open",
      auto_filed: true,
      auto_file_dedupe_key: umbrellaKey,
      auto_file_count: 1,
      error_class: "umbrella.multiple",
      correlation_id: correlationId,
      workflow_context: { umbrella_classes: [errorClass] },
    })
    .select("id, ticket_number")
    .maybeSingle();

  if (error || !inserted) return null;
  return { ticketId: inserted.id, ticketNumber: inserted.ticket_number };
}

async function sendAutoFileNotification(ticket: Record<string, unknown>): Promise<void> {
  try {
    const { fromEmail, replyToEmail } = getEarlyAccessEmailConfig();
    await sendEmail({
      from: fromEmail,
      to: [getSupportEmail()],
      reply_to: [replyToEmail],
      subject: `[AUTO] Ticket #${ticket.ticket_number} — ${ticket.error_class}`,
      text: [
        `[AUTO-FILED] Ticket #${ticket.ticket_number} — ${ticket.error_class}`,
        ``,
        `Occurrence count in current window: ${ticket.auto_file_count}`,
        `User: ${ticket.user_email || "(unknown)"} (${ticket.user_id})`,
        `QBO realm: ${ticket.qbo_realm_id || "not connected"}`,
        `Last Intuit request ID: ${ticket.last_intuit_tid || "none captured"}`,
        `Endpoint: ${ticket.endpoint || "n/a"}`,
        `HTTP status: ${ticket.http_status ?? "n/a"}`,
        `Fault code: ${ticket.qbo_fault_code || "n/a"}`,
        `Fault message: ${ticket.qbo_fault_message || "n/a"}`,
        ``,
        `Workflow path: ${(ticket.workflow_context as Record<string, unknown>)?.path || "unknown"}`,
        `Correlation ID: ${ticket.correlation_id || "(none)"}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[auto-file] notification email failed", err);
  }
}

async function sendAutoFileCustomerConfirmation(ticket: Record<string, unknown>): Promise<void> {
  try {
    if (!ticket.user_email) return;
    const { fromEmail, replyToEmail } = getEarlyAccessEmailConfig();
    const wf = (ticket.workflow_context as Record<string, unknown>) || {};
    const context = humanContext(typeof wf.path === "string" ? wf.path : null);
    const humanErr = humanNameForErrorClass(String(ticket.error_class || ""));

    const text = [
      `We noticed something went wrong while you were ${context}.`,
      ``,
      `Rather than leave you to figure it out, we've filed a support ticket on your behalf. Our team is already looking into it.`,
      ``,
      `What we saw: ${humanErr}`,
      `Correlation ID: ${ticket.correlation_id || ""}`,
      ``,
      `You don't need to do anything. If we need more from you to resolve it, we'll reach out.`,
      ``,
      `— The Advisacor team`,
    ].join("\n");

    const html =
      `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">` +
      `<p>We noticed something went wrong while you were ${escapeHtml(context)}.</p>` +
      `<p>Rather than leave you to figure it out, we've filed a support ticket on your behalf. Our team is already looking into it.</p>` +
      `<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin:12px 0;">` +
      `<p style="margin:0;"><strong>What we saw:</strong> ${escapeHtml(humanErr)}</p>` +
      `<p style="margin:6px 0 0;"><strong>Correlation ID:</strong> ${escapeHtml(String(ticket.correlation_id || ""))}</p>` +
      `</div>` +
      `<p>You don't need to do anything. If we need more from you to resolve it, we'll reach out.</p>` +
      `<p>— The Advisacor team</p>` +
      `</div>`;

    await sendEmail({
      from: fromEmail,
      to: [String(ticket.user_email)],
      reply_to: [replyToEmail],
      subject: `Advisacor detected an issue and filed ticket #${ticket.ticket_number} for you`,
      text,
      html,
    });
  } catch (err) {
    console.error("[auto-file] customer confirmation email failed", err);
  }
}

export async function autoFileTicket(args: AutoFileArgs): Promise<AutoFileResult> {
  const errorClass = classifyError({
    source: args.source,
    httpStatus: args.httpStatus,
    method: args.method,
    qboFaultCode: args.qboFaultCode,
    qboFaultMessage: args.qboFaultMessage,
    errorMessage: args.errorMessage,
    errorName: args.errorName,
  });
  const normalized = normalizeEndpoint(args.endpoint || null);
  const dedupeKey = sha256(
    `${args.userId}|${errorClass}|${normalized}|${args.realmId || "none"}`,
  );

  if (!args.userId || !supabaseAdmin) {
    return { outcome: "skipped", errorClass, dedupeKey };
  }

  try {
    const circuit = await checkAndUpdateCircuit(errorClass);
    if (circuit === "open") return { outcome: "circuit_open", errorClass, dedupeKey };

    // Dedup lookup
    const windowMinutes = adaptiveDedupWindowMinutes(errorClass);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data: existing } = await supabaseAdmin
      .from("support_tickets")
      .select("id, ticket_number, auto_file_count")
      .eq("auto_file_dedupe_key", dedupeKey)
      .eq("auto_filed", true)
      .neq("status", "closed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("support_tickets")
        .update({
          auto_file_count: (existing.auto_file_count ?? 1) + 1,
          last_intuit_tid: args.intuit_tid || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return {
        outcome: "deduped",
        ticketId: existing.id,
        ticketNumber: existing.ticket_number,
        errorClass,
        dedupeKey,
      };
    }

    // New-fingerprint budget
    const distinctInLastHour = await countRecentUserFingerprints(args.userId);
    if (distinctInLastHour >= USER_NEW_FINGERPRINT_BUDGET) {
      const umbrella = await attachToUmbrella(args.userId, errorClass);
      if (umbrella) {
        return {
          outcome: "umbrella",
          ticketId: umbrella.ticketId,
          ticketNumber: umbrella.ticketNumber,
          errorClass,
          dedupeKey,
        };
      }
    }

    // Compose subject/description
    const priority = priorityForClass(errorClass);
    const humanErr = humanNameForErrorClass(errorClass);
    const wfPath = args.workflowContext?.path || null;
    const subject = `[Auto] ${humanErr} on ${(args.method || "GET").toUpperCase()} ${normalized}`.slice(0, 200);
    const correlationId = crypto.randomUUID();
    const description = [
      `Advisacor detected ${humanErr}.`,
      ``,
      `When: ${new Date().toISOString()}`,
      `Path: ${wfPath || "unknown"}`,
      `Correlation ID: ${correlationId}`,
    ].join("\n");

    // Fetch user_email for the emails (best-effort)
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", args.userId)
      .maybeSingle();

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: args.userId,
        subject,
        description,
        category: "Bug Report",
        ticket_type: "Auto-Filed Issue",
        priority,
        status: "Open",
        auto_filed: true,
        auto_file_dedupe_key: dedupeKey,
        auto_file_count: 1,
        error_class: errorClass,
        correlation_id: correlationId,
        qbo_realm_id: args.realmId || null,
        last_intuit_tid: args.intuit_tid || null,
        workflow_context: {
          path: args.workflowContext?.path || null,
          referrer: args.workflowContext?.referrer || null,
          error_message: args.workflowContext?.error_message || args.errorMessage || null,
          endpoint: normalized,
          http_status: args.httpStatus ?? null,
          qbo_fault_code: args.qboFaultCode || null,
          qbo_fault_message: args.qboFaultMessage || null,
        },
      })
      .select("id, ticket_number")
      .maybeSingle();

    if (insertErr || !inserted) {
      console.error("[auto-file] insert failed", insertErr);
      return { outcome: "skipped", errorClass, dedupeKey };
    }

    const notifyPayload = {
      ...inserted,
      user_id: args.userId,
      user_email: userRow?.email || null,
      error_class: errorClass,
      auto_file_count: 1,
      qbo_realm_id: args.realmId || null,
      last_intuit_tid: args.intuit_tid || null,
      endpoint: normalized,
      http_status: args.httpStatus ?? null,
      qbo_fault_code: args.qboFaultCode || null,
      qbo_fault_message: args.qboFaultMessage || null,
      workflow_context: { path: args.workflowContext?.path || null },
      correlation_id: correlationId,
    };

    void sendAutoFileNotification(notifyPayload).catch(() => {});
    void sendAutoFileCustomerConfirmation(notifyPayload).catch(() => {});

    return {
      outcome: "filed",
      ticketId: inserted.id,
      ticketNumber: inserted.ticket_number,
      errorClass,
      dedupeKey,
    };
  } catch (err) {
    console.error("[auto-file] engine threw, swallowing", err);
    return { outcome: "skipped", errorClass, dedupeKey };
  }
}
