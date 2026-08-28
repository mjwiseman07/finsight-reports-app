/**
 * Contract tests for proposed BS_ACCOUNT_GL_DELTA expected effect.
 * Does not expand JE_SOURCE_RECON_KINDS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JE_SOURCE_RECON_KINDS } from "../types";
import {
  buildBsAccountGlDeltaExpectedEffect,
  describeBsAccountLiabilityCreditEffect,
  expectedBsAccountTieVarianceCents,
  JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS,
  PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
  resolveProviderBackedGlBaselineFromBsResolverResult,
  validateBsAccountSourceRunForGlDelta,
} from "../je3d-bs-account-source-authority-contract";

function baseFacts(
  over: Partial<Parameters<typeof validateBsAccountSourceRunForGlDelta>[0]> = {},
): Parameters<typeof validateBsAccountSourceRunForGlDelta>[0] {
  return {
    tieOutKind: "bs_account_recon",
    status: "completed",
    qboAccountId: "1150040002",
    expectedQboAccountId: "1150040002",
    acquisition: "live_provider",
    baselineSyncId: null,
    providerBackedGlEndingBalanceCents: 0,
    preparedOrTbEndingBalanceCents: 0,
    totalsStatus: "tie",
    tieVarianceCents: 0,
    classification: "Liability",
    apControl: false,
    signConvention: "qbo_natural_sign",
    ...over,
  };
}

describe("JE-3D BS account source authority contract", () => {
  it("JE_SOURCE_RECON_KINDS remains unchanged", () => {
    expect(JE_SOURCE_RECON_KINDS).toEqual([
      "ar_aging",
      "ap_aging",
      "inventory",
    ]);
    expect(
      (JE_SOURCE_RECON_KINDS as readonly string[]).includes(
        PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
      ),
    ).toBe(false);
  });

  it("1. GL 500 / TB 700 / variance -200 → arithmetic coherent", () => {
    expect(
      expectedBsAccountTieVarianceCents({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 700,
      }),
    ).toBe(-200);
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 700,
        tieVarianceCents: -200,
        totalsStatus: "review",
        requireFirstRunCleanTie: false,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("2. GL 500 / TB 700 / variance 0 → REJECT arithmetic mismatch", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 700,
        tieVarianceCents: 0,
        totalsStatus: "tie",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_variance_arithmetic_mismatch");
  });

  it("3. GL 500 / TB 500 / variance 0 / totals_status=tie → PASS first-run", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 500,
        tieVarianceCents: 0,
        totalsStatus: "tie",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("4. GL 500 / TB 700 / variance -200 / totals_status=tie → REJECT first-run zero-variance", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 700,
        tieVarianceCents: -200,
        totalsStatus: "tie",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_first_run_nonzero_variance");
  });

  it("5. GL 500 / TB 500 / supplied variance 1 → REJECT arithmetic mismatch", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 500,
        tieVarianceCents: 1,
        totalsStatus: "tie",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_variance_arithmetic_mismatch");
  });

  it("6. fractional GL cents → reject", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500.5,
        preparedOrTbEndingBalanceCents: 500.5,
        tieVarianceCents: 0,
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_gl_cents_not_integer");
  });

  it("7. fractional TB cents → reject", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 500.25,
        tieVarianceCents: 0,
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_tb_cents_not_integer");
  });

  it("8. fractional variance cents → reject", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 500,
        preparedOrTbEndingBalanceCents: 500,
        tieVarianceCents: 0.1,
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_variance_cents_not_integer");
  });

  it("9+10. GL 500 / TB 700 baseline mapping returns GL 500; CR100 → post 600", () => {
    const mapped = resolveProviderBackedGlBaselineFromBsResolverResult({
      endingBalanceCents: 500,
      glEndingBalanceCents: 700,
    });
    expect(mapped.baselineGlBalanceCents).toBe(500);
    expect(mapped.preparedOrTbEndingBalanceCents).toBe(700);

    const effect = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "1150040002",
      classification: "Liability",
      baselineGlBalanceCents: mapped.baselineGlBalanceCents,
      creditCents: 100,
    });
    expect(effect.ok).toBe(true);
    if (!effect.ok) return;
    expect(effect.effect.baselineGlBalanceCents).toBe(500);
    expect(effect.effect.expectedDeltaCents).toBe(100);
    expect(effect.effect.expectedPostGlBalanceCents).toBe(600);
  });

  it("source account mismatch rejected", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({ qboAccountId: "999" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_account_mismatch");
  });

  it("first-run requires completed status", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({ status: "running" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_not_completed");
  });

  it("first-run requires totals_status=tie", () => {
    const result = validateBsAccountSourceRunForGlDelta(
      baseFacts({
        providerBackedGlEndingBalanceCents: 0,
        preparedOrTbEndingBalanceCents: 50,
        tieVarianceCents: -50,
        totalsStatus: "review",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_first_run_not_tie");
  });

  it("Asset classification rejected for accrual effect", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "35",
      classification: "Asset",
      baselineGlBalanceCents: 0,
      creditCents: 100,
    });
    expect(result.ok).toBe(false);
  });

  it("Phase A script wires resolver GL baseline + bsResult.tieVarianceCents", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "scripts/je3d/phase-a-bs-account-source-authority.ts",
      ),
      "utf8",
    );
    expect(src).toContain("resolveProviderBackedGlBaselineFromBsResolverResult");
    expect(src).toContain(
      "providerBackedGlEndingBalanceCents: glBaseline.baselineGlBalanceCents",
    );
    expect(src).toContain(
      "preparedOrTbEndingBalanceCents: glBaseline.preparedOrTbEndingBalanceCents",
    );
    expect(src).toContain("tieVarianceCents: bsResult.tieVarianceCents");
    expect(src).toContain("baselineGlBalanceCents: glBaseline.baselineGlBalanceCents");
  });

  it("documents variance arithmetic custody in governance requirements", () => {
    expect(JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS.join(" ")).toContain(
      "tieVarianceCents must equal",
    );
    expect(describeBsAccountLiabilityCreditEffect()).toContain("GENERAL LEDGER");
  });
});
