/**
 * Execute a firm-client-anchored legacy→canonical QBO grant promotion.
 * Dry-run performs ZERO mutations.
 *
 * Intentionally does NOT import the provider company resolver that can insert
 * a new companies row. Repair authority is the existing firm_client.company_id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistCanonicalAccountingConnectionGrant } from "@/lib/integrations/accounting/persist-canonical-connection-grant";
import {
  planPromoteLegacyQboGrant,
  type LegacyQboGrantRef,
  type PromoteLegacyGrantPlan,
  type PromoteLegacyGrantPlanOk,
} from "@/lib/integrations/quickbooks/promote-legacy-grant-plan";

export type PromoteLegacyGrantExecuteResult =
  | {
      ok: true;
      dryRun: true;
      plan: PromoteLegacyGrantPlanOk;
      mutations: [];
    }
  | {
      ok: true;
      dryRun: false;
      plan: PromoteLegacyGrantPlanOk;
      mutations: Array<"bind_company_realm" | "persist_canonical_grant">;
      accountingConnectionId: string;
      grantOutcome: string;
    }
  | {
      ok: false;
      dryRun: boolean;
      plan: PromoteLegacyGrantPlan;
      mutations: Array<"bind_company_realm" | "persist_canonical_grant">;
      error: string;
    };

export type LoadedPromoteContext = {
  legacy: LegacyQboGrantRef & {
    accessToken: string;
    refreshToken: string;
  };
  firmClient: { id: string; ownerUserId: string; companyId: string } | null;
  company: { id: string; qboRealmId: string | null; name?: string | null } | null;
  otherCompanyOwningRealm: { id: string; name?: string | null } | null;
};

function asErrorRecord(error: unknown): { code?: string; message?: string } {
  if (!error || typeof error !== "object") return {};
  return error as { code?: string; message?: string };
}

function isUniqueViolation(error: unknown): boolean {
  const { code, message } = asErrorRecord(error);
  if (code === "23505") return true;
  return /duplicate key|unique constraint/i.test(String(message || ""));
}

/**
 * Compare-and-set bind of companies.qbo_realm_id.
 * Proves the postcondition before returning. Zero-row updates are re-read:
 *   expected realm → idempotent success
 *   still null → fail
 *   other realm → fail closed
 * Unique violation → fail (grant must not proceed).
 */
export async function bindExistingCompanyRealmVerified(args: {
  admin: SupabaseClient;
  companyId: string;
  expectedRealmId: string;
  nowIso: string;
}): Promise<void> {
  const { admin, companyId, expectedRealmId, nowIso } = args;

  const { data, error } = await admin
    .from("companies")
    .update({
      qbo_realm_id: expectedRealmId,
      updated_at: nowIso,
    })
    .eq("id", companyId)
    .is("qbo_realm_id", null)
    .select("id, qbo_realm_id");

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        `Realm bind unique violation for company ${companyId} / realm ${expectedRealmId}: ${error.message}`,
      );
    }
    throw new Error(`Failed to bind company realm: ${error.message}`);
  }

  const updatedRealm = data?.[0]?.qbo_realm_id ? String(data[0].qbo_realm_id) : "";
  if (updatedRealm === expectedRealmId) {
    return;
  }

  // Zero-row update is not an error — re-read and classify.
  const { data: current, error: readErr } = await admin
    .from("companies")
    .select("id, qbo_realm_id")
    .eq("id", companyId)
    .maybeSingle();
  if (readErr) {
    throw new Error(`Failed to re-read company after realm bind: ${readErr.message}`);
  }
  if (!current) {
    throw new Error(`Company ${companyId} missing after realm bind attempt`);
  }

  const currentRealm = current.qbo_realm_id ? String(current.qbo_realm_id).trim() : "";
  if (currentRealm === expectedRealmId) {
    // Concurrent writer already bound the same realm — safe/idempotent.
    return;
  }
  if (!currentRealm) {
    throw new Error(
      `Company ${companyId} realm bind affected zero rows and qbo_realm_id is still null`,
    );
  }
  throw new Error(
    `Company ${companyId} realm bind affected zero rows; current realm ${currentRealm} conflicts with expected ${expectedRealmId}`,
  );
}

export async function loadPromoteLegacyGrantContext(args: {
  admin: SupabaseClient;
  legacyConnectionId: string;
  expectedRealmId: string;
  firmClientId: string;
  explicitCompanyId?: string | null;
}): Promise<LoadedPromoteContext> {
  const { admin, legacyConnectionId, expectedRealmId, firmClientId } = args;

  type LegacyRow = {
    id: string;
    user_id: string;
    realm_id: string;
    access_token: string | null;
    refresh_token: string | null;
    token_expiry: string | null;
  };

  let legacyRow: LegacyRow | null = null;
  let legacyTable: LegacyQboGrantRef["legacyTable"] = "quickbooks_connections";

  for (const table of ["quickbooks_connections", "erp_connections"] as const) {
    const { data, error } = await admin
      .from(table)
      .select("id, user_id, realm_id, access_token, refresh_token, token_expiry")
      .eq("id", legacyConnectionId)
      .maybeSingle();
    if (error && error.code !== "PGRST205" && error.code !== "42P01") throw error;
    if (data) {
      legacyRow = data as LegacyRow;
      legacyTable = table;
      break;
    }
  }

  if (!legacyRow) {
    throw new Error(`Legacy connection ${legacyConnectionId} not found`);
  }

  const { data: firmClient, error: fcErr } = await admin
    .from("firm_clients")
    .select("id, owner_user_id, company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (fcErr) throw new Error(`firm_clients lookup failed: ${fcErr.message}`);

  const companyId = (firmClient?.company_id as string | null) || null;
  let company: LoadedPromoteContext["company"] = null;
  if (companyId) {
    const { data: co, error: coErr } = await admin
      .from("companies")
      .select("id, qbo_realm_id, name")
      .eq("id", companyId)
      .maybeSingle();
    if (coErr) throw new Error(`companies lookup failed: ${coErr.message}`);
    if (co) {
      company = {
        id: String(co.id),
        qboRealmId: (co.qbo_realm_id as string | null) || null,
        name: (co.name as string | null) || null,
      };
    }
  }

  const { data: realmOwners, error: realmErr } = await admin
    .from("companies")
    .select("id, name, qbo_realm_id")
    .eq("qbo_realm_id", expectedRealmId)
    .limit(5);
  if (realmErr) throw new Error(`companies realm ownership lookup failed: ${realmErr.message}`);

  const otherCompanyOwningRealm =
    (realmOwners || [])
      .map((row) => ({
        id: String(row.id),
        name: (row.name as string | null) || null,
      }))
      .find((row) => !companyId || row.id !== companyId) || null;

  return {
    legacy: {
      id: legacyRow.id,
      userId: legacyRow.user_id,
      realmId: legacyRow.realm_id,
      legacyTable,
      hasAccessToken: Boolean(legacyRow.access_token),
      hasRefreshToken: Boolean(legacyRow.refresh_token),
      tokenExpiry: legacyRow.token_expiry,
      accessToken: legacyRow.access_token || "",
      refreshToken: legacyRow.refresh_token || "",
    },
    firmClient: firmClient
      ? {
          id: String(firmClient.id),
          ownerUserId: String(firmClient.owner_user_id || ""),
          companyId: String(firmClient.company_id || ""),
        }
      : null,
    company,
    otherCompanyOwningRealm,
  };
}

export async function executePromoteLegacyQboGrant(args: {
  admin: SupabaseClient;
  expectedRealmId: string;
  firmClientId: string;
  legacyConnectionId: string;
  explicitCompanyId?: string | null;
  dryRun: boolean;
  nowIso?: string;
  /** Injected for tests — defaults to persistCanonicalAccountingConnectionGrant. */
  persistGrant?: typeof persistCanonicalAccountingConnectionGrant;
  /** Injected for tests — replaces verified CAS bind. */
  bindCompanyRealm?: (companyId: string, realmId: string) => Promise<void>;
  /** Injected for tests — skip DB load. */
  context?: LoadedPromoteContext;
}): Promise<PromoteLegacyGrantExecuteResult> {
  const persistGrant = args.persistGrant || persistCanonicalAccountingConnectionGrant;
  const context =
    args.context ||
    (await loadPromoteLegacyGrantContext({
      admin: args.admin,
      legacyConnectionId: args.legacyConnectionId,
      expectedRealmId: args.expectedRealmId,
      firmClientId: args.firmClientId,
      explicitCompanyId: args.explicitCompanyId,
    }));

  const plan = planPromoteLegacyQboGrant({
    expectedRealmId: args.expectedRealmId,
    legacy: context.legacy,
    firmClient: context.firmClient,
    company: context.company,
    otherCompanyOwningRealm: context.otherCompanyOwningRealm,
    explicitCompanyId: args.explicitCompanyId,
  });

  if (!plan.ok) {
    return {
      ok: false,
      dryRun: args.dryRun,
      plan,
      mutations: [],
      error: plan.message,
    };
  }

  if (args.dryRun) {
    return {
      ok: true,
      dryRun: true,
      plan,
      mutations: [],
    };
  }

  const mutations: Array<"bind_company_realm" | "persist_canonical_grant"> = [];
  const nowIso = args.nowIso || new Date().toISOString();

  try {
    if (plan.companyBind === "bind_existing_company") {
      // Do not record bind mutation until postcondition is proven.
      if (args.bindCompanyRealm) {
        await args.bindCompanyRealm(plan.companyId, plan.expectedRealmId);
      } else {
        await bindExistingCompanyRealmVerified({
          admin: args.admin,
          companyId: plan.companyId,
          expectedRealmId: plan.expectedRealmId,
          nowIso,
        });
      }
      mutations.push("bind_company_realm");
    }

    // Canonical grant only after company/realm postcondition is proven (or already bound).
    const persisted = await persistGrant({
      admin: args.admin,
      userId: plan.ownerUserId,
      provider: "quickbooks",
      providerFamily: "intuit",
      providerProduct: "quickbooks_online",
      externalEntityId: `qbo:${plan.expectedRealmId}`,
      externalEntityName: context.company?.name || "QuickBooks Company",
      accessToken: context.legacy.accessToken,
      refreshToken: context.legacy.refreshToken,
      tokenExpiresAt: context.legacy.tokenExpiry,
      tenantOrRealmId: plan.expectedRealmId,
      scopes: ["com.intuit.quickbooks.accounting"],
      status: "connected",
      companyId: plan.companyId,
      nowIso,
      metadataPatch: {
        realm_id: plan.expectedRealmId,
        company_id: plan.companyId,
        source_system: "quickbooks",
        active_provider: "quickbooks",
        oauth_mode: "ops_legacy_promote",
        firm_client_id: plan.firmClientId,
        promoted_from_legacy_table: context.legacy.legacyTable,
        promoted_from_legacy_connection_id: context.legacy.id,
        connected_at: nowIso,
      },
    });
    mutations.push("persist_canonical_grant");

    return {
      ok: true,
      dryRun: false,
      plan,
      mutations,
      accountingConnectionId: persisted.connectionId,
      grantOutcome: persisted.outcome,
    };
  } catch (err) {
    return {
      ok: false,
      dryRun: false,
      plan,
      mutations,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
