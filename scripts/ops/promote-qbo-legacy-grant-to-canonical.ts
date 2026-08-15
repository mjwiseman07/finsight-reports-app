/**
 * Sanctioned post-merge ops helper: promote an already-authorized legacy QBO
 * grant (quickbooks_connections / erp_connections) into accounting_connections
 * via persistCanonicalAccountingConnectionGrant — without printing tokens.
 *
 * DO NOT run against production unless ChatGPT/ops explicitly authorizes the
 * connection id + realm. This script does not start Intuit OAuth.
 *
 * Usage:
 *   npx tsx scripts/ops/promote-qbo-legacy-grant-to-canonical.ts \
 *     --legacyConnectionId=e53c49f0-9686-44eb-b0ea-040ceedd02e4 \
 *     --expectedRealmId=9341454381415870 \
 *     --dryRun
 */
import { createClient } from "@supabase/supabase-js";
import { persistCanonicalAccountingConnectionGrant } from "../../lib/integrations/accounting/persist-canonical-connection-grant";
import { resolveOrCreateCompanyForProvider } from "../../lib/integrations/accounting/resolve-or-create-company";

function arg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const legacyConnectionId = arg("legacyConnectionId");
  const expectedRealmId = arg("expectedRealmId");
  const dryRun = hasFlag("dryRun") || !hasFlag("execute");

  if (!legacyConnectionId || !expectedRealmId) {
    throw new Error(
      "Required: --legacyConnectionId=<uuid> --expectedRealmId=<realm> [--dryRun|--execute]",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env");

  const admin = createClient(url, key, { auth: { persistSession: false } });

  type LegacyRow = {
    id: string;
    user_id: string;
    realm_id: string;
    access_token: string;
    refresh_token: string;
    token_expiry: string | null;
  };

  let legacy: LegacyRow | null = null;
  let legacyTable: "quickbooks_connections" | "erp_connections" = "quickbooks_connections";

  for (const table of ["quickbooks_connections", "erp_connections"] as const) {
    const { data, error } = await admin
      .from(table)
      .select("id, user_id, realm_id, access_token, refresh_token, token_expiry")
      .eq("id", legacyConnectionId)
      .maybeSingle();
    if (error && error.code !== "PGRST205" && error.code !== "42P01") throw error;
    if (data) {
      legacy = data as LegacyRow;
      legacyTable = table;
      break;
    }
  }

  if (!legacy) throw new Error(`Legacy connection ${legacyConnectionId} not found`);
  if (legacy.realm_id !== expectedRealmId) {
    throw new Error(
      `Realm mismatch: legacy=${legacy.realm_id} expected=${expectedRealmId}`,
    );
  }

  const companyId = await resolveOrCreateCompanyForProvider(admin, {
    provider: "quickbooks",
    tenantId: legacy.realm_id,
    userId: legacy.user_id,
    tenantName: null,
  });

  const summary = {
    dryRun,
    legacyTable,
    legacyConnectionId: legacy.id,
    userId: legacy.user_id,
    realmId: legacy.realm_id,
    companyId,
    hasAccessToken: Boolean(legacy.access_token),
    hasRefreshToken: Boolean(legacy.refresh_token),
    tokenExpiry: legacy.token_expiry,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log("Dry run only — pass --execute to persist canonical grant.");
    return;
  }

  const nowIso = new Date().toISOString();
  const persisted = await persistCanonicalAccountingConnectionGrant({
    admin,
    userId: legacy.user_id,
    provider: "quickbooks",
    providerFamily: "intuit",
    providerProduct: "quickbooks_online",
    externalEntityId: `qbo:${legacy.realm_id}`,
    externalEntityName: "QuickBooks Company",
    accessToken: legacy.access_token,
    refreshToken: legacy.refresh_token,
    tokenExpiresAt: legacy.token_expiry,
    tenantOrRealmId: legacy.realm_id,
    scopes: ["com.intuit.quickbooks.accounting"],
    status: "connected",
    companyId,
    nowIso,
    metadataPatch: {
      realm_id: legacy.realm_id,
      source_system: "quickbooks",
      active_provider: "quickbooks",
      oauth_mode: "ops_legacy_promote",
      promoted_from_legacy_table: legacyTable,
      promoted_from_legacy_connection_id: legacy.id,
      connected_at: nowIso,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        accountingConnectionId: persisted.connectionId,
        outcome: persisted.outcome,
        realmId: legacy.realm_id,
        companyId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
