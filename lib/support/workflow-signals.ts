import { supabaseAdmin } from "../supabase";

export type WorkflowSignalKind =
  | "qbo_connection_expired"
  | "qbo_connection_disconnected"
  | "qbo_connection_missing"
  | "cdc_stalled"
  | "recent_api_error"
  | "recent_auto_filed_ticket"
  | "referrer_context";

export interface WorkflowSignal {
  kind: WorkflowSignalKind;
  severity: "high" | "medium" | "low";
  observedAt: string;
  detail: Record<string, unknown>;
}

export interface RecentAutoFiledTicket {
  ticket_id: string;
  ticket_number: number | null;
  error_class: string;
  correlation_id: string;
  created_at: string;
}

export interface WorkflowSignalBundle {
  userId: string;
  signals: WorkflowSignal[];
  mostRecentAutoFiledTicket: RecentAutoFiledTicket | null;
  contextParam: string | null;
}

function sanitizeContextParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.slice(0, 240);
  if (/[<>`\n\r]/.test(trimmed)) return null;
  if (!/^[A-Za-z0-9\-_./: ?=&]+$/.test(trimmed)) return null;
  return trimmed;
}

async function checkQboConnection(userId: string): Promise<WorkflowSignal | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin
      .from("qbo_connections_unified")
      .select("realm_id, token_expiry, status")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (!data) {
      return { kind: "qbo_connection_missing", severity: "medium", observedAt: nowIso, detail: {} };
    }
    if (data.status === "disconnected") {
      return {
        kind: "qbo_connection_disconnected",
        severity: "high",
        observedAt: nowIso,
        detail: { realm_id: data.realm_id },
      };
    }
    if (data.token_expiry && new Date(data.token_expiry) < new Date()) {
      const expiredAgoMin = Math.floor((Date.now() - new Date(data.token_expiry).getTime()) / 60000);
      return {
        kind: "qbo_connection_expired",
        severity: "high",
        observedAt: nowIso,
        detail: { realm_id: data.realm_id, expired_ago_minutes: expiredAgoMin },
      };
    }
    return null;
  } catch (err) {
    console.warn("[workflow-signals] qbo check failed", err);
    return null;
  }
}

async function checkCdcHealth(userId: string): Promise<WorkflowSignal | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data: conns } = await supabaseAdmin
      .from("qbo_connections_unified")
      .select("realm_id")
      .eq("user_id", userId);
    if (!conns || conns.length === 0) return null;
    const realmIds = conns.map((c) => c.realm_id).filter(Boolean);
    if (realmIds.length === 0) return null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: runs } = await supabaseAdmin
      .from("qbo_cdc_runs")
      .select("run_id, realm_id, status, error_message, started_at")
      .in("realm_id", realmIds)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(3);
    if (!runs || runs.length === 0) return null;
    const bad = runs.find((r) => r.status === "error" || r.status === "stalled");
    if (!bad) return null;
    return {
      kind: "cdc_stalled",
      severity: "high",
      observedAt: new Date().toISOString(),
      detail: {
        error_message: bad.error_message,
        last_progress_at: bad.started_at,
        realm_id: bad.realm_id,
      },
    };
  } catch (err) {
    console.warn("[workflow-signals] cdc check failed", err);
    return null;
  }
}

async function checkRecentApiErrors(userId: string): Promise<WorkflowSignal | null> {
  if (!supabaseAdmin) return null;
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from("audit_logs")
      .select("event_type, metadata, created_at")
      .eq("actor_user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) return null;
    const errors = data.filter((row) => {
      const et = String(row.event_type || "");
      if (et.endsWith(".error") || et.endsWith("_failed")) return true;
      const meta = (row.metadata as Record<string, unknown>) || {};
      const hs = String(meta.http_status || "");
      return hs.startsWith("4") || hs.startsWith("5");
    });
    if (errors.length === 0) return null;
    const first = errors[0];
    return {
      kind: "recent_api_error",
      severity: "medium",
      observedAt: new Date().toISOString(),
      detail: {
        count: errors.length,
        first_event_type: first.event_type,
        first_at: first.created_at,
      },
    };
  } catch (err) {
    console.warn("[workflow-signals] audit_logs check failed", err);
    return null;
  }
}

async function findRecentAutoFiledTicket(userId: string): Promise<RecentAutoFiledTicket | null> {
  if (!supabaseAdmin) return null;
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from("support_tickets")
      .select("id, ticket_number, error_class, correlation_id, created_at")
      .eq("user_id", userId)
      .eq("auto_filed", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      ticket_id: data.id,
      ticket_number: data.ticket_number ?? null,
      error_class: data.error_class || "unknown",
      correlation_id: data.correlation_id || "",
      created_at: data.created_at,
    };
  } catch (err) {
    console.warn("[workflow-signals] auto-filed ticket lookup failed", err);
    return null;
  }
}

export async function collectWorkflowSignals(args: {
  userId: string;
  contextParam?: string | null;
}): Promise<WorkflowSignalBundle> {
  const signals: WorkflowSignal[] = [];
  const contextParam = sanitizeContextParam(args.contextParam ?? null);

  const [qbo, cdc, apiErr, autoTicket] = await Promise.all([
    checkQboConnection(args.userId),
    checkCdcHealth(args.userId),
    checkRecentApiErrors(args.userId),
    findRecentAutoFiledTicket(args.userId),
  ]);

  if (qbo) signals.push(qbo);
  if (cdc) signals.push(cdc);
  if (apiErr) signals.push(apiErr);
  if (autoTicket) {
    signals.push({
      kind: "recent_auto_filed_ticket",
      severity: "high",
      observedAt: new Date().toISOString(),
      detail: {
        ticket_number: autoTicket.ticket_number,
        error_class: autoTicket.error_class,
      },
    });
  }
  if (contextParam) {
    signals.push({
      kind: "referrer_context",
      severity: "low",
      observedAt: new Date().toISOString(),
      detail: { raw: contextParam },
    });
  }

  return {
    userId: args.userId,
    signals,
    mostRecentAutoFiledTicket: autoTicket,
    contextParam,
  };
}
