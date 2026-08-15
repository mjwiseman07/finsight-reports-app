/**
 * Sanctioned post-merge ops helper: promote an already-authorized legacy QBO
 * grant into accounting_connections against the EXISTING firm-client company.
 *
 * Firm-client / company anchored — never calls resolveOrCreateCompanyForProvider.
 * --dryRun (default) performs ZERO writes.
 *
 * Usage:
 *   npx tsx scripts/ops/promote-qbo-legacy-grant-to-canonical.ts \
 *     --legacyConnectionId=e53c49f0-9686-44eb-b0ea-040ceedd02e4 \
 *     --expectedRealmId=9341454381415870 \
 *     --firmClientId=c93b36e2-7f55-4581-a2b2-b43143763890 \
 *     --dryRun
 *
 *   npx tsx scripts/ops/promote-qbo-legacy-grant-to-canonical.ts \
 *     --legacyConnectionId=e53c49f0-9686-44eb-b0ea-040ceedd02e4 \
 *     --expectedRealmId=9341454381415870 \
 *     --firmClientId=c93b36e2-7f55-4581-a2b2-b43143763890 \
 *     --execute
 */
import { createClient } from "@supabase/supabase-js";
import { executePromoteLegacyQboGrant } from "../../lib/integrations/quickbooks/promote-legacy-grant-execute";

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
  const firmClientId = arg("firmClientId");
  const explicitCompanyId = arg("companyId");
  const dryRun = hasFlag("dryRun") || !hasFlag("execute");

  if (!legacyConnectionId || !expectedRealmId || !firmClientId) {
    throw new Error(
      "Required: --legacyConnectionId=<uuid> --expectedRealmId=<realm> --firmClientId=<uuid> [--companyId=<uuid>] [--dryRun|--execute]",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env");

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const result = await executePromoteLegacyQboGrant({
    admin,
    legacyConnectionId,
    expectedRealmId,
    firmClientId,
    explicitCompanyId,
    dryRun,
  });

  // Never print tokens.
  const safe = {
    ok: result.ok,
    dryRun: result.dryRun,
    mutations: result.mutations,
    plan: result.plan.ok
      ? {
          companyBind: result.plan.companyBind,
          companyId: result.plan.companyId,
          firmClientId: result.plan.firmClientId,
          ownerUserId: result.plan.ownerUserId,
          expectedRealmId: result.plan.expectedRealmId,
          legacyConnectionId: result.plan.legacy.id,
          legacyTable: result.plan.legacy.legacyTable,
          legacyRealmId: result.plan.legacy.realmId,
          notes: result.plan.notes,
        }
      : {
          code: result.plan.code,
          message: result.plan.message,
        },
    ...(result.ok && !result.dryRun
      ? {
          accountingConnectionId: result.accountingConnectionId,
          grantOutcome: result.grantOutcome,
        }
      : {}),
    ...(!result.ok ? { error: result.error } : {}),
  };

  console.log(JSON.stringify(safe, null, 2));

  if (!result.ok) {
    process.exit(1);
  }

  if (result.dryRun) {
    console.log("Dry run only — zero mutations performed. Pass --execute to apply.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
