/**
 * JE-3D — Authoritative sandbox company / connection resolution.
 *
 * Resolves the general-accounting QBO sandbox (Demo A) from database authority.
 * Never trusts remembered realm/connection IDs from callers or env vars.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  JE_3D_ACTIVATION_ERROR,
  Je3dActivationError,
} from "./je3d-activation-policy";

export type SandboxActivationAuthorityRow = {
  companyId: string;
  companyName: string;
  accountingConnectionId: string;
  realmId: string;
  provider: string;
  connectionStatus: string;
  demoRole: "DEMO_A_GENERAL_ACCOUNTING" | "DEMO_B_SPECIALTY" | "UNCLASSIFIED_SANDBOX";
};

export type ResolvedSandboxActivationAllowlist = {
  /** Demo A — preferred first controlled JE sandbox company. */
  demoA: SandboxActivationAuthorityRow | null;
  /** All connected sandbox QB companies discovered from DB authority. */
  sandboxCompanies: SandboxActivationAuthorityRow[];
  allowedCompanyIds: string[];
  canonicalConnectionByCompanyId: Record<string, string>;
};

type AccountingConnectionRow = {
  id: string;
  provider: string | null;
  status: string | null;
  tenant_or_realm_id: string | null;
  external_entity_id: string | null;
  metadata_json: Record<string, unknown> | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  qbo_realm_id: string | null;
};

export type SandboxAllowlistQueryDeps = {
  loadConnections: () => Promise<AccountingConnectionRow[]>;
  loadCompanies: (companyIds: string[]) => Promise<CompanyRow[]>;
};

function realmFromConnection(conn: AccountingConnectionRow): string {
  return (
    String(conn.tenant_or_realm_id || "").trim() ||
    String(conn.external_entity_id || "")
      .replace(/^qbo:/i, "")
      .trim()
  );
}

function companyIdFromConnection(conn: AccountingConnectionRow): string | null {
  const meta = (conn.metadata_json || {}) as Record<string, unknown>;
  const companyId = String(meta.company_id || "").trim();
  return companyId || null;
}

function classifyDemoRole(args: {
  companyName: string;
  metadata: Record<string, unknown>;
}): SandboxActivationAuthorityRow["demoRole"] {
  const explicit = String(args.metadata.demo_role || args.metadata.demoRole || "")
    .trim()
    .toUpperCase();
  if (explicit === "DEMO_A" || explicit === "DEMO_A_GENERAL_ACCOUNTING") {
    return "DEMO_A_GENERAL_ACCOUNTING";
  }
  if (explicit === "DEMO_B" || explicit === "DEMO_B_SPECIALTY") {
    return "DEMO_B_SPECIALTY";
  }
  const name = args.companyName.toLowerCase();
  if (
    name.includes("fixed asset") ||
    name.includes("specialty") ||
    name.includes("fa ")
  ) {
    return "DEMO_B_SPECIALTY";
  }
  if (
    name.includes("demo") &&
    (name.includes("accounting") ||
      name.includes("advisory") ||
      name.includes("group"))
  ) {
    return "DEMO_A_GENERAL_ACCOUNTING";
  }
  return "UNCLASSIFIED_SANDBOX";
}

function scoreDemoA(row: SandboxActivationAuthorityRow): number {
  if (row.demoRole === "DEMO_A_GENERAL_ACCOUNTING") return 100;
  if (row.demoRole === "UNCLASSIFIED_SANDBOX") return 10;
  if (row.demoRole === "DEMO_B_SPECIALTY") return -100;
  return 0;
}

export function buildSandboxAllowlistFromRows(args: {
  connections: AccountingConnectionRow[];
  companies: CompanyRow[];
}): ResolvedSandboxActivationAllowlist {
  const companiesById = new Map(args.companies.map((c) => [c.id, c]));
  const sandboxCompanies: SandboxActivationAuthorityRow[] = [];

  for (const conn of args.connections) {
    if (String(conn.provider || "") !== "quickbooks") continue;
    if (String(conn.status || "") !== "connected") continue;
    const realmId = realmFromConnection(conn);
    if (!realmId) continue;
    const companyId = companyIdFromConnection(conn);
    if (!companyId) continue;
    const company = companiesById.get(companyId);
    if (!company) continue;
    const companyRealm = String(company.qbo_realm_id || "").trim();
    if (companyRealm && companyRealm !== realmId) continue;

    const metadata = (conn.metadata_json || {}) as Record<string, unknown>;
    const companyName = String(company.name || companyId);
    sandboxCompanies.push({
      companyId,
      companyName,
      accountingConnectionId: conn.id,
      realmId,
      provider: "quickbooks",
      connectionStatus: "connected",
      demoRole: classifyDemoRole({ companyName, metadata }),
    });
  }

  const demoA =
    [...sandboxCompanies].sort((a, b) => scoreDemoA(b) - scoreDemoA(a))[0] ??
    null;

  const preferred =
    demoA?.demoRole === "DEMO_A_GENERAL_ACCOUNTING" ? demoA : demoA;

  const allowedCompanyIds = preferred ? [preferred.companyId] : [];
  const canonicalConnectionByCompanyId: Record<string, string> = {};
  if (preferred) {
    canonicalConnectionByCompanyId[preferred.companyId] =
      preferred.accountingConnectionId;
  }

  return {
    demoA: preferred,
    sandboxCompanies,
    allowedCompanyIds,
    canonicalConnectionByCompanyId,
  };
}

export function createDefaultSandboxAllowlistQueryDeps(): SandboxAllowlistQueryDeps {
  return {
    loadConnections: async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("accounting_connections")
        .select(
          "id, provider, status, tenant_or_realm_id, external_entity_id, metadata_json",
        )
        .eq("provider", "quickbooks")
        .eq("status", "connected");
      if (error) {
        throw new Je3dActivationError(
          JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
          `Failed to resolve sandbox activation allowlist: ${error.message}`,
        );
      }
      return (data || []) as AccountingConnectionRow[];
    },
    loadCompanies: async (companyIds: string[]) => {
      if (companyIds.length === 0) return [];
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, qbo_realm_id")
        .in("id", companyIds);
      if (error) {
        throw new Je3dActivationError(
          JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
          `Failed to resolve sandbox companies: ${error.message}`,
        );
      }
      return (data || []) as CompanyRow[];
    },
  };
}

export async function resolveSandboxActivationAllowlist(
  deps: SandboxAllowlistQueryDeps = createDefaultSandboxAllowlistQueryDeps(),
): Promise<ResolvedSandboxActivationAllowlist> {
  const connections = await deps.loadConnections();
  const companyIds = [
    ...new Set(
      connections
        .map((c) => companyIdFromConnection(c))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const companies = await deps.loadCompanies(companyIds);
  return buildSandboxAllowlistFromRows({ connections, companies });
}

export function assertExecutionOnAllowlistedSandbox(args: {
  executionCompanyId: string;
  executionConnectionId: string;
  allowlist: ResolvedSandboxActivationAllowlist;
}): void {
  if (!args.allowlist.allowedCompanyIds.includes(args.executionCompanyId)) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.COMPANY_NOT_ALLOWLISTED,
      "Execution company is not on the controlled sandbox activation allowlist.",
    );
  }
  const canonical =
    args.allowlist.canonicalConnectionByCompanyId[args.executionCompanyId];
  if (!canonical || canonical !== args.executionConnectionId) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.CONNECTION_NOT_CANONICAL,
      "Execution accounting_connection_id is not the canonical sandbox connection for the allowlisted company.",
    );
  }
}

export function assertTokenRealmMatchesConnection(args: {
  tokenRealmId: string;
  connectionRealmId: string;
}): void {
  if (
    !args.tokenRealmId ||
    !args.connectionRealmId ||
    args.tokenRealmId !== args.connectionRealmId
  ) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.REALM_MISMATCH,
      "Resolved token realm does not match persisted accounting connection realm.",
    );
  }
}
