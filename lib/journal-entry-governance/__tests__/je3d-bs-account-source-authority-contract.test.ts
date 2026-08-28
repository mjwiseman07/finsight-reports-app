/**
 * Contract tests for proposed BS_ACCOUNT_GL_DELTA expected effect.
 * Does not expand JE_SOURCE_RECON_KINDS.
 */
import { describe, expect, it } from "vitest";
import { JE_SOURCE_RECON_KINDS } from "../types";
import {
  buildBsAccountGlDeltaExpectedEffect,
  describeBsAccountLiabilityCreditEffect,
  JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS,
  PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
} from "../je3d-bs-account-source-authority-contract";

describe("JE-3D BS account source authority contract", () => {
  it("does not expand JE_SOURCE_RECON_KINDS yet", () => {
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

  it("builds liability credit natural-sign delta", () => {
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

  it("rejects Asset classification for cutoff accrual liability effect", () => {
    const result = buildBsAccountGlDeltaExpectedEffect({
      sourceRunId: "run-1",
      qboAccountId: "35",
      classification: "Asset",
      baselineGlBalanceCents: 0,
      creditCents: 100,
    });
    expect(result.ok).toBe(false);
  });

  it("documents governance requirements for future expansion", () => {
    expect(JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS.length).toBeGreaterThan(
      5,
    );
    expect(describeBsAccountLiabilityCreditEffect()).toContain(
      "BS_ACCOUNT_GL_DELTA",
    );
  });
});
