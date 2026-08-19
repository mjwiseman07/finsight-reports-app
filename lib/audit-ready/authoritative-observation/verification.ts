/**
 * CC-2A4 run-row and selector verification.
 *
 * Resolver return values are not sufficient. A completed slot is authoritative
 * only when the exact run row and the sync selector agree.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  AuthoritativeObservationError,
  type AuthoritativeFailureRecon,
} from "./types";

export type TieOutRunVerificationRow = {
  id: string;
  engagement_id: string;
  period_end: string;
  tie_out_kind: string;
  status: string;
  baseline_sync_id: string | null;
};

export type CompletedSelectorRow = {
  id: string;
  baselineSyncId: string | null;
  completedAt: string;
};

export async function loadTieOutRunForVerification(
  runId: string,
): Promise<TieOutRunVerificationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, engagement_id, period_end, tie_out_kind, status, baseline_sync_id")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) return null;
  return {
    id: String(data.id),
    engagement_id: String(data.engagement_id || ""),
    period_end: String(data.period_end || ""),
    tie_out_kind: String(data.tie_out_kind || ""),
    status: String(data.status || ""),
    baseline_sync_id:
      data.baseline_sync_id == null ? null : String(data.baseline_sync_id),
  };
}

export function verifyTieOutRunRow(args: {
  row: TieOutRunVerificationRow | null;
  runId: string;
  engagementId: string;
  periodEnd: string;
  tieOutKind: TieOutKind | string;
  accountingSyncId: string;
  recon: AuthoritativeFailureRecon;
}): void {
  if (!args.row || args.row.id !== args.runId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SELECTOR_NULL,
      "Tie-out run row was not found for the resolver runId.",
      args.recon,
    );
  }
  if (args.row.engagement_id !== args.engagementId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.RUN_ENGAGEMENT_MISMATCH,
      "Tie-out run engagement_id does not match the observation engagement.",
      args.recon,
    );
  }
  if (asIsoDate(args.row.period_end) !== asIsoDate(args.periodEnd)) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.RUN_PERIOD_MISMATCH,
      "Tie-out run period_end does not match the observation period.",
      args.recon,
    );
  }
  if (args.row.tie_out_kind !== args.tieOutKind) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.RUN_KIND_MISMATCH,
      "Tie-out run kind does not match the intended reconciliation.",
      args.recon,
    );
  }
  if (String(args.row.baseline_sync_id || "") !== args.accountingSyncId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.BASELINE_SYNC_MISMATCH,
      "Tie-out run baseline_sync_id does not match the observation accounting_syncs.id.",
      args.recon,
    );
  }
  if (args.row.status !== "completed") {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.RUN_STATUS_NOT_COMPLETED,
      "Tie-out run is not completed.",
      args.recon,
    );
  }
}

export function verifySelectorExactRun(args: {
  selected: CompletedSelectorRow | null;
  runId: string;
  recon: AuthoritativeFailureRecon;
}): void {
  if (!args.selected?.id) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SELECTOR_NULL,
      "selectLatestCompletedTieOutRunForSync returned no completed run for this sync.",
      args.recon,
    );
  }
  if (args.selected.id !== args.runId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SELECTOR_RUN_MISMATCH,
      "Selector returned a different completed run than this invocation's runId.",
      args.recon,
    );
  }
}
