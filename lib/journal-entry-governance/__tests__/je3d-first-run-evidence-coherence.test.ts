/**
 * JE-3D — First-run evidence coherence (source recon ↔ expected effects).
 */
import { describe, expect, it } from "vitest";
import {
  buildFirstRunEvidenceCoherentExpectedEffects,
  describeFirstRunEvidenceConnection,
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
    expect(result.code).toBe("je_3d_first_run_incoherent_aging_outcome_effect");
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
    expect(result.code).toBe("je_3d_first_run_incoherent_aging_source");
  });

  it("rejects ap_aging RESIDUAL_DELTA for expense ↔ accrued-liability JE", () => {
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: ["recon-ap"],
      expectedEffects: [
        {
          type: "RESIDUAL_DELTA",
          reconKind: "ap_aging",
          expectedDeltaCents: -100,
        },
        {
          type: "ACCOUNT_RECLASS",
          fromAccountId: "15",
          toAccountId: "1150040002",
          amountCents: 100,
        },
      ],
      sourceReconKindsById: new Map([["recon-ap", "ap_aging"]]),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_first_run_incoherent_aging_residual_delta");
  });

  it("rejects ap_aging as source recon for cutoff_accrual", () => {
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: ["recon-ap"],
      expectedEffects: buildFirstRunEvidenceCoherentExpectedEffects({
        expenseAccountId: "15",
        accruedLiabilityAccountId: "1150040002",
      }),
      sourceReconKindsById: new Map([["recon-ap", "ap_aging"]]),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_first_run_incoherent_aging_source");
  });

  it("accepts ACCOUNT_RECLASS-only bundle without aging residual claims", () => {
    const effects = buildFirstRunEvidenceCoherentExpectedEffects({
      expenseAccountId: "15",
      accruedLiabilityAccountId: "1150040002",
    });
    expect(effects).toEqual([
      {
        type: "ACCOUNT_RECLASS",
        fromAccountId: "15",
        toAccountId: "1150040002",
        amountCents: 100,
      },
    ]);
    const result = validateFirstRunEvidenceCoherence({
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      sourceReconRunIds: [],
      expectedEffects: effects,
    });
    expect(result.ok).toBe(true);
    expect(describeFirstRunEvidenceConnection()).toContain(
      "must not claim AR/AP aging residual reduction",
    );
  });
});
