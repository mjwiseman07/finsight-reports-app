/**
 * Block E harness smoke — primary write + regenerate lineage + worker BS summary.
 * Usage: npx tsx --env-file=.env.local scripts/smoke/tieout4e-regenerate-smoke.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveFirmClientIdForEngagement } from "@/lib/audit-ready/tie-out/worker";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { fetchQboAccountList } from "@/lib/audit-ready/tie-out/qbo-reports";
import { runBsAccountResolver } from "@/lib/audit-ready/tie-out/bs-account-resolver";
import { regenerateRun } from "@/lib/audit-ready/tie-out/regenerate-run";
import { runTieOut } from "@/lib/audit-ready/tie-out/worker";
import type { BsClassification } from "@/lib/audit-ready/tie-out/sign-normalize";
import { resolvePersistedAuthoritativeAccountingSyncId } from "@/lib/audit-ready/tie-out/baseline-sync-custody";

const ENG = "724546e9-6deb-4f7f-b8ad-88e5ee65353d";
const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const AS_OF = "2026-06-30";
const BS_PBC = "6cf36345-645a-42d9-be8e-a69675f3179c";
const CHECKING_ID = "35";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select("id, company_id, firm_id, firm_client_id")
    .eq("id", ENG)
    .single();
  if (!eng) throw new Error("engagement_not_found");

  const firmClientId = await resolveFirmClientIdForEngagement({
    firm_client_id: eng.firm_client_id as string | null,
    company_id: eng.company_id as string | null,
  });
  if (!firmClientId) throw new Error("no_firm_client");

  const token = await resolveQBOTokenForFirmClient(firmClientId);
  if (!token?.accessToken || !token.realmId) throw new Error("qbo_not_connected");

  const { data: policy } = await supabase
    .from("audit_ready_tie_out_policies")
    .select(
      "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
    )
    .eq("engagement_id", ENG)
    .maybeSingle();
  if (!policy) throw new Error("no_policy");

  const accts = await fetchQboAccountList({
    realmId: token.realmId,
    accessToken: token.accessToken,
  });
  const checking = accts.find((a) => a.id === CHECKING_ID);
  if (!checking) throw new Error("checking_not_found");
  const c = (checking.classification || "").toLowerCase();
  let classification: BsClassification | null = null;
  if (c === "asset") classification = "Asset";
  else if (c === "liability") classification = "Liability";
  else if (c === "equity") classification = "Equity";
  if (!classification) throw new Error("classification_unavailable");

  console.log("=== 1. Fresh BS account run (trigger_kind=initial) ===");
  const syncCustody = await resolvePersistedAuthoritativeAccountingSyncId({
    userId: USER,
    companyId: eng.company_id as string | null,
    tenantOrRealmId: token.realmId,
    sourceSystem: "quickbooks",
  });
  if (!syncCustody.ok) throw new Error(syncCustody.code);
  const bs = await runBsAccountResolver({
    engagementId: ENG,
    pbcRequestId: BS_PBC,
    realmId: token.realmId,
    accessToken: token.accessToken,
    bsAccountId: CHECKING_ID,
    bsAccountName: checking.name,
    accountType: checking.accountType,
    accountSubType: checking.accountSubType ?? undefined,
    classification,
    asOfDate: AS_OF,
    policy: policy as any,
    triggeredByUserId: USER,
    triggerReason: "manual",
    baselineSyncId: syncCustody.accountingSyncId,
  });
  console.log(JSON.stringify(bs));
  if (bs.status !== "completed") throw new Error("bs_run_failed");

  const { data: origRun } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, trigger_kind, regenerated_from_run_id")
    .eq("id", bs.runId)
    .single();
  console.log("orig lineage", origRun);
  if (origRun?.trigger_kind !== "initial") throw new Error("expected_initial");
  if (origRun?.regenerated_from_run_id != null) throw new Error("expected_null_parent");

  const { data: arts1 } = await supabase
    .from("audit_ready_run_artifacts")
    .select("artifact_kind")
    .eq("tie_out_run_id", bs.runId);
  const kinds1 = new Set((arts1 ?? []).map((a) => a.artifact_kind));
  if (!kinds1.has("xlsx") || !kinds1.has("pdf")) throw new Error("missing_artifacts_initial");
  console.log("artifacts initial OK", [...kinds1]);

  console.log("=== 2. regenerateRun ===");
  const { newRunId } = await regenerateRun(bs.runId, USER);
  console.log("newRunId", newRunId);

  const { data: newRun } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, trigger_kind, regenerated_from_run_id, status")
    .eq("id", newRunId)
    .single();
  console.log("new lineage", newRun);
  if (newRun?.trigger_kind !== "regenerated") throw new Error("expected_regenerated");
  if (newRun?.regenerated_from_run_id !== bs.runId) throw new Error("parent_mismatch");
  if (newRun?.status !== "completed") throw new Error("regen_not_completed");

  const { data: arts2 } = await supabase
    .from("audit_ready_run_artifacts")
    .select("artifact_kind, storage_path")
    .eq("tie_out_run_id", newRunId);
  const kinds2 = new Set((arts2 ?? []).map((a) => a.artifact_kind));
  if (!kinds2.has("xlsx") || !kinds2.has("pdf")) throw new Error("missing_artifacts_regen");

  console.log("=== 3. Cover lineage in regenerated XLSX ===");
  const xlsxArt = (arts2 ?? []).find((a) => a.artifact_kind === "xlsx");
  if (!xlsxArt) throw new Error("no_xlsx");
  const { data: signed } = await supabase.storage
    .from("audit-ready-workpapers")
    .createSignedUrl(xlsxArt.storage_path as string, 600);
  if (!signed?.signedUrl) throw new Error("signed_url_failed");
  const buf = Buffer.from(await (await fetch(signed.signedUrl)).arrayBuffer());
  const outDir = resolve(process.cwd(), ".tmp-4e-smoke-artifacts");
  mkdirSync(outDir, { recursive: true });
  const xlsxPath = resolve(outDir, "regen.xlsx");
  writeFileSync(xlsxPath, buf);
  const wb = XLSX.read(buf, { type: "buffer" });
  const cover = XLSX.utils.sheet_to_json(wb.Sheets["Cover"], {
    header: 1,
    blankrows: false,
  }) as unknown[][];
  const lineageRow = cover.find(
    (r) => Array.isArray(r) && String(r[0]).toLowerCase().includes("regenerated"),
  );
  console.log("lineage row", lineageRow);
  if (!lineageRow) throw new Error("cover_missing_regenerated_from");

  console.log("=== 4. worker.runTieOut bs_recon_summary ===");
  // Find or use sentinel PBC for summary
  const { data: summaryPbc } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id")
    .eq("engagement_id", ENG)
    .eq("tie_out_kind", "bs_recon_summary")
    .limit(1)
    .maybeSingle();
  if (!summaryPbc?.id) {
    console.log("SKIP worker summary — no bs_recon_summary PBC on engagement");
  } else {
    const out = await runTieOut({
      engagementId: ENG,
      pbcRequestId: summaryPbc.id as string,
      asOfDate: AS_OF,
      triggeredByUserId: USER,
      triggerReason: "manual",
    });
    console.log(JSON.stringify(out));
    if (!out.ok) throw new Error(`worker_summary_failed: ${out.reason}`);
    if (out.code === "resolver_pending") throw new Error("still_pending");
  }

  console.log("DONE");
}

main().catch((e) => {
  console.error("SMOKE_FAILED", e instanceof Error ? e.message : e);
  process.exit(1);
});
