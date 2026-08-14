/**
 * Accounting connection selection safety (PR A) + supersession recognition (PR B).
 *
 * Explicit connectionId: exact identity or fail closed — never fall back to
 * "latest connection for user/provider".
 * No connectionId: only status = connected rows are candidates.
 *
 * status = superseded is never authoritative. When an explicit superseded row is
 * requested, throw ACCOUNTING_CONNECTION_SUPERSEDED. successorConnectionId is
 * only exposed after validating the successor grant identity.
 */
import type { AccountingConnectionRecord, AccountingConnectionStatus } from "./types";

export type AccountingConnectionSelectionErrorCode =
  | "ACCOUNTING_CONNECTION_EXPIRED"
  | "ACCOUNTING_CONNECTION_DISCONNECTED"
  | "ACCOUNTING_CONNECTION_FAILED"
  | "ACCOUNTING_CONNECTION_NOT_READY"
  | "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED"
  | "ACCOUNTING_CONNECTION_SUPERSEDED";

export class AccountingConnectionSelectionError extends Error {
  code: AccountingConnectionSelectionErrorCode;
  httpStatus: number;
  connectionId: string;
  status: AccountingConnectionStatus | string;
  successorConnectionId?: string | null;

  constructor(args: {
    code: AccountingConnectionSelectionErrorCode;
    message: string;
    connectionId: string;
    status: AccountingConnectionStatus | string;
    httpStatus: number;
    successorConnectionId?: string | null;
  }) {
    super(args.message);
    this.name = "AccountingConnectionSelectionError";
    this.code = args.code;
    this.connectionId = args.connectionId;
    this.status = args.status;
    this.httpStatus = args.httpStatus;
    if (args.successorConnectionId) {
      this.successorConnectionId = args.successorConnectionId;
    }
  }
}

type ConnectionQueryClient = {
  from: (table: string) => any;
};

/** Reject self-successor links at the business layer. */
export function isSelfSupersession(connection: {
  id?: string | null;
  superseded_by_connection_id?: string | null;
}): boolean {
  const id = String(connection.id || "").trim();
  const successor = String(connection.superseded_by_connection_id || "").trim();
  return Boolean(id && successor && id === successor);
}

/**
 * Expose successorConnectionId only when the FK points at a connected grant
 * for the same user + provider + tenant. Never blindly return the FK value.
 */
export function isExposableSupersessionSuccessor(args: {
  predecessor: AccountingConnectionRecord;
  successor: AccountingConnectionRecord | null | undefined;
}): boolean {
  const { predecessor, successor } = args;
  if (!successor) return false;
  if (isSelfSupersession({ id: predecessor.id, superseded_by_connection_id: successor.id })) return false;
  if (successor.status !== "connected") return false;
  if (String(successor.user_id) !== String(predecessor.user_id)) return false;
  if (String(successor.provider) !== String(predecessor.provider)) return false;
  const predTenant = String(predecessor.tenant_or_realm_id || "");
  const succTenant = String(successor.tenant_or_realm_id || "");
  if (!predTenant || !succTenant || predTenant !== succTenant) return false;
  return true;
}

function mapNonConnectedStatus(connection: AccountingConnectionRecord): AccountingConnectionSelectionError {
  const status = String(connection.status || "");
  const id = String(connection.id);
  switch (status) {
    case "superseded":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_SUPERSEDED",
        message: "Accounting connection has been superseded; use the successor connection.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "expired":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_EXPIRED",
        message: "Accounting connection expired; reconnect required.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "disconnected":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_DISCONNECTED",
        message: "Accounting connection is disconnected; reconnect required.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "failed":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_FAILED",
        message: "Accounting connection is in a failed state.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "pending":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_NOT_READY",
        message: "Accounting connection is not ready yet.",
        connectionId: id,
        status,
        httpStatus: 422,
      });
    case "needs_entity_selection":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED",
        message: "Accounting connection requires entity selection.",
        connectionId: id,
        status,
        httpStatus: 422,
      });
    default:
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_NOT_READY",
        message: `Accounting connection status "${status}" is not authoritative.`,
        connectionId: id,
        status,
        httpStatus: 422,
      });
  }
}

/**
 * Enforce authoritative status for an exact connection row.
 * Unknown/missing rows stay null (non-disclosing not-found).
 * For superseded rows without a validated successor, throws without successor id.
 */
export function assertExplicitConnectionAuthoritative(
  connection: AccountingConnectionRecord | null | undefined,
): AccountingConnectionRecord | null {
  if (!connection) return null;
  if (connection.status === "connected") return connection;
  throw mapNonConnectedStatus(connection);
}

async function loadConnectionById(
  supabase: ConnectionQueryClient,
  connectionId: string,
): Promise<AccountingConnectionRecord | null> {
  const { data, error } = await supabase
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .limit(1);
  if (error) throw error;
  return ((data?.[0] as AccountingConnectionRecord | undefined) || null);
}

async function throwSupersededSelectionError(
  supabase: ConnectionQueryClient,
  connection: AccountingConnectionRecord,
): Promise<never> {
  let successorConnectionId: string | null = null;
  const candidateId = String(connection.superseded_by_connection_id || "").trim();
  if (candidateId && !isSelfSupersession(connection)) {
    const successor = await loadConnectionById(supabase, candidateId);
    if (isExposableSupersessionSuccessor({ predecessor: connection, successor })) {
      successorConnectionId = String(successor!.id);
    }
  }
  throw new AccountingConnectionSelectionError({
    code: "ACCOUNTING_CONNECTION_SUPERSEDED",
    message: "Accounting connection has been superseded; use the successor connection.",
    connectionId: String(connection.id),
    status: "superseded",
    httpStatus: 409,
    successorConnectionId,
  });
}

/**
 * Select a connection for active accounting context.
 * - Explicit connectionId: exact id + user (+ provider when supplied). No fallback.
 * - No connectionId: status=connected only, newest updated_at.
 */
export async function selectAccountingConnectionForActiveContext(args: {
  supabase: ConnectionQueryClient;
  userId: string;
  connectionId?: string | null;
  sourceSystem?: string | null;
}): Promise<AccountingConnectionRecord | null> {
  const explicitId = String(args.connectionId || "").trim();
  const provider = String(args.sourceSystem || "").trim();

  if (explicitId) {
    let query = args.supabase
      .from("accounting_connections")
      .select("*")
      .eq("id", explicitId)
      .eq("user_id", args.userId);
    if (provider) query = query.eq("provider", provider);
    const { data, error } = await query.limit(1);
    if (error) throw error;
    const row = (data?.[0] as AccountingConnectionRecord | undefined) || null;
    if (!row) return null;
    if (row.status === "connected") return row;
    if (row.status === "superseded") {
      await throwSupersededSelectionError(args.supabase, row);
    }
    throw mapNonConnectedStatus(row);
  }

  let query = args.supabase
    .from("accounting_connections")
    .select("*")
    .eq("user_id", args.userId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false });
  if (provider) query = query.eq("provider", provider);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return ((data?.[0] as AccountingConnectionRecord | undefined) || null);
}

export function accountingConnectionSelectionErrorBody(error: AccountingConnectionSelectionError) {
  const body: Record<string, unknown> = {
    error: error.message,
    code: error.code,
    status: error.status,
    connectionId: error.connectionId,
  };
  if (error.successorConnectionId) {
    body.successorConnectionId = error.successorConnectionId;
  }
  return body;
}
