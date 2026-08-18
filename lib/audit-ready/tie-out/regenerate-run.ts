import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { resolveFirmClientIdForEngagement } from "./worker";
import { runArResolver } from "./ar-resolver";
import { runApResolver } from "./ap-resolver";
import { runInventoryResolver } from "./inventory-resolver";
import { runGrniResolver } from "./grni-resolver";
import { runBsAccountResolver } from "./bs-account-resolver";
import { runFaRollforwardResolver } from "./fa-rollforward-resolver";
import { runBsSummaryResolver } from "./bs-summary-resolver";
import { fetchQboAccountList } from "./qbo-reports";
import type { BsClassification } from "./sign-normalize";
import type { PolicySnapshot } from "./policy";

function assertResolverOk(result: {
  status: string;
  runId?: string;
  errorMessage?: string;
  errorCode?: string;
}): { newRunId: string } {
  if (result.status === "failed") {
    throw new Error(
      result.errorMessage ?? result.errorCode ?? "resolver_failed",
    );
  }
  if (!result.runId) {
    throw new Error("resolver_missing_run_id");
  }
  return { newRunId: result.runId };
}

/**
 * Re-run a completed tie-out from live QBO, linking the new run via
 * regenerated_from_run_id / trigger_kind='regenerated'.
 */
export async function regenerateRun(
  originalRunId: string,
  actorUserId: string,
): Promise<{ newRunId: string }> {
  const supabase = getSupabaseAdmin();

  const { data: original, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("*")
    .eq("id", originalRunId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!original) throw new Error("run_not_found");

  const { data: eng, error: engErr } = await supabase
    .from("audit_ready_engagements")
    .select(
      "id, firm_client_id, company_id, " +
        "ar_control_qbo_account_id, ap_control_qbo_account_id, " +
        "inventory_control_qbo_account_id, grni_clearing_qbo_account_id",
    )
    .eq("id", original.engagement_id as string)
    .maybeSingle();
  if (engErr) throw new Error(engErr.message);
  if (!eng) throw new Error("engagement_not_found");

  const firmClientId = await resolveFirmClientIdForEngagement({
    firm_client_id: eng.firm_client_id as string | null,
    company_id: eng.company_id as string | null,
  });
  if (!firmClientId) throw new Error("firm_client_not_bound");

  const resolved = await resolveQBOTokenForFirmClient(firmClientId);
  if (!resolved?.accessToken || !resolved.realmId) {
    throw new Error("qbo_not_connected");
  }
  const token = {
    accessToken: resolved.accessToken,
    realmId: resolved.realmId,
  };

  const { data: policy } = await supabase
    .from("audit_ready_tie_out_policies")
    .select(
      "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
    )
    .eq("engagement_id", original.engagement_id as string)
    .maybeSingle();
  if (!policy) throw new Error("no_tolerance_policy");

  const policySnap = policy as PolicySnapshot & { policy_mode: string };
  const asOfDate = original.period_end as string;
  const pbcRequestId = original.pbc_request_id as string;
  const kind = original.tie_out_kind as string;
  const common = {
    engagementId: original.engagement_id as string,
    realmId: token.realmId,
    accessToken: token.accessToken,
    asOfDate,
    policy: policySnap,
    triggeredByUserId: actorUserId,
    triggerReason: "manual" as const,
    regeneratedFromRunId: original.id as string,
    triggerKind: "regenerated" as const,
  };

  switch (kind) {
    case "ar_aging": {
      const arAccountId = eng.ar_control_qbo_account_id as string | null;
      if (!arAccountId) throw new Error("ar_account_id_required");
      return assertResolverOk(
        await runArResolver({
          ...common,
          pbcRequestId,
          arAccountId,
        }),
      );
    }
    case "ap_aging": {
      const apAccountId = eng.ap_control_qbo_account_id as string | null;
      if (!apAccountId) throw new Error("ap_account_id_required");
      return assertResolverOk(
        await runApResolver({
          ...common,
          pbcRequestId,
          apAccountId,
        }),
      );
    }
    case "inventory": {
      const inventoryAccountId = eng.inventory_control_qbo_account_id as
        | string
        | null;
      if (!inventoryAccountId) throw new Error("inventory_account_id_required");
      return assertResolverOk(
        await runInventoryResolver({
          ...common,
          pbcRequestId,
          inventoryAccountId,
        }),
      );
    }
    case "grni": {
      return assertResolverOk(
        await runGrniResolver({
          ...common,
          pbcRequestId,
        }),
      );
    }
    case "fixed_asset_rollforward": {
      return assertResolverOk(
        await runFaRollforwardResolver({
          ...common,
          pbcRequestId,
        }),
      );
    }
    case "bs_recon_summary": {
      return assertResolverOk(await runBsSummaryResolver(common));
    }
    case "bs_account_recon": {
      const accountMeta = await resolveBsAccountMetaForRegenerate(
        original.id as string,
      );
      if (!accountMeta?.qbo_account_id) {
        throw new Error("bs_artifact_not_found");
      }
      const bsAccountId = accountMeta.qbo_account_id;
      let bsAccountName = accountMeta.qbo_account_name || "";
      let accountType = accountMeta.qbo_account_type ?? undefined;
      let accountSubType = accountMeta.qbo_account_subtype ?? undefined;
      let classification: BsClassification | null = null;
      try {
        const accts = await fetchQboAccountList({
          realmId: token.realmId,
          accessToken: token.accessToken,
        });
        const match = accts.find((a) => a.id === bsAccountId);
        if (match) {
          bsAccountName = match.name || bsAccountName;
          accountType = match.accountType ?? accountType;
          accountSubType = match.accountSubType ?? accountSubType;
          const c = (match.classification || "").toLowerCase();
          if (c === "asset") classification = "Asset";
          else if (c === "liability") classification = "Liability";
          else if (c === "equity") classification = "Equity";
        }
      } catch {
        // Fall through — classification required below.
      }
      if (classification === null) {
        throw new Error("bs_classification_unavailable");
      }
      return assertResolverOk(
        await runBsAccountResolver({
          ...common,
          pbcRequestId,
          bsAccountId,
          bsAccountName,
          accountType,
          accountSubType,
          classification,
        }),
      );
    }
    default:
      throw new Error("regenerate_not_supported");
  }
}

type BsAccountRegenMeta = {
  qbo_account_id: string;
  qbo_account_name: string;
  qbo_account_type: string | null;
  qbo_account_subtype: string | null;
};

/**
 * Prefer totals variance row (canonical run stack) for account identity.
 * Fall back to legacy bs_recon_artifacts when variances lack entity_qbo_id.
 */
async function resolveBsAccountMetaForRegenerate(
  runId: string,
): Promise<BsAccountRegenMeta | null> {
  const supabase = getSupabaseAdmin();
  const { data: totalsVar } = await supabase
    .from("audit_ready_tie_out_variances")
    .select("entity_qbo_id, entity_display_name")
    .eq("run_id", runId)
    .eq("entity_kind", "totals")
    .maybeSingle();

  if (totalsVar?.entity_qbo_id) {
    return {
      qbo_account_id: totalsVar.entity_qbo_id as string,
      qbo_account_name: (totalsVar.entity_display_name as string) || "",
      qbo_account_type: null,
      qbo_account_subtype: null,
    };
  }

  // PBC-TIEOUT-4.1.3.b removes this fallback
  return resolveBsAccountMetaFromLegacyArtifact(runId);
}

// PBC-TIEOUT-4.1.3.b removes this function entirely
async function resolveBsAccountMetaFromLegacyArtifact(
  runId: string,
): Promise<BsAccountRegenMeta | null> {
  const supabase = getSupabaseAdmin();
  const { data: artifact } = await supabase
    .from("audit_ready_bs_recon_artifacts")
    .select(
      "qbo_account_id, qbo_account_name, qbo_account_type, qbo_account_subtype",
    )
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!artifact?.qbo_account_id) return null;
  return {
    qbo_account_id: artifact.qbo_account_id as string,
    qbo_account_name: (artifact.qbo_account_name as string) || "",
    qbo_account_type: (artifact.qbo_account_type as string | null) ?? null,
    qbo_account_subtype:
      (artifact.qbo_account_subtype as string | null) ?? null,
  };
}
