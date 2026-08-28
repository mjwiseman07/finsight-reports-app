/**
 * JE-3D — First-run proposal evidence coherence (Patent #6 / source custody).
 *
 * Ensures cutoff_accrual ACCRUAL proposals do not claim recon effects that the
 * expense ↔ accrued-liability JE cannot actually change.
 *
 * Locked rule: expected effects must describe what THIS JE will change.
 * DR expense / CR accrued liability does NOT remediate AR aging or AP aging
 * control-account tie-outs (and v1 forbids AP-control posting).
 */

import type { JeExpectedEffect } from "./types";
import { FIRST_RUN_JE_AMOUNT_CENTS } from "./je3d-first-run-account-authority";
import { FIRST_RUN_REASON_CODE } from "./je3d-first-run-execution-authority";

/** Aging kinds that a P&L expense ↔ accrued-liability JE cannot remediate. */
export const FIRST_RUN_INCOHERENT_AGING_RECON_KINDS = [
  "ar_aging",
  "ap_aging",
] as const;

export type FirstRunEvidenceCoherenceResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Valid first-run expected effects for expense ↔ accrued-liability:
 * GL movement only (ACCOUNT_RECLASS). Do not claim aging residual reduction.
 */
export function buildFirstRunEvidenceCoherentExpectedEffects(args: {
  expenseAccountId: string;
  accruedLiabilityAccountId: string;
  amountCents?: number;
}): JeExpectedEffect[] {
  const amountCents = args.amountCents ?? FIRST_RUN_JE_AMOUNT_CENTS;
  return [
    {
      type: "ACCOUNT_RECLASS",
      fromAccountId: args.expenseAccountId,
      toAccountId: args.accruedLiabilityAccountId,
      amountCents,
    },
  ];
}

function isIncoherentAgingKind(kind: string): boolean {
  return (FIRST_RUN_INCOHERENT_AGING_RECON_KINDS as readonly string[]).includes(
    kind,
  );
}

export function validateFirstRunEvidenceCoherence(args: {
  originType: string;
  reasonCode: string;
  sourceReconRunIds: readonly string[];
  expectedEffects: readonly JeExpectedEffect[];
  sourceReconKindsById?: ReadonlyMap<string, string>;
}): FirstRunEvidenceCoherenceResult {
  if (
    args.originType !== "ACCRUAL" ||
    args.reasonCode !== FIRST_RUN_REASON_CODE
  ) {
    return { ok: true };
  }

  for (const effect of args.expectedEffects) {
    if (
      effect.type === "RECON_OUTCOME_TARGET" &&
      isIncoherentAgingKind(effect.reconKind)
    ) {
      return {
        ok: false,
        code: "je_3d_first_run_incoherent_aging_outcome_effect",
        message:
          `cutoff_accrual ACCRUAL must not target ${effect.reconKind} outcomes; ` +
          "expense/accrued-liability JEs do not change AR/AP aging measurements.",
      };
    }
    if (
      effect.type === "RESIDUAL_DELTA" &&
      isIncoherentAgingKind(effect.reconKind)
    ) {
      return {
        ok: false,
        code: "je_3d_first_run_incoherent_aging_residual_delta",
        message:
          `cutoff_accrual ACCRUAL must not claim RESIDUAL_DELTA on ${effect.reconKind}; ` +
          "DR expense / CR accrued liability does not change AP/AR aging " +
          "subledger-vs-control residuals (and v1 forbids AP-control posting).",
      };
    }
  }

  const hasAccountReclass = args.expectedEffects.some(
    (effect) =>
      effect.type === "ACCOUNT_RECLASS" && effect.amountCents > 0,
  );

  if (!hasAccountReclass) {
    return {
      ok: false,
      code: "je_3d_first_run_missing_gl_movement_effect",
      message:
        "First-run cutoff_accrual requires ACCOUNT_RECLASS documenting " +
        "expense → accrued-liability GL movement.",
    };
  }

  if (args.sourceReconKindsById && args.sourceReconRunIds.length > 0) {
    for (const reconId of args.sourceReconRunIds) {
      const kind = args.sourceReconKindsById.get(reconId);
      if (kind && isIncoherentAgingKind(kind)) {
        return {
          ok: false,
          code: "je_3d_first_run_incoherent_aging_source",
          message:
            `cutoff_accrual ACCRUAL must not cite ${kind} as authoritative source; ` +
            "use expense_cutoff, accrued-liability bs_account_recon, or another " +
            "authority whose measured balance this JE can actually change.",
        };
      }
    }
  }

  return { ok: true };
}

export function describeFirstRunEvidenceConnection(): string {
  return (
    "A governed expense ↔ accrued-liability cutoff accrual changes expense and " +
    "accrued-liability GL balances. Expected effects may document that GL movement " +
    "(ACCOUNT_RECLASS). They must not claim AR/AP aging residual reduction. " +
    "Authoritative source recon must measure expense cutoff or the accrued-liability " +
    "balance this JE actually affects."
  );
}
