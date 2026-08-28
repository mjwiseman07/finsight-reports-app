/**
 * JE-3D — First-run evidence coherence (source recon ↔ expected effects).
 */
import { describe, expect, it } from "vitest";
import {
  buildFirstRunEvidenceCoherentExpectedEffects,
  describeFirstRunEvidenceConnection,
  FIRST_RUN_SOURCE_RECON_KIND,
  validateFirstRunEvidenceCoherence,
} from "../je3d-first-run-evidence-coherence";
import { FIRST_RUN_REASON_CODE } from "../je3d-first-run-execution-authority";

describe("JE-3D first-run evidence coherence", () => {
  it("rejects ar_aging RECON_OUTCOME_TARGET on cutoff_accrual", () => {
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: ["recon-ar"],
      expectedEffects: [
        {
          type: "RECON_OUTCOME_TARGET",
          reconKind: "ar_aging",
          targetOutcome: "reconciled_exact",
        },
      ],
      sourceReconKindsById: new Map([["recon-ar", "ar_aging"]]),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_first_run_incoherent_ar_aging_effect");
  });

  it("rejects ar_aging source recon on cutoff_accrual", () => {
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: ["recon-ar"],
      expectedEffects: buildFirstRunEvidenceCoherentExpectedEffects({
        expenseAccountId: "15",
        accruedLiabilityAccountId: "1150040002",
      }),
      sourceReconKindsById: new Map([["recon-ar", "ar_aging"]]),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_first_run_incoherent_ar_aging_source");
  });

  it("accepts ap_aging RESIDUAL_DELTA + ACCOUNT_RECLASS bundle", () => {
    const effects = buildFirstRunEvidenceCoherentExpectedEffects({
      expenseAccountId: "15",
      accruedLiabilityAccountId: "1150040002",
    });
    expect(effects[0]).toMatchObject({
      type: "RESIDUAL_DELTA",
      reconKind: FIRST_RUN_SOURCE_RECON_KIND,
      expectedDeltaCents: -100,
    });
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: ["recon-ap"],
      expectedEffects: effects,
      sourceReconKindsById: new Map([["recon-ap", "ap_aging"]]),
    });
    expect(result.ok).toBe(true);
    expect(describeFirstRunEvidenceConnection()).toContain("AP aging");
  });
});
