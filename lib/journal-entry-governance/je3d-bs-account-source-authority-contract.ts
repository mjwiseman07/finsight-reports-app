/**
 * JE-3D — Proposed BS-account source authority + expected-effect contract.
 *
 * DESIGN ONLY for ChatGPT review. Does NOT expand JE_SOURCE_RECON_KINDS.
 * Does NOT authorize proposals, dispatch, or Memory.
 *
 * Locked economics for first-run ACCRUAL cutoff:
 *   DR expense / CR accrued liability
 * changes the accrued-liability GL natural-sign ending balance by +creditCents
 * (credit-normal liability balances are stored POSITIVE in natural-sign).
 *
 * ============================================================
 * NAMING TRAP (RunBsAccountResolverResult / artifact columns)
 * ============================================================
 * In bs-account-resolver.ts:
 *   endingBalanceCents      = GeneralLedger DETAIL ending (provider-backed GL)
 *   glEndingBalanceCents    = Trial Balance naturalized (comparison / prepared)
 *
 * DB artifact / run:
 *   ending_balance_cents / subledger_total_cents = GL detail ending
 *   gl_ending_balance_cents / gl_total_cents     = TB comparison side
 *
 * BS_ACCOUNT_GL_DELTA baseline authority is ALWAYS the GL detail ending.
 * Never substitute the TB / prepared comparison balance — even when both are 0,
 * and especially when a future recon has a non-zero variance.
 */

import type { BsClassification } from "@/lib/audit-ready/tie-out/sign-normalize";

/** Not yet in JE_SOURCE_RECON_KINDS — deliberate future expansion only. */
export const PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT = "bs_account_recon" as const;

export const PROPOSED_BS_ACCOUNT_GL_DELTA_EFFECT_TYPE =
  "BS_ACCOUNT_GL_DELTA" as const;

export type BsAccountGlDeltaExpectedEffect = {
  type: typeof PROPOSED_BS_ACCOUNT_GL_DELTA_EFFECT_TYPE;
  sourceKind: typeof PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT;
  sourceRunId: string;
  qboAccountId: string;
  classification: BsClassification;
  /**
   * Natural-sign provider-backed GENERAL LEDGER ending balance.
   * Must originate from the source run's GL detail ending
   * (resolver endingBalanceCents / DB ending_balance_cents /
   * subledger_total_cents) — NEVER from TB comparison
   * (resolver glEndingBalanceCents / DB gl_ending_balance_cents).
   */
  baselineGlBalanceCents: number;
  /**
   * Signed natural-sign delta. For CR amount X cents on a Liability account:
   * expectedDeltaCents = +X.
   */
  expectedDeltaCents: number;
  expectedPostGlBalanceCents: number;
  signConvention: "qbo_natural_sign";
};

export type BuildBsAccountGlDeltaEffectInput = {
  sourceRunId: string;
  qboAccountId: string;
  classification: BsClassification;
  /**
   * Must be the provider-backed GL detail ending balance.
   * Callers must not pass TB/prepared comparison balances.
   */
  baselineGlBalanceCents: number;
  /** Credit cents on the liability line of the proposed JE. */
  creditCents: number;
};

export type BuildBsAccountGlDeltaEffectResult =
  | { ok: true; effect: BsAccountGlDeltaExpectedEffect }
  | { ok: false; code: string; message: string };

/**
 * Map a completed bs_account_recon resolver result to the GL baseline.
 *
 * Uses endingBalanceCents (GL detail). Refuses to treat glEndingBalanceCents
 * (TB comparison) as baseline authority.
 */
export function resolveProviderBackedGlBaselineFromBsResolverResult(result: {
  endingBalanceCents: number;
  glEndingBalanceCents: number;
}): {
  baselineGlBalanceCents: number;
  preparedOrTbEndingBalanceCents: number;
  baselineSourceField: "endingBalanceCents";
  comparisonSourceField: "glEndingBalanceCents";
} {
  return {
    // Provider-backed GeneralLedger detail ending — JE-authoritative baseline.
    baselineGlBalanceCents: result.endingBalanceCents,
    // Trial Balance naturalized — comparison only; never BS_ACCOUNT_GL_DELTA baseline.
    preparedOrTbEndingBalanceCents: result.glEndingBalanceCents,
    baselineSourceField: "endingBalanceCents",
    comparisonSourceField: "glEndingBalanceCents",
  };
}

/**
 * Build the honest expected-effect for DR expense / CR accrued liability.
 * Rejects Asset classification and non-positive credits.
 *
 * Arithmetic: expectedPost = baselineGl + creditCents (natural-sign).
 * Negative natural-sign baselines remain valid: baseline + credit.
 */
export function buildBsAccountGlDeltaExpectedEffect(
  input: BuildBsAccountGlDeltaEffectInput,
): BuildBsAccountGlDeltaEffectResult {
  if (input.classification !== "Liability") {
    return {
      ok: false,
      code: "je_3d_bs_gl_delta_classification_invalid",
      message:
        "BS_ACCOUNT_GL_DELTA for cutoff accrual requires Liability classification.",
    };
  }
  if (!Number.isInteger(input.creditCents) || input.creditCents <= 0) {
    return {
      ok: false,
      code: "je_3d_bs_gl_delta_credit_invalid",
      message: "creditCents must be a positive integer (cents).",
    };
  }
  if (!Number.isInteger(input.baselineGlBalanceCents)) {
    return {
      ok: false,
      code: "je_3d_bs_gl_delta_baseline_invalid",
      message: "baselineGlBalanceCents must be an integer (cents).",
    };
  }
  if (!input.sourceRunId || !input.qboAccountId) {
    return {
      ok: false,
      code: "je_3d_bs_gl_delta_identity_missing",
      message: "sourceRunId and qboAccountId are required.",
    };
  }

  // Natural-sign: Liability credit increases ending balance (positive).
  const expectedDeltaCents = input.creditCents;
  return {
    ok: true,
    effect: {
      type: PROPOSED_BS_ACCOUNT_GL_DELTA_EFFECT_TYPE,
      sourceKind: PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
      sourceRunId: input.sourceRunId,
      qboAccountId: input.qboAccountId,
      classification: input.classification,
      baselineGlBalanceCents: input.baselineGlBalanceCents,
      expectedDeltaCents,
      expectedPostGlBalanceCents:
        input.baselineGlBalanceCents + expectedDeltaCents,
      signConvention: "qbo_natural_sign",
    },
  };
}

/** Source facts required before a future JE-1 bs_account_recon binding. */
export type BsAccountSourceRunFacts = {
  tieOutKind: string;
  status: string;
  qboAccountId: string;
  expectedQboAccountId: string;
  acquisition: "live_provider" | string;
  baselineSyncId: string | null;
  /** Provider-backed GL detail ending (ending_balance_cents / subledger_total). */
  providerBackedGlEndingBalanceCents: number;
  /** TB comparison side (gl_ending_balance_cents) — not baseline. */
  preparedOrTbEndingBalanceCents: number;
  totalsStatus: string | null;
  tieVarianceCents: number | null;
  classification: BsClassification;
  apControl: boolean;
  signConvention: "qbo_natural_sign";
  /** First-run candidate: require clean tie before first POST. */
  requireFirstRunCleanTie?: boolean;
};

export type ValidateBsAccountSourceRunResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Future governance binding: reject incoherent or non-GL baselines.
 * Does not expand JE_SOURCE_RECON_KINDS by itself.
 */
export function validateBsAccountSourceRunForGlDelta(
  facts: BsAccountSourceRunFacts,
): ValidateBsAccountSourceRunResult {
  if (facts.tieOutKind !== PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT) {
    return {
      ok: false,
      code: "je_3d_bs_source_kind_invalid",
      message: "Source run must be bs_account_recon.",
    };
  }
  if (facts.status !== "completed") {
    return {
      ok: false,
      code: "je_3d_bs_source_not_completed",
      message: "First-run / governed BS source requires status=completed.",
    };
  }
  if (facts.qboAccountId !== facts.expectedQboAccountId) {
    return {
      ok: false,
      code: "je_3d_bs_source_account_mismatch",
      message:
        "Source run account ID must exactly match the JE liability account.",
    };
  }
  if (facts.acquisition !== "live_provider") {
    return {
      ok: false,
      code: "je_3d_bs_source_not_provider_backed",
      message: "BS source acquisition must be live_provider.",
    };
  }
  if (facts.baselineSyncId != null) {
    return {
      ok: false,
      code: "je_3d_bs_source_baseline_sync_unexpected",
      message:
        "Current live_provider BS resolver semantics require baseline_sync_id NULL.",
    };
  }
  if (facts.signConvention !== "qbo_natural_sign") {
    return {
      ok: false,
      code: "je_3d_bs_source_sign_convention_invalid",
      message: "Sign convention must be qbo_natural_sign.",
    };
  }
  if (facts.classification !== "Liability") {
    return {
      ok: false,
      code: "je_3d_bs_source_classification_invalid",
      message: "Cutoff accrual liability source must be Liability classification.",
    };
  }
  if (facts.apControl) {
    return {
      ok: false,
      code: "je_3d_bs_source_control_account_forbidden",
      message: "Source account must not be an AP/control account.",
    };
  }
  if (facts.requireFirstRunCleanTie !== false) {
    if (facts.totalsStatus !== "tie") {
      return {
        ok: false,
        code: "je_3d_bs_source_first_run_not_tie",
        message: "First-run BS source requires totals_status=tie.",
      };
    }
    if (facts.tieVarianceCents !== 0) {
      return {
        ok: false,
        code: "je_3d_bs_source_first_run_nonzero_variance",
        message: "First-run BS source requires tie variance = 0.",
      };
    }
  }
  return { ok: true };
}

/**
 * Governance checklist for a future PR that may add bs_account_recon to
 * JE_SOURCE_RECON_KINDS. This PR must not flip the union.
 */
export const JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS = [
  "exact source run ID (bs_account_recon)",
  "run status = completed",
  "exact QBO account ID matching the JE credit line",
  "exact provider-backed acquisition (live_provider GL+TB; not synthetic staging sync)",
  "baseline_sync_id NULL for current live_provider BS resolver semantics",
  "baselineGlBalanceCents = provider-backed GL detail ending (ending_balance_cents / subledger_total_cents)",
  "never use TB/prepared comparison (gl_ending_balance_cents) as BS_ACCOUNT_GL_DELTA baseline",
  "exact expected delta cents with documented sign convention",
  "exact expected post-JE natural-sign GL balance cents (= baseline GL + delta)",
  "sign convention = qbo_natural_sign (liability credit balances positive)",
  "no AP/AR/inventory control-account violation",
  "source run belongs to same company/engagement authority as proposal",
  "first-run candidate: totals_status=tie and tie_variance_cents=0",
  "CC observation slot / custody expansion if required for authoritative binding",
  "JE_SOURCE_RECON_KINDS expansion only after ChatGPT approval of this contract",
] as const;

export function describeBsAccountLiabilityCreditEffect(): string {
  return (
    "A credit to a Liability account increases its QBO natural-sign GENERAL LEDGER " +
    "ending balance by the credit amount in cents. Baseline authority is the " +
    "provider-backed GL detail ending from the bs_account_recon — not the Trial " +
    "Balance / prepared comparison figure. DR expense does not change this " +
    "BS-account measurement; only the liability credit does. Therefore the " +
    "expected effect is BS_ACCOUNT_GL_DELTA with expectedDeltaCents = +creditCents, " +
    "not an AP/AR aging residual reduction."
  );
}
