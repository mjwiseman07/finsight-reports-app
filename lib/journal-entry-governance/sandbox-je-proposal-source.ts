/**
 * Resolve latest uniquely eligible Demo A READY CC + sync + BS recon custody.
 * Fail closed on zero eligible rows or ambiguous distinct custody bindings.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";
import {
  SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
} from "./sandbox-je-proposal-shared";

export class SandboxJeSourceCustodyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SandboxJeSourceCustodyError";
    this.code = code;
  }
}

export type SandboxJeEligibleSourceCustody = {
  engagementId: string;
  continuousCloseRunId: string;
  accountingSyncId: string;
  periodEnd: string;
  firmClientId: string;
  bsReconRunId: string;
  qboAccountId: typeof SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID;
  baselineGlBalanceCents: number;
};

type CcCandidateRow = {
  id: string;
  engagement_id: string;
  accounting_sync_id: string;
  period_end: string;
  firm_client_id: string | null;
  created_at: string;
  observation_summary: Record<string, unknown> | null;
};

function parseBsSlot(summary: Record<string, unknown> | null): {
  runId: string;
  qboAccountId: string;
  authoritative: boolean;
  baselineSyncId: string | null;
  measurementSource: string | null;
} | null {
  const reconciliations = summary?.reconciliations as
    | Record<string, unknown>
    | undefined;
  const bs = reconciliations?.bsAccount as Record<string, unknown> | undefined;
  if (!bs || typeof bs !== "object") return null;
  const runId = String(bs.runId || "").trim();
  const qboAccountId = String(bs.qboAccountId || "").trim();
  if (!runId || !qboAccountId) return null;
  return {
    runId,
    qboAccountId,
    authoritative: bs.authoritative === true,
    baselineSyncId:
      bs.baselineSyncId == null || bs.baselineSyncId === ""
        ? null
        : String(bs.baselineSyncId),
    measurementSource: bs.measurementSource
      ? String(bs.measurementSource)
      : null,
  };
}

function custodyKey(args: {
  periodEnd: string;
  accountingSyncId: string;
  bsReconRunId: string;
}): string {
  return `${args.periodEnd}|${args.accountingSyncId}|${args.bsReconRunId}`;
}

/**
 * Resolve Demo A engagement uniquely by company_id.
 */
export async function resolveDemoAEngagementId(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_engagements")
    .select("id")
    .eq("company_id", JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId);
  if (error) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_engagement_query_failed",
      error.message,
    );
  }
  const ids = [
    ...new Set(
      (data || []).map((r: { id: string }) => String(r.id)),
    ),
  ];
  if (ids.length === 0) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_engagement_missing",
      "No Demo A engagement found for canonical company.",
    );
  }
  if (ids.length > 1) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_engagement_ambiguous",
      "Multiple Demo A engagements found; refuse ambiguous custody.",
    );
  }
  return ids[0] as string;
}

/**
 * Latest uniquely eligible READY CC for Demo A with locked BS liability slot.
 *
 * Eligibility: completed + READY + Demo A firm client + authoritative live_provider
 * bsAccount slot for locked credit account.
 *
 * Uniqueness: among eligible rows for the max period_end, distinct
 * (period_end, sync, bs_run) custody keys must number exactly one; then pick
 * the latest created_at within that binding.
 */
export async function resolveLatestUniqueEligibleDemoASourceCustody(): Promise<SandboxJeEligibleSourceCustody> {
  const engagementId = await resolveDemoAEngagementId();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select(
      "id, engagement_id, accounting_sync_id, period_end, firm_client_id, created_at, observation_summary",
    )
    .eq("engagement_id", engagementId)
    .eq("status", "completed")
    .eq("readiness", "READY")
    .eq("firm_client_id", JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_cc_query_failed",
      error.message,
    );
  }

  const eligible: Array<{
    row: CcCandidateRow;
    bsRunId: string;
    qboAccountId: string;
    periodEnd: string;
    syncId: string;
  }> = [];

  for (const raw of data || []) {
    const row = raw as CcCandidateRow;
    const slot = parseBsSlot(row.observation_summary);
    if (!slot) continue;
    if (!slot.authoritative) continue;
    if (slot.measurementSource !== "live_provider") continue;
    if (slot.baselineSyncId != null) continue;
    if (slot.qboAccountId !== SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID) continue;
    const periodEnd = String(row.period_end || "").slice(0, 10);
    const syncId = String(row.accounting_sync_id || "").trim();
    if (!periodEnd || !syncId) continue;
    eligible.push({
      row,
      bsRunId: slot.runId,
      qboAccountId: slot.qboAccountId,
      periodEnd,
      syncId,
    });
  }

  if (eligible.length === 0) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_source_custody_missing",
      "No uniquely eligible Demo A READY CC/BS custody candidates.",
    );
  }

  const maxPeriodEnd = eligible
    .map((e) => e.periodEnd)
    .sort()
    .at(-1)!;
  const atLatestPeriod = eligible.filter((e) => e.periodEnd === maxPeriodEnd);
  const distinctKeys = new Set(
    atLatestPeriod.map((e) =>
      custodyKey({
        periodEnd: e.periodEnd,
        accountingSyncId: e.syncId,
        bsReconRunId: e.bsRunId,
      }),
    ),
  );
  if (distinctKeys.size !== 1) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_source_custody_ambiguous",
      "Multiple distinct Demo A READY source-custody bindings at latest period_end.",
    );
  }

  const winner = atLatestPeriod.sort((a, b) =>
    String(b.row.created_at).localeCompare(String(a.row.created_at)),
  )[0]!;

  const { data: recon, error: reconErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, status, totals_status, totals_variance_cents, subledger_total_cents, baseline_sync_id, tie_out_kind, engagement_id, period_end",
    )
    .eq("id", winner.bsRunId)
    .maybeSingle();

  if (reconErr || !recon?.id) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_recon_missing",
      reconErr?.message || "Eligible BS recon run was not found.",
    );
  }
  if (
    String(recon.engagement_id) !== engagementId ||
    String(recon.period_end).slice(0, 10) !== winner.periodEnd ||
    String(recon.tie_out_kind) !== "bs_account_recon" ||
    String(recon.status) !== "completed" ||
    String(recon.totals_status) !== "tie" ||
    Number(recon.totals_variance_cents) !== 0 ||
    recon.baseline_sync_id != null
  ) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_recon_not_eligible",
      "Eligible BS recon run failed live_provider clean-tie custody checks.",
    );
  }

  const baselineGl = Number(recon.subledger_total_cents);
  if (!Number.isInteger(baselineGl)) {
    throw new SandboxJeSourceCustodyError(
      "sandbox_je_recon_baseline_invalid",
      "BS recon baseline GL balance must be an integer cent amount.",
    );
  }

  return {
    engagementId,
    continuousCloseRunId: String(winner.row.id),
    accountingSyncId: winner.syncId,
    periodEnd: winner.periodEnd,
    firmClientId: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
    bsReconRunId: winner.bsRunId,
    qboAccountId: SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
    baselineGlBalanceCents: baselineGl,
  };
}
