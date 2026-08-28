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
   * Natural-sign GL ending balance from provider-backed BS recon
   * (liability credit balances are positive).
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
  baselineGlBalanceCents: number;
  /** Credit cents on the liability line of the proposed JE. */
  creditCents: number;
};

export type BuildBsAccountGlDeltaEffectResult =
  | { ok: true; effect: BsAccountGlDeltaExpectedEffect }
  | { ok: false; code: string; message: string };

/**
 * Build the honest expected-effect for DR expense / CR accrued liability.
 * Rejects Asset classification and non-positive credits.
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

/**
 * Governance checklist for a future PR that may add bs_account_recon to
 * JE_SOURCE_RECON_KINDS. This PR must not flip the union.
 */
export const JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS = [
  "exact source run ID (bs_account_recon)",
  "exact QBO account ID matching the JE credit (or debit) line",
  "exact provider-backed acquisition (live_provider GL+TB; not synthetic staging sync)",
  "exact pre-JE natural-sign GL balance cents",
  "exact expected delta cents with documented sign convention",
  "exact expected post-JE natural-sign GL balance cents",
  "sign convention = qbo_natural_sign (liability credit balances positive)",
  "no AP/AR/inventory control-account violation",
  "CC observation slot / custody expansion if required for authoritative binding",
  "JE_SOURCE_RECON_KINDS expansion only after ChatGPT approval of this contract",
] as const;

export function describeBsAccountLiabilityCreditEffect(): string {
  return (
    "A credit to a Liability account increases its QBO natural-sign ending " +
    "balance by the credit amount in cents. DR expense does not change this " +
    "BS-account measurement; only the liability credit does. Therefore the " +
    "expected effect is BS_ACCOUNT_GL_DELTA with expectedDeltaCents = +creditCents, " +
    "not an AP/AR aging residual reduction."
  );
}
