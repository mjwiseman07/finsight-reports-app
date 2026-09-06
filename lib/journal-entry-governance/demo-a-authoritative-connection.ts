/**
 * Authoritative Demo A connection loader for sandbox two-person prepare.
 * Loads by exact connection ID — never user-scoped OAuth selection.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  isVerifiedDemoAIdentityMatch,
} from "./je3d-first-controlled-create-activation";
import { JE_ACTIVATION_DEMO_ROLE_DEMO_A } from "./je3d-sandbox-company-authority";
import { JeExecutionCustodyError } from "./execution-custody";
import { JE_EXECUTION_ERROR } from "./execution-types";

export class DemoAAuthoritativeConnectionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DemoAAuthoritativeConnectionError";
    this.code = code;
  }
}

function coerceConnection(
  raw: Record<string, unknown>,
): AccountingConnectionRecord {
  return raw as unknown as AccountingConnectionRecord;
}

/**
 * Load and validate the canonical Demo A sandbox connection by exact ID.
 * Does not consult connection.user_id for custody authority.
 */
export async function loadAuthoritativeDemoAConnection(): Promise<AccountingConnectionRecord> {
  const supabase = getSupabaseAdmin();
  const connectionId = JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId;
  const companyId = JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId;

  const { data: conn, error: connError } = await supabase
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (connError || !conn?.id) {
    throw new DemoAAuthoritativeConnectionError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      `Canonical connection ${connectionId} was not found.`,
    );
  }

  const row = conn as Record<string, unknown>;
  if (String(row.provider || "") !== "quickbooks") {
    throw new DemoAAuthoritativeConnectionError(
      JE_EXECUTION_ERROR.PROVIDER_UNSUPPORTED,
      "Canonical connection provider must be quickbooks.",
    );
  }
  if (String(row.status || "") !== "connected") {
    throw new DemoAAuthoritativeConnectionError(
      JE_EXECUTION_ERROR.CONNECTION_UNHEALTHY,
      `Canonical connection status is ${String(row.status)}, expected connected.`,
    );
  }
  if (row.provider_environment !== "sandbox") {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_connection_not_sandbox",
      "Canonical connection provider_environment must be sandbox.",
    );
  }
  const realmId = String(row.tenant_or_realm_id || "").trim();
  if (realmId !== JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId) {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_realm_mismatch",
      "Canonical connection realm does not match Demo A identity.",
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, qbo_realm_id, je_activation_demo_role")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError || !company?.id) {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_company_not_found",
      "Demo A company was not found.",
    );
  }
  if (String(company.qbo_realm_id || "").trim() !== realmId) {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_company_realm_mismatch",
      "Company qbo_realm_id does not match canonical connection realm.",
    );
  }
  if (company.je_activation_demo_role !== JE_ACTIVATION_DEMO_ROLE_DEMO_A) {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_role_mismatch",
      "Company je_activation_demo_role must be DEMO_A_GENERAL_ACCOUNTING.",
    );
  }

  if (
    !isVerifiedDemoAIdentityMatch({
      companyId,
      accountingConnectionId: connectionId,
      realmId,
      providerEnvironment: "sandbox",
      demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
    })
  ) {
    throw new DemoAAuthoritativeConnectionError(
      "je_demo_a_identity_mismatch",
      "Connection/company binding does not match verified Demo A identity.",
    );
  }

  return coerceConnection(row);
}

export function mapDemoAConnectionError(
  err: unknown,
): { code: string; message: string } {
  if (err instanceof DemoAAuthoritativeConnectionError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof JeExecutionCustodyError) {
    return { code: err.code, message: err.message };
  }
  return {
    code: JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
    message: err instanceof Error ? err.message : "Connection validation failed.",
  };
}
