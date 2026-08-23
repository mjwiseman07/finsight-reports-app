/**
 * JE-3D — Authoritative sandbox company / connection resolution.
 *
 * Allowlists ONLY when database authority proves ALL of:
 *   provider = quickbooks, status = connected,
 *   provider_environment = sandbox (durable connection field),
 *   je_activation_demo_role = DEMO_A_GENERAL_ACCOUNTING (durable company field),
 *   canonical company/realm binding exact.
 *
 * No company-name heuristics. No scoring. No UNCLASSIFIED/DEMO_B fallback.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  JE_3D_ACTIVATION_ERROR,
  Je3dActivationError,
} from "./je3d-activation-policy";

export const JE_ACTIVATION_DEMO_ROLE_DEMO_A =
  "DEMO_A_GENERAL_ACCOUNTING" as const;

export type JeActivationDemoRole =
  | typeof JE_ACTIVATION_DEMO_ROLE_DEMO_A
  | "DEMO_B_SPECIALTY";

export type SandboxActivationAuthorityRow = {
  companyId: string;
  /** Display metadata only — not used for activation authority. */
  companyName: string;
  accountingConnectionId: string;
  realmId: string;
  provider: "quickbooks";
  connectionStatus: "connected";
  providerEnvironment: "sandbox";
  demoRole: typeof JE_ACTIVATION_DEMO_ROLE_DEMO_A;
};

export type SandboxAllowlistResolution =
  | "resolved"
  | "unresolved"
  | "ambiguous";

export type ResolvedSandboxActivationAllowlist = {
  /** Exact sandbox Demo A when resolution is `resolved`; otherwise null. */
  demoA: SandboxActivationAuthorityRow | null;
  allowlistResolution: SandboxAllowlistResolution;
  allowedCompanyIds: string[];
  canonicalConnectionByCompanyId: Record<string, string>;
};

type AccountingConnectionRow = {
  id: string;
  provider: string | null;
  status: string | null;
  provider_environment: string | null;
  tenant_or_realm_id: string | null;
  external_entity_id: string | null;
  metadata_json: Record<string, unknown> | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  qbo_realm_id: string | null;
  je_activation_demo_role: string | null;
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

function isExactSandboxDemoAActivationCandidate(args: {
  conn: AccountingConnectionRow;
  company: CompanyRow;
  realmId: string;
  companyId: string;
}): boolean {
  if (String(args.conn.provider || "") !== "quickbooks") return false;
  if (String(args.conn.status || "") !== "connected") return false;
  if (args.conn.provider_environment !== "sandbox") return false;
  if (args.company.je_activation_demo_role !== JE_ACTIVATION_DEMO_ROLE_DEMO_A) {
    return false;
  }
  const companyRealm = String(args.company.qbo_realm_id || "").trim();
  if (companyRealm && companyRealm !== args.realmId) return false;
  return true;
}

export function buildSandboxAllowlistFromRows(args: {
  connections: AccountingConnectionRow[];
  companies: CompanyRow[];
}): ResolvedSandboxActivationAllowlist {
  const companiesById = new Map(args.companies.map((c) => [c.id, c]));
  const exactMatches: SandboxActivationAuthorityRow[] = [];

  for (const conn of args.connections) {
    const realmId = realmFromConnection(conn);
    if (!realmId) continue;
    const companyId = companyIdFromConnection(conn);
    if (!companyId) continue;
    const company = companiesById.get(companyId);
    if (!company) continue;
    if (
      !isExactSandboxDemoAActivationCandidate({
        conn,
        company,
        realmId,
        companyId,
      })
    ) {
      continue;
    }

    exactMatches.push({
      companyId,
      companyName: String(company.name || companyId),
      accountingConnectionId: conn.id,
      realmId,
      provider: "quickbooks",
      connectionStatus: "connected",
      providerEnvironment: "sandbox",
      demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
    });
  }

  if (exactMatches.length === 0) {
    return {
      demoA: null,
      allowlistResolution: "unresolved",
      allowedCompanyIds: [],
      canonicalConnectionByCompanyId: {},
    };
  }

  if (exactMatches.length > 1) {
    return {
      demoA: null,
      allowlistResolution: "ambiguous",
      allowedCompanyIds: [],
      canonicalConnectionByCompanyId: {},
    };
  }

  const demoA = exactMatches[0]!;
  return {
    demoA,
    allowlistResolution: "resolved",
    allowedCompanyIds: [demoA.companyId],
    canonicalConnectionByCompanyId: {
      [demoA.companyId]: demoA.accountingConnectionId,
    },
  };
}

export function createDefaultSandboxAllowlistQueryDeps(): SandboxAllowlistQueryDeps {
  return {
    loadConnections: async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("accounting_connections")
        .select(
          "id, provider, status, provider_environment, tenant_or_realm_id, external_entity_id, metadata_json",
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
        .select("id, name, qbo_realm_id, je_activation_demo_role")
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
  if (args.allowlist.allowlistResolution === "ambiguous") {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.AMBIGUOUS_AUTHORITY,
      "Multiple exact sandbox Demo A authorities resolved; activation blocked.",
    );
  }
  if (
    args.allowlist.allowlistResolution !== "resolved" ||
    !args.allowlist.demoA
  ) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
      "No authoritative sandbox Demo A company/connection could be resolved from database authority.",
    );
  }
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
