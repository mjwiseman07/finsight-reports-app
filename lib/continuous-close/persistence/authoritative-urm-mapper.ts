/**
 * Map authoritative observation slots to CC-1 URM inputs.
 *
 * Observation slots are custody signals only. Persisted URM outcome/bridge
 * is the measurement authority. Do not synthesize recon_outcome from totalsStatus.
 */

import { isPolicyRequiredReconKind } from "@/lib/continuous-close/policy";
import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import type { ContinuousCloseUrmNormalizedInput } from "@/lib/continuous-close/types";
import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";
import type { AuthoritativeObservationResult } from "@/lib/audit-ready/authoritative-observation/types";
import type { AuthoritativeReconSlot } from "@/lib/audit-ready/authoritative-observation/types";
import type { AuthoritativeUrmKind, SelectedUrmRuns } from "./types";

export const AUTHORITATIVE_URM_KINDS = [
  "ar_aging",
  "ap_aging",
  "inventory",
] as const satisfies readonly AuthoritativeUrmKind[];

const SLOT_KIND: Record<"ar" | "ap" | "inventory", AuthoritativeUrmKind> = {
  ar: "ar_aging",
  ap: "ap_aging",
  inventory: "inventory",
};

const RECON_OUTCOMES: readonly ReconOutcome[] = [
  "reconciled_exact",
  "reconciled_with_timing",
  "reconciled_immaterial_residual",
  "open_review",
  "open_material",
  "provider_action_required",
  "failed",
];

export type AuthoritativeUrmRunFacts = {
  runId: string;
  tieOutKind: string;
  periodEnd: string | null;
  reconOutcome: ReconOutcome | null;
  grossVarianceCents: number | null;
  identifiedTotalCents: number | null;
  unidentifiedResidualCents: number | null;
  baselineSyncId: string | null;
  itemIds: string[];
};

export type AuthoritativeUrmMapperDeps = {
  loadRunFacts: (runId: string) => Promise<AuthoritativeUrmRunFacts | null>;
  countEvidence: (itemIds: readonly string[]) => Promise<number>;
};

function isReconOutcome(value: unknown): value is ReconOutcome {
  return typeof value === "string" && (RECON_OUTCOMES as readonly string[]).includes(value);
}

function slotIsCcAuthoritative(
  slot: AuthoritativeReconSlot | null,
  accountingSyncId: string,
): slot is AuthoritativeReconSlot & { runId: string } {
  if (!slot) return false;
  if (slot.authoritative !== true) return false;
  if (!slot.runId) return false;
  if (slot.measurementSource !== "persisted_sync_snapshot") return false;
  if (slot.baselineSyncId !== accountingSyncId) return false;
  return true;
}

export async function mapAuthoritativeObservationToUrmInputs(args: {
  observation: AuthoritativeObservationResult;
  policy: ContinuousCloseObservePolicy;
  deps: AuthoritativeUrmMapperDeps;
}): Promise<{
  urmInputs: ContinuousCloseUrmNormalizedInput[];
  selectedUrmRuns: SelectedUrmRuns;
}> {
  const accountingSyncId = String(args.observation.accountingSyncId || "");
  const urmInputs: ContinuousCloseUrmNormalizedInput[] = [];
  const selectedUrmRuns: SelectedUrmRuns = {};

  for (const slotName of ["ar", "ap", "inventory"] as const) {
    const kind = SLOT_KIND[slotName];
    const slot = args.observation.reconciliations[slotName];
    if (!slotIsCcAuthoritative(slot, accountingSyncId)) continue;

    const facts = await args.deps.loadRunFacts(slot.runId);
    if (!facts) continue;
    if (facts.tieOutKind !== kind) continue;
    if (facts.baselineSyncId !== accountingSyncId) continue;
    if (!isReconOutcome(facts.reconOutcome)) continue;

    const evidenceCount = await args.deps.countEvidence(facts.itemIds);
    urmInputs.push({
      workpaperId: facts.runId,
      workpaperKind: kind,
      required: isPolicyRequiredReconKind(args.policy, kind),
      outcome: facts.reconOutcome,
      unidentifiedResidualCents: facts.unidentifiedResidualCents,
      materialityThresholdCents: null,
      grossVarianceCents: facts.grossVarianceCents,
      identifiedTotalCents: facts.identifiedTotalCents,
      evidenceCount,
      sourceAccountingSyncId: facts.baselineSyncId,
      asOfDate: facts.periodEnd,
      urmRunId: facts.runId,
    });
    selectedUrmRuns[kind] = facts.runId;
  }

  return { urmInputs, selectedUrmRuns };
}
