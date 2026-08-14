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
  type ReconcilingItemClass,
  type ReconOutcome,
  type ReconOutcomePolicy,
} from "@/lib/audit-ready/tie-out/recon-model";

/** Explicit permissive policy for tests that exercise clearance paths. */
const permissivePolicy: ReconOutcomePolicy = {
  allowTimingReconciled: true,
  immaterialResidualMaxDollar: 1, // $1
  immaterialResidualMaxPercent: 0.05, // 5%
  immaterialComparison: "tighter_of_both",
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
        : "requires_resolution",
    status: "review",
    ...partial,
  };
}

describe("URM-1 — ReconcilingItemClass is identified-only", () => {
  it("does not include unidentified_residual", () => {
    const classes: ReconcilingItemClass[] = [
      "identified_timing",
      "identified_documented",
      "identified_reclass",
      "identified_error",
    ];
    expect(classes).toHaveLength(4);
    expect(classes).not.toContain("unidentified_residual");
  });
});

describe("URM-1 — cent-exact residual is purely derived", () => {
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

  it("assertCentExactResidual rejects drift when a projected residual is wrong", () => {
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

  it("deriveReconBridge always derives residual (single mathematical source)", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 5000,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 4200,
          clearancePolicy: "immaterial_ok",
          status: "auto_cleared",
        }),
      ],
      policy: permissivePolicy,
    });
    expect(bridge.isCentExact).toBe(true);
    expect(bridge.unidentifiedResidualCents).toBe(800);
    expect(
      bridge.identifiedItemsTotalCents + bridge.unidentifiedResidualCents,
    ).toBe(bridge.grossVarianceCents);
  });

  it("large-value bridge stays cent-exact", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 12_345_678_901,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 12_345_678_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        }),
      ],
      policy: permissivePolicy,
    });
    expect(bridge.unidentifiedResidualCents).toBe(901);
    expect(
      bridge.identifiedItemsTotalCents + bridge.unidentifiedResidualCents,
    ).toBe(bridge.grossVarianceCents);
  });
});

describe("URM-1 — fail-closed default policy", () => {
  it("DEFAULT_RECON_OUTCOME_POLICY grants no clearance authority", () => {
    expect(DEFAULT_RECON_OUTCOME_POLICY.allowTimingReconciled).toBe(false);
    expect(DEFAULT_RECON_OUTCOME_POLICY.immaterialResidualMaxDollar).toBe(0);
    expect(DEFAULT_RECON_OUTCOME_POLICY.immaterialResidualMaxPercent).toBe(0);
  });

  it("timing item does NOT auto reconcile under default policy", () => {
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
      policy: DEFAULT_RECON_OUTCOME_POLICY,
    });
    expect(bridge.unidentifiedResidualCents).toBe(0);
    expect(bridge.reconOutcome).toBe("open_review");
    expect(bridge.legacyTieStatus).toBe("kickout");
  });

  it("1-cent unidentified residual does NOT auto clear under default policy", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 10_001,
      items: [
        item({
          itemClass: "identified_documented",
          amountCents: 10_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        }),
      ],
      policy: DEFAULT_RECON_OUTCOME_POLICY,
    });
    expect(bridge.unidentifiedResidualCents).toBe(1);
    expect(isMaterialUnidentifiedResidual(1, 10_001, DEFAULT_RECON_OUTCOME_POLICY)).toBe(
      true,
    );
    expect(bridge.reconOutcome).toBe("open_material");
    expect(bridge.reconOutcome.startsWith("reconciled_")).toBe(false);
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});

describe("URM-1 — material unidentified never silently clears", () => {
  it("isMaterialUnidentifiedResidual is true above explicit policy", () => {
    expect(
      isMaterialUnidentifiedResidual(50_000, 100_000, permissivePolicy),
    ).toBe(true);
  });

  it("materialUnidentifiedBlocksReconcile is true for material residual", () => {
    expect(
      materialUnidentifiedBlocksReconcile(50_000, 100_000, permissivePolicy),
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
      ],
      policy: permissivePolicy,
    });
    expect(bridge.unidentifiedResidualCents).toBe(90_000);
    expect(bridge.reconOutcome).toBe("open_material");
    expect(bridge.reconOutcome.startsWith("reconciled_")).toBe(false);
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});

describe("URM-1 — explicit policy may grant clearance", () => {
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
      policy: { ...permissivePolicy, allowTimingReconciled: true },
    });
    expect(bridge.unidentifiedResidualCents).toBe(0);
    expect(bridge.reconOutcome).toBe("reconciled_with_timing");
    expect(bridge.legacyTieStatus).toBe("ties");
  });

  it("immaterial residual may reconcile under explicit policy", () => {
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
      policy: permissivePolicy,
    });
    expect(bridge.unidentifiedResidualCents).toBe(50);
    expect(bridge.reconOutcome).toBe("reconciled_immaterial_residual");
    expect(bridge.legacyTieStatus).toBe("ties");
  });

  it("does not silently reconcile timing when explicit policy disallows", () => {
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
      policy: { ...permissivePolicy, allowTimingReconciled: false },
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
      policy: DEFAULT_RECON_OUTCOME_POLICY,
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
      policy: permissivePolicy,
    });
    expect(bridge.reconOutcome).toBe("open_material");
    expect(bridge.unresolvedMaterialCount).toBeGreaterThan(0);
    expect(bridge.legacyTieStatus).toBe("kickout");
  });
});
