import { describe, it, expect } from "vitest";
import {
  assertCentExactResidual,
  computeUnidentifiedResidualCents,
  DEFAULT_RECON_OUTCOME_POLICY,
  deriveReconBridge,
  isMaterialUnidentifiedResidual,
  legacyTieStatusFromOutcome,
  materialUnidentifiedBlocksReconcile,
  sumIdentifiedItemsCents,
  type ReconcilingItem,
  type ReconOutcome,
  type ReconOutcomePolicy,
} from "@/lib/audit-ready/tie-out/recon-model";

const basePolicy: ReconOutcomePolicy = {
  ...DEFAULT_RECON_OUTCOME_POLICY,
  immaterialResidualMaxDollar: 1, // $1
  immaterialResidualMaxPercent: 0.05, // 5%
};

function item(
  partial: Pick<ReconcilingItem, "itemClass" | "amountCents"> &
    Partial<ReconcilingItem>,
): ReconcilingItem {
  return {
    runId: "run-1",
    clearancePolicy:
      partial.itemClass === "identified_timing"
        ? "may_reconcile_with_timing"
        : partial.itemClass === "unidentified_residual"
          ? "requires_resolution"
          : "requires_resolution",
    status: "review",
    ...partial,
  };
}

describe("URM-1 — cent-exact residual formula", () => {
  it("Gross − Σ Identified = UnidentifiedResidual", () => {
    const gross = 12_500;
    const identified = sumIdentifiedItemsCents([
      item({ itemClass: "identified_timing", amountCents: 10_000 }),
      item({ itemClass: "identified_documented", amountCents: 2_000 }),
    ]);
    expect(identified).toBe(12_000);
    expect(computeUnidentifiedResidualCents(gross, identified)).toBe(500);
  });

  it("holds for negative gross and mixed signs", () => {
    const gross = -8_000;
    const identified = sumIdentifiedItemsCents([
      item({ itemClass: "identified_reclass", amountCents: -5_000 }),
      item({ itemClass: "identified_timing", amountCents: -2_500 }),
    ]);
    expect(computeUnidentifiedResidualCents(gross, identified)).toBe(-500);
  });

  it("assertCentExactResidual rejects drift", () => {
    const check = assertCentExactResidual({
      grossVarianceCents: 1000,
      identifiedItemsTotalCents: 700,
      unidentifiedResidualCents: 200, // should be 300
    });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.expected).toBe(300);
      expect(check.actual).toBe(200);
    }
  });

  it("deriveReconBridge is cent-exact when residual derived", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 5000,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 5000,
          clearancePolicy: "immaterial_ok",
          status: "auto_cleared",
        }),
      ],
      policy: basePolicy,
    });
    expect(bridge.isCentExact).toBe(true);
    expect(bridge.unidentifiedResidualCents).toBe(0);
    expect(
      bridge.identifiedItemsTotalCents + bridge.unidentifiedResidualCents,
    ).toBe(bridge.grossVarianceCents);
  });

  it("marks failed when explicit residual row breaks the invariant", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 1000,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 400,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        }),
        item({
          itemClass: "unidentified_residual",
          amountCents: 100, // formula expects 600
          clearancePolicy: "requires_resolution",
          status: "kickout",
        }),
      ],
      policy: basePolicy,
    });
    expect(bridge.isCentExact).toBe(false);
    expect(bridge.reconOutcome).toBe("failed");
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});

describe("URM-1 — material unidentified never silently clears", () => {
  it("isMaterialUnidentifiedResidual is true above policy", () => {
    expect(
      isMaterialUnidentifiedResidual(50_000, 100_000, basePolicy),
    ).toBe(true);
  });

  it("materialUnidentifiedBlocksReconcile is true for material residual", () => {
    expect(
      materialUnidentifiedBlocksReconcile(50_000, 100_000, basePolicy),
    ).toBe(true);
  });

  it("deriveReconBridge never returns reconciled_* for material residual", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 100_000,
      items: [
        item({
          itemClass: "identified_timing",
          amountCents: 10_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        }),
        // residual = 90_000 → material
      ],
      policy: basePolicy,
    });
    expect(bridge.unidentifiedResidualCents).toBe(90_000);
    expect(bridge.reconOutcome).toBe("open_material");
    expect(bridge.reconOutcome.startsWith("reconciled_")).toBe(false);
    expect(bridge.legacyTieStatus).toBe("kickout");
  });

  it("immaterial residual may reconcile", () => {
    // $0.50 residual on $100 gross — within $1 and 5%
    const bridge = deriveReconBridge({
      grossVarianceCents: 10_000,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 9_950,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        }),
      ],
      policy: basePolicy,
    });
    expect(bridge.unidentifiedResidualCents).toBe(50);
    expect(bridge.reconOutcome).toBe("reconciled_immaterial_residual");
    expect(bridge.legacyTieStatus).toBe("ties");
  });
});

describe("URM-1 — timing-item policy behavior", () => {
  it("allows reconciled_with_timing when residual is 0 and policy permits", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 25_000,
      items: [
        item({
          itemClass: "identified_timing",
          amountCents: 25_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        }),
      ],
      policy: { ...basePolicy, allowTimingReconciled: true },
    });
    expect(bridge.unidentifiedResidualCents).toBe(0);
    expect(bridge.reconOutcome).toBe("reconciled_with_timing");
    expect(bridge.legacyTieStatus).toBe("ties");
  });

  it("does not silently reconcile timing when policy disallows", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 25_000,
      items: [
        item({
          itemClass: "identified_timing",
          amountCents: 25_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        }),
      ],
      policy: { ...basePolicy, allowTimingReconciled: false },
    });
    expect(bridge.reconOutcome).toBe("open_review");
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});

describe("URM-1 — legacy tieStatus compatibility", () => {
  const cases: Array<[ReconOutcome, "ties" | "kickout"]> = [
    ["reconciled_exact", "ties"],
    ["reconciled_with_timing", "ties"],
    ["reconciled_immaterial_residual", "ties"],
    ["open_review", "kickout"],
    ["open_material", "kickout"],
    ["provider_action_required", "kickout"],
    ["failed", "kickout"],
  ];

  for (const [outcome, expected] of cases) {
    it(`legacyTieStatusFromOutcome(${outcome}) → ${expected}`, () => {
      expect(legacyTieStatusFromOutcome(outcome)).toBe(expected);
    });
  }

  it("exact zero gross → reconciled_exact + ties", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 0,
      items: [],
      policy: basePolicy,
    });
    expect(bridge.reconOutcome).toBe("reconciled_exact");
    expect(bridge.legacyTieStatus).toBe("ties");
  });

  it("unresolved identified_error blocks reconcile", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 1000,
      items: [
        item({
          itemClass: "identified_error",
          amountCents: 1000,
          clearancePolicy: "requires_resolution",
          status: "kickout",
        }),
      ],
      policy: basePolicy,
    });
    expect(bridge.reconOutcome).toBe("open_material");
    expect(bridge.unresolvedMaterialCount).toBeGreaterThan(0);
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});
