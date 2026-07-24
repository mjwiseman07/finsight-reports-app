import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { runArResolver } from "./ar-resolver";
import { runApResolver } from "./ap-resolver";
import { runInventoryResolver } from "./inventory-resolver";
import { runGrniResolver } from "./grni-resolver";
import { runBsAccountResolver } from "./bs-account-resolver";
import type { BsClassification } from "./sign-normalize";
import { runFaRollforwardResolver } from "./fa-rollforward-resolver";
import { fetchQboAccountList } from "./qbo-reports";
import type { PolicySnapshot } from "./policy";

export type RunTieOutInput = {
  engagementId: string;
  pbcRequestId: string;
  asOfDate: string;
  arAccountId?: string;
  apAccountId?: string;
  inventoryAccountId?: string;
  grniClearingAccountId?: string;
  bsAccountId?: string; // PBC-TIEOUT-4B.1
  activityStartDate?: string; // PBC-TIEOUT-4B.1
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
};

export type RunTieOutOutcome =
  | {
      ok: true;
      kind: string;
      runId: string;
      totalsStatus: string;
      itemCount: number;
    }
  | { ok: false; reason: string; code: string };

/**
 * Company-scoped engagements have firm_client_id NULL by schema
 * (audit_ready_engagements CHECK). Resolve via firm_clients.company_id —
 * same pattern as lib/pulse-je/resolve-context.ts.
 */
export async function resolveFirmClientIdForEngagement(eng: {
  firm_client_id: string | null;
  company_id: string | null;
}): Promise<string | null> {
  if (eng.firm_client_id) return eng.firm_client_id;
  if (!eng.company_id) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("firm_clients")
    .select("id")
    .eq("company_id", eng.company_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) || null;
}

export async function runTieOut(
  input: RunTieOutInput,
): Promise<RunTieOutOutcome> {
  const supabase = getSupabaseAdmin();
  // 1. Load PBC + engagement + policy
  const { data: pbc } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id, engagement_id, tie_out_kind, source_account_hint")
    .eq("id", input.pbcRequestId)
    .maybeSingle();
  if (!pbc) return { ok: false, reason: "pbc_not_found", code: "pbc_not_found" };
  if (pbc.engagement_id !== input.engagementId) {
    return {
      ok: false,
      reason: "engagement_mismatch",
      code: "engagement_mismatch",
    };
  }
  if (!pbc.tie_out_kind) {
    return {
      ok: false,
      reason: "pbc_not_yet_classified",
      code: "not_classified",
    };
  }
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select(
      "id, company_id, firm_id, firm_client_id, " +
        "ar_control_qbo_account_id, ap_control_qbo_account_id, " +
        "inventory_control_qbo_account_id, grni_clearing_qbo_account_id",
    )
    .eq("id", input.engagementId)
    .maybeSingle();
  if (!eng) {
    return {
      ok: false,
      reason: "engagement_not_found",
      code: "engagement_not_found",
    };
  }
  const firmClientId = await resolveFirmClientIdForEngagement({
    firm_client_id: eng.firm_client_id as string | null,
    company_id: eng.company_id as string | null,
  });
  if (!firmClientId) {
    return {
      ok: false,
      reason: "firm_client_not_bound",
      code: "no_firm_client",
    };
  }
  const { data: policy } = await supabase
    .from("audit_ready_tie_out_policies")
    .select(
      "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
    )
    .eq("engagement_id", input.engagementId)
    .maybeSingle();
  if (!policy) {
    return { ok: false, reason: "no_tolerance_policy", code: "no_policy" };
  }
  // 2. Resolve QBO token
  let token: { accessToken: string; realmId: string };
  try {
    const resolved = await resolveQBOTokenForFirmClient(firmClientId);
    if (!resolved?.accessToken || !resolved.realmId) {
      return {
        ok: false,
        reason: "qbo_not_connected",
        code: "qbo_not_connected",
      };
    }
    token = { accessToken: resolved.accessToken, realmId: resolved.realmId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return {
      ok: false,
      reason: `qbo_token_error: ${msg}`,
      code: "qbo_token_error",
    };
  }
  // 3. Dispatch by kind
  switch (pbc.tie_out_kind) {
    case "ar_aging": {
      const arAccountId =
        input.arAccountId ?? (pbc.source_account_hint as string) ?? null;
      if (!arAccountId) {
        return {
          ok: false,
          reason: "ar_account_id_required",
          code: "ar_account_id_required",
        };
      }
      const result = await runArResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        arAccountId,
        asOfDate: input.asOfDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "ar_aging",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "bs_account_recon": {
      const bsAccountId =
        input.bsAccountId ?? (pbc.source_account_hint as string) ?? null;
      if (!bsAccountId) {
        return {
          ok: false,
          reason: "bs_account_id_required",
          code: "bs_account_id_required",
        };
      }
      // Pre-fetch AccountList so the artifact row carries account metadata.
      let bsAccountName = "";
      let accountType: string | undefined;
      let accountSubType: string | undefined;
      let classification: BsClassification | null = null;
      try {
        const accts = await fetchQboAccountList({
          realmId: token.realmId,
          accessToken: token.accessToken,
        });
        const match = accts.find((a) => a.id === bsAccountId);
        if (match) {
          bsAccountName = match.name;
          accountType = match.accountType;
          accountSubType = match.accountSubType ?? undefined;
          const c = (match.classification || "").toLowerCase();
          if (c === "asset") classification = "Asset";
          else if (c === "liability") classification = "Liability";
          else if (c === "equity") classification = "Equity";
        }
      } catch {
        // Non-fatal: proceed without metadata (classification stays null).
      }
      if (classification === null) {
        return {
          ok: false,
          reason: "bs_classification_unavailable",
          code: "bs_classification_unavailable",
        };
      }
      const result = await runBsAccountResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        bsAccountId,
        bsAccountName,
        accountType,
        accountSubType,
        classification,
        asOfDate: input.asOfDate,
        activityStartDate: input.activityStartDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "bs_account_recon",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "fixed_asset_rollforward": {
      const result = await runFaRollforwardResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        asOfDate: input.asOfDate,
        activityStartDate: input.activityStartDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "fixed_asset_rollforward",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "ap_aging": {
      const apAccountId =
        input.apAccountId ??
        (eng.ap_control_qbo_account_id as string | null) ??
        (pbc.source_account_hint as string) ??
        null;
      if (!apAccountId) {
        return {
          ok: false,
          reason: "ap_account_id_required",
          code: "ap_account_id_required",
        };
      }
      const result = await runApResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        apAccountId,
        asOfDate: input.asOfDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "ap_aging",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "inventory": {
      const inventoryAccountId =
        input.inventoryAccountId ??
        (eng.inventory_control_qbo_account_id as string | null) ??
        (pbc.source_account_hint as string) ??
        null;
      if (!inventoryAccountId) {
        return {
          ok: false,
          reason: "inventory_account_id_required",
          code: "inventory_account_id_required",
        };
      }
      const result = await runInventoryResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        inventoryAccountId,
        asOfDate: input.asOfDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "inventory",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "grni": {
      // RA-tier: report-only. No clearing account required. The
      // grni_clearing_qbo_account_id column stays on the engagement for
      // a future RA Pro-tier reclass mechanism (Advisacor posts JEs to
      // move unbilled Item Receipts from A/P to a dedicated GRNI account
      // continuously via CDC cron). That is out of scope for this phase.
      const result = await runGrniResolver({
        engagementId: input.engagementId,
        pbcRequestId: input.pbcRequestId,
        realmId: token.realmId,
        accessToken: token.accessToken,
        asOfDate: input.asOfDate,
        policy: policy as PolicySnapshot & { policy_mode: string },
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
      });
      return result.status === "completed"
        ? {
            ok: true,
            kind: "grni",
            runId: result.runId,
            totalsStatus: result.totalsStatus,
            itemCount: result.itemCount,
          }
        : {
            ok: false,
            reason: result.errorMessage ?? "resolver_failed",
            code: result.errorCode ?? "resolver_failed",
          };
    }
    case "bank_recon":
    case "cash_recon":
    case "debt_schedule":
    case "equity_rollforward":
    case "revenue_cutoff":
    case "expense_cutoff":
    case "bs_recon_summary":
      return {
        ok: false,
        reason: `resolver_not_yet_shipped: ${pbc.tie_out_kind}`,
        code: "resolver_pending",
      };
    case "unclassified":
      return { ok: false, reason: "pbc_unclassified", code: "unclassified" };
    default:
      return {
        ok: false,
        reason: `unknown_kind: ${pbc.tie_out_kind}`,
        code: "unknown_kind",
      };
  }
}
