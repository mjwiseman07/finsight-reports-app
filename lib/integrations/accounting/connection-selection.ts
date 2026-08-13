/**
 * Accounting connection selection safety (PR A).
 *
 * Explicit connectionId: exact identity or fail closed — never fall back to
 * "latest connection for user/provider".
 * No connectionId: only status = connected rows are candidates.
 */
import type { AccountingConnectionRecord, AccountingConnectionStatus } from "./types";

export type AccountingConnectionSelectionErrorCode =
  | "ACCOUNTING_CONNECTION_EXPIRED"
  | "ACCOUNTING_CONNECTION_DISCONNECTED"
  | "ACCOUNTING_CONNECTION_FAILED"
  | "ACCOUNTING_CONNECTION_NOT_READY"
  | "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED";

export class AccountingConnectionSelectionError extends Error {
  code: AccountingConnectionSelectionErrorCode;
  httpStatus: number;
  connectionId: string;
  status: AccountingConnectionStatus | string;

  constructor(args: {
    code: AccountingConnectionSelectionErrorCode;
    message: string;
    connectionId: string;
    status: AccountingConnectionStatus | string;
    httpStatus: number;
  }) {
    super(args.message);
    this.name = "AccountingConnectionSelectionError";
    this.code = args.code;
    this.connectionId = args.connectionId;
    this.status = args.status;
    this.httpStatus = args.httpStatus;
  }
}

type ConnectionQueryClient = {
  from: (table: string) => any;
};

function mapNonConnectedStatus(connection: AccountingConnectionRecord): AccountingConnectionSelectionError {
  const status = String(connection.status || "");
  const id = String(connection.id);
  switch (status) {
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
 */
export function assertExplicitConnectionAuthoritative(
  connection: AccountingConnectionRecord | null | undefined,
): AccountingConnectionRecord | null {
  if (!connection) return null;
  if (connection.status === "connected") return connection;
  throw mapNonConnectedStatus(connection);
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
    return assertExplicitConnectionAuthoritative(row);
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
  return {
    error: error.message,
    code: error.code,
    status: error.status,
    connectionId: error.connectionId,
  };
}
