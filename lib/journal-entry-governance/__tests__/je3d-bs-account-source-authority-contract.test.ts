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
  JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS,
  PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
  resolveProviderBackedGlBaselineFromBsResolverResult,
  validateBsAccountSourceRunForGlDelta,
} from "../je3d-bs-account-source-authority-contract";

describe("JE-3D BS account source authority contract", () => {
  it("10. JE_SOURCE_RECON_KINDS remains unchanged", () => {
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

  it("1. baseline 500 GL / prepared 700 uses GL 500, not prepared 700", () => {
    const mapped = resolveProviderBackedGlBaselineFromBsResolverResult({
      endingBalanceCents: 500, // GL detail
      glEndingBalanceCents: 700, // TB comparison (misnamed)
    });
    expect(mapped.baselineGlBalanceCents).toBe(500);
    expect(mapped.preparedOrTbEndingBalanceCents).toBe(700);
    expect(mapped.baselineSourceField).toBe("endingBalanceCents");

    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "1150040002",
      classification: "Liability",
      baselineGlBalanceCents: mapped.baselineGlBalanceCents,
      creditCents: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect.baselineGlBalanceCents).toBe(500);
    expect(result.effect.expectedPostGlBalanceCents).toBe(600);
    expect(result.effect.baselineGlBalanceCents).not.toBe(700);
  });

  it("2. liability CR 100 → delta +100, post GL = baseline + 100", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "1150040002",
      classification: "Liability",
      baselineGlBalanceCents: 500,
      creditCents: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect.expectedDeltaCents).toBe(100);
    expect(result.effect.expectedPostGlBalanceCents).toBe(600);
    expect(result.effect.signConvention).toBe("qbo_natural_sign");
  });

  it("3. negative natural-sign baseline: arithmetic remains baseline + credit", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "1150040002",
      classification: "Liability",
      baselineGlBalanceCents: -250,
      creditCents: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect.expectedDeltaCents).toBe(100);
    expect(result.effect.expectedPostGlBalanceCents).toBe(-150);
  });

  it("4. non-integer credit rejected", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "1150040002",
      classification: "Liability",
      baselineGlBalanceCents: 0,
      creditCents: 100.5,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_gl_delta_credit_invalid");
  });

  it("5. Asset classification rejected for this accrual contract", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "35",
      classification: "Asset",
      baselineGlBalanceCents: 0,
      creditCents: 100,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_gl_delta_classification_invalid");
  });

  it("6. source account mismatch rejected by governance binding", () => {
    const result = validateBsAccountSourceRunForGlDelta({
      tieOutKind: "bs_account_recon",
      status: "completed",
      qboAccountId: "999",
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
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_account_mismatch");
  });

  it("7. first-run source requires completed bs_account_recon", () => {
    const result = validateBsAccountSourceRunForGlDelta({
      tieOutKind: "bs_account_recon",
      status: "running",
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
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_not_completed");
  });

  it("8. first-run source requires totals_status=tie", () => {
    const result = validateBsAccountSourceRunForGlDelta({
      tieOutKind: "bs_account_recon",
      status: "completed",
      qboAccountId: "1150040002",
      expectedQboAccountId: "1150040002",
      acquisition: "live_provider",
      baselineSyncId: null,
      providerBackedGlEndingBalanceCents: 0,
      preparedOrTbEndingBalanceCents: 50,
      totalsStatus: "review",
      tieVarianceCents: -50,
      classification: "Liability",
      apControl: false,
      signConvention: "qbo_natural_sign",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_first_run_not_tie");
  });

  it("9. first-run source requires tie variance=0", () => {
    const result = validateBsAccountSourceRunForGlDelta({
      tieOutKind: "bs_account_recon",
      status: "completed",
      qboAccountId: "1150040002",
      expectedQboAccountId: "1150040002",
      acquisition: "live_provider",
      baselineSyncId: null,
      providerBackedGlEndingBalanceCents: 100,
      preparedOrTbEndingBalanceCents: 0,
      totalsStatus: "tie",
      tieVarianceCents: 100,
      classification: "Liability",
      apControl: false,
      signConvention: "qbo_natural_sign",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_first_run_nonzero_variance");
  });

  it("Phase A script uses GL detail ending via resolver mapper, not TB field", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "scripts/je3d/phase-a-bs-account-source-authority.ts",
      ),
      "utf8",
    );
    expect(src).toContain("resolveProviderBackedGlBaselineFromBsResolverResult");
    expect(src).toContain("baselineGlBalanceCents: glBaseline.baselineGlBalanceCents");
    expect(src).not.toMatch(
      /baselineGlBalanceCents:\s*bsResult\.glEndingBalanceCents/,
    );
    expect(src).not.toMatch(
      /baselineGlBalanceCents:\s*bsResult\.endingBalanceCents/,
    );
  });

  it("documents GL-authoritative governance requirements", () => {
    expect(JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS.join(" ")).toContain(
      "ending_balance_cents",
    );
    expect(JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS.join(" ")).toContain(
      "never use TB/prepared",
    );
    expect(describeBsAccountLiabilityCreditEffect()).toContain(
      "GENERAL LEDGER",
    );
  });
});
