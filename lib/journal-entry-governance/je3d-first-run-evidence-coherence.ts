/**
 * JE-3D — First-run proposal evidence coherence (Patent #6 / source custody).
 *
 * Ensures cutoff_accrual ACCRUAL proposals do not claim unrelated recon effects
 * (e.g. ar_aging → reconciled_exact when the JE is expense ↔ accrued liability).
 */

import type { JeExpectedEffect } from "./types";
import { FIRST_RUN_JE_AMOUNT_CENTS } from "./je3d-first-run-account-authority";
import { FIRST_RUN_REASON_CODE } from "./je3d-first-run-execution-authority";

export const FIRST_RUN_SOURCE_RECON_KIND = "ap_aging" as const;

export type FirstRunEvidenceCoherenceResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function buildFirstRunEvidenceCoherentExpectedEffects(args: {
  expenseAccountId: string;
  accruedLiabilityAccountId: string;
  amountCents?: number;
}): JeExpectedEffect[] {
  const amountCents = args.amountCents ?? FIRST_RUN_JE_AMOUNT_CENTS;
  return [
    {
      type: "RESIDUAL_DELTA",
      reconKind: FIRST_RUN_SOURCE_RECON_KIND,
      expectedDeltaCents: -amountCents,
    },
    {
      type: "ACCOUNT_RECLASS",
      fromAccountId: args.expenseAccountId,
      toAccountId: args.accruedLiabilityAccountId,
      amountCents,
    },
  ];
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
      effect.reconKind === "ar_aging"
    ) {
      return {
        ok: false,
        code: "je_3d_first_run_incoherent_ar_aging_effect",
        message:
          "cutoff_accrual ACCRUAL must not target ar_aging reconciled_exact; " +
          "expense/accrual JEs do not affect AR aging.",
      };
    }
  }

  const hasApResidual = args.expectedEffects.some(
    (effect) =>
      effect.type === "RESIDUAL_DELTA" &&
      effect.reconKind === FIRST_RUN_SOURCE_RECON_KIND &&
      effect.expectedDeltaCents < 0,
  );
  const hasAccountReclass = args.expectedEffects.some(
    (effect) =>
      effect.type === "ACCOUNT_RECLASS" && effect.amountCents > 0,
  );

  if (!hasApResidual || !hasAccountReclass) {
    return {
      ok: false,
      code: "je_3d_first_run_incoherent_expected_effects",
      message:
        "First-run cutoff_accrual requires AP aging RESIDUAL_DELTA and " +
        "ACCOUNT_RECLASS expected effects aligned to expense/accrual economics.",
    };
  }

  if (args.sourceReconKindsById && args.sourceReconRunIds.length > 0) {
    for (const reconId of args.sourceReconRunIds) {
      const kind = args.sourceReconKindsById.get(reconId);
      if (kind === "ar_aging") {
        return {
          ok: false,
          code: "je_3d_first_run_incoherent_ar_aging_source",
          message:
            "cutoff_accrual ACCRUAL must not cite ar_aging as authoritative source; " +
            "use AP aging cutoff variance or a coherent liability-side recon.",
        };
      }
    }
  }

  return { ok: true };
}

export function describeFirstRunEvidenceConnection(): string {
  return (
    "AP aging tie-out variance (open_review) identifies an immaterial cutoff accrual. " +
    "The JE debits expense and credits accrued liability; RESIDUAL_DELTA on ap_aging " +
    "documents expected variance reduction, and ACCOUNT_RECLASS documents the GL movement."
  );
}
