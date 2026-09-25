/* eslint-disable no-console */
/**
 * JE-3D Phase A1 — Governed read-only COA mirror bootstrap for Demo A.
 *
 * Uses canonical accounting_connection token + QBO Account GET (read only)
 * and persists through the existing qbo_coa_mirror upsert path.
 *
 * NO Journal Entry. NO proposal. NO execution. NO provider attempt. NO POST.
 *
 * Usage:
 *   QB_ENVIRONMENT=sandbox npx tsx scripts/je3d/sync-demo-a-coa-mirror-readonly.ts
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { persistCoaMirrorRows } from "../../lib/ap-intake/baseline-harvest/coa-mirror-persist";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveQBOTokenForAccountingConnection } from "@/lib/erp/quickbooks/token-resolver";
import { fetchCoaAccountsFromQboToken } from "@/lib/pulse-je/coa-cache";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  isVerifiedDemoAIdentityMatch,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import { resolveSandboxActivationAllowlist } from "../../lib/journal-entry-governance/je3d-sandbox-company-authority";
import { assertJe3dSandboxQboEnvironment } from "../../lib/journal-entry-governance/je3d-sandbox-environment";
import type { HarvestedCoaRow } from "../../lib/ap-intake/baseline-harvest/types";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env");
loadEnv(".env.local");

type Output = {
  ok: boolean;
  phase: "A1";
  qbo_get_performed: boolean;
  qbo_post_performed: false;
  journal_entry_created: false;
  provider_attempt_created: false;
  je_execution_mutated: false;
  memory_write: false;
  worker: false;
  governed_auto: false;
  verify_sandbox_je: false;
  firm_client_id: string;
  company_id: string;
  canonical_connection_id: string;
  realm_id: string;
  sync_run_id: string | null;
  mirrored_account_count: number;
  refreshed_at: string | null;
  authority_match: boolean;
  stop_reasons: Array<{ code: string; message: string }>;
};

async function main() {
  const output: Output = {
    ok: false,
    phase: "A1",
    qbo_get_performed: false,
    qbo_post_performed: false,
    journal_entry_created: false,
    provider_attempt_created: false,
    je_execution_mutated: false,
    memory_write: false,
    worker: false,
    governed_auto: false,
    verify_sandbox_je: false,
    firm_client_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
    company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    canonical_connection_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    sync_run_id: null,
    mirrored_account_count: 0,
    refreshed_at: null,
    authority_match: false,
    stop_reasons: [],
  };

  try {
    process.env.QB_ENVIRONMENT = "sandbox";
    assertJe3dSandboxQboEnvironment();

    const allowlist = await resolveSandboxActivationAllowlist();
    if (allowlist.allowlistResolution !== "resolved" || !allowlist.demoA) {
      output.stop_reasons.push({
        code: "sandbox_allowlist_unresolved",
        message: "Demo A sandbox activation allowlist did not resolve.",
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    output.authority_match = isVerifiedDemoAIdentityMatch({
      companyId: allowlist.demoA.companyId,
      accountingConnectionId: allowlist.demoA.accountingConnectionId,
      realmId: allowlist.demoA.realmId,
      providerEnvironment: allowlist.demoA.providerEnvironment,
      demoRole: allowlist.demoA.demoRole,
    });
    if (!output.authority_match) {
      output.stop_reasons.push({
        code: "identity_mismatch",
        message: "Resolved allowlist does not match verified Demo A identity evidence.",
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    if (
      allowlist.demoA.accountingConnectionId !==
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId
    ) {
      output.stop_reasons.push({
        code: "canonical_connection_mismatch",
        message: "Resolved canonical connection does not match verified Demo A connection.",
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    const token = await resolveQBOTokenForAccountingConnection(
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    );
    if (!token?.accessToken || !token.realmId) {
      output.stop_reasons.push({
        code: "canonical_connection_token_unavailable",
        message: "Canonical accounting connection token is unavailable.",
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }
    if (token.realmId !== JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId) {
      output.stop_reasons.push({
        code: "realm_mismatch",
        message: `Token realm ${token.realmId} does not match verified realm ${JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId}.`,
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    const accounts = await fetchCoaAccountsFromQboToken({
      accessToken: token.accessToken,
      realmId: token.realmId,
      ownerUserId: token.ownerUserId,
    });
    output.qbo_get_performed = true;

    const harvested: HarvestedCoaRow[] = accounts.map((account) => ({
      externalAccountId: account.qbo_id,
      accountNumber: null,
      accountName: account.name || account.fully_qualified_name,
      accountType: account.account_type || null,
      accountSubtype: account.account_sub_type || null,
      active: account.active,
    }));

    const supabase = createServiceClient();
    const syncRunId = randomUUID();
    const refreshedAt = new Date().toISOString();
    const { error: runError } = await supabase.from("baseline_harvest_runs").insert({
      id: syncRunId,
      firm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmId,
      firm_client_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
      source: "qbo",
      status: "completed",
      actor_id: token.ownerUserId,
      counts: { chart_of_accounts: harvested.length },
      completed_at: refreshedAt,
    });
    if (runError) {
      throw new Error(`baseline_harvest_runs insert failed: ${runError.message}`);
    }

    const mirroredCount = await persistCoaMirrorRows({
      firmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmId,
      firmClientId: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
      runId: syncRunId,
      rows: harvested,
    });

    output.ok = true;
    output.sync_run_id = syncRunId;
    output.mirrored_account_count = mirroredCount;
    output.refreshed_at = refreshedAt;
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    output.stop_reasons.push({
      code: "sync_failed",
      message: err instanceof Error ? err.message : String(err),
    });
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }
}

void main();
