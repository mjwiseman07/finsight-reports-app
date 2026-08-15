import { describe, it, expect } from "vitest";
import {
  AR_AP_URM_OUTCOME_POLICY,
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
  deriveApIdentifiedItems,
  deriveArIdentifiedItems,
} from "@/lib/audit-ready/tie-out/ar-ap-urm";
import {
  DEFAULT_RECON_OUTCOME_POLICY,
  deriveReconBridge,
  legacyTieStatusFromOutcome,
} from "@/lib/audit-ready/tie-out/recon-model";
import type { LoadedReconBridge } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";

function baseFace(over: Partial<ReconFaceSpec> = {}): ReconFaceSpec {
  return {
    mode: "two_sided",
    leftLabel: "AR Subledger",
    leftAmountCents: 10_000,
    rightLabel: "GL AR Account",
    rightAmountCents: 7_000,
    varianceCents: 3_000,
    toleranceCents: 100,
    tieStatus: "ties",
    sections: [],
    engagementName: "Co",
    engagementId: "eng",
    periodEnd: "2026-07-31",
    tieOutKind: "ar_aging",
    runId: "run",
    generatedAt: "2026-08-01T00:00:00Z",
    ...over,
  };
}

function bridge(over: Partial<LoadedReconBridge> = {}): LoadedReconBridge {
  return {
    runId: "run",
    engagementId: "eng",
    pbcRequestId: "pbc",
    grossVarianceCents: 3_000,
    identifiedItemsTotalCents: 0,
    unidentifiedResidualCents: 3_000,
    reconcilingItemCount: 0,
    unresolvedMaterialCount: 1,
    reconOutcome: "open_material",
    allowsTimingReconciled: false,
    baselineSyncId: null,
    urmBridgePersistedAt: "2026-08-01T00:00:00Z",
    items: [],
    ...over,
  };
}

describe("URM-4 AR/AP identification + policy", () => {
  it("uses explicit fail-closed DEFAULT outcome policy (not measurement thresholds)", () => {
    expect(AR_AP_URM_OUTCOME_POLICY).toEqual(DEFAULT_RECON_OUTCOME_POLICY);
    expect(AR_AP_URM_OUTCOME_POLICY.allowTimingReconciled).toBe(false);
    expect(AR_AP_URM_OUTCOME_POLICY.immaterialResidualMaxDollar).toBe(0);
  });

  it("AR identification returns no items when only aging quality flags exist", () => {
    const items = deriveArIdentifiedItems({
      runId: "run",
      totalsVarianceCents: 3_000,
      customerRows: [
        {
          entityQboId: "c1",
          entityDisplayName: "Credit Cust",
          subledgerAmountCents: -500,
          status: "review",
          classificationReason: "credit-balance customer on AR aging",
        },
      ],
    });
    expect(items).toEqual([]);
  });

  it("AP identification returns no items when only vendor debit flags exist", () => {
    const items = deriveApIdentifiedItems({
      runId: "run",
      totalsVarianceCents: 2_500,
      vendorRows: [
        {
          entityQboId: "v1",
          entityDisplayName: "Debit Vendor",
          subledgerAmountCents: -100,
          status: "review",
          classificationReason: "vendor_debit_balance_review",
        },
      ],
    });
    expect(items).toEqual([]);
  });

  it("AR gross / I / U path: empty items ⇒ U = Gross", () => {
    const gross = 12_345;
    const items = deriveArIdentifiedItems({
      runId: "run",
      totalsVarianceCents: gross,
      customerRows: [],
    });
    const derived = deriveReconBridge({
      grossVarianceCents: gross,
      items,
      policy: AR_AP_URM_OUTCOME_POLICY,
    });
    expect(derived.identifiedItemsTotalCents).toBe(0);
    expect(derived.unidentifiedResidualCents).toBe(gross);
    expect(derived.reconOutcome).toBe("open_material");
  });

  it("AP gross / I / U path: empty items ⇒ U = Gross", () => {
    const gross = -800;
    const items = deriveApIdentifiedItems({
      runId: "run",
      totalsVarianceCents: gross,
      vendorRows: [],
    });
    const derived = deriveReconBridge({
      grossVarianceCents: gross,
      items,
      policy: AR_AP_URM_OUTCOME_POLICY,
    });
    expect(derived.identifiedItemsTotalCents).toBe(0);
    expect(derived.unidentifiedResidualCents).toBe(gross);
    expect(derived.reconOutcome).toBe("open_material");
  });

  it("exact tie: Gross 0 + empty items ⇒ reconciled_exact", () => {
    const derived = deriveReconBridge({
      grossVarianceCents: 0,
      items: deriveArIdentifiedItems({
        runId: "run",
        totalsVarianceCents: 0,
        customerRows: [],
      }),
      policy: AR_AP_URM_OUTCOME_POLICY,
    });
    expect(derived.reconOutcome).toBe("reconciled_exact");
    expect(legacyTieStatusFromOutcome(derived.reconOutcome)).toBe("ties");
  });
});

describe("URM-4 face + reconciling items tab", () => {
  it("applyUrmBridgeToFace overlays residual and maps tieStatus from reconOutcome", () => {
    const face = applyUrmBridgeToFace(baseFace({ tieStatus: "ties" }), bridge());
    expect(face.identifiedItemsTotalCents).toBe(0);
    expect(face.unidentifiedResidualCents).toBe(3_000);
    expect(face.reconOutcome).toBe("open_material");
    expect(face.tieStatus).toBe("kickout");
    expect(face.varianceCents).toBe(3_000);
  });

  it("leaves legacy face untouched when bridge absent", () => {
    const face = applyUrmBridgeToFace(baseFace(), null);
    expect(face.reconOutcome).toBeUndefined();
    expect(face.tieStatus).toBe("ties");
  });

  it("buildReconcilingItemsBackupTab shows derived residual footer (not a persisted item)", () => {
    const tab = buildReconcilingItemsBackupTab(bridge());
    expect(tab.tabName).toBe("Reconciling Items");
    expect(tab.rows).toHaveLength(0);
    expect(tab.subtotalRow?.item_class).toBe("unidentified_residual (derived)");
    expect(tab.subtotalRow?.amount_cents).toBe(3_000);
  });

  it("documents legacy-vs-URM conflict: measurement auto_cleared can still be URM open_material", () => {
    // Measurement classifyVariance may mark a small Gross as auto_cleared → legacy ties.
    // URM with empty identified items + fail-closed policy keeps residual = Gross → open_material.
    const measurementLegacyBadge = "ties"; // mapTotalsToTieStatus("auto_cleared")
    const urm = deriveReconBridge({
      grossVarianceCents: 50, // small but unexplained
      items: [],
      policy: AR_AP_URM_OUTCOME_POLICY,
    });
    expect(urm.reconOutcome).toBe("open_material");
    expect(legacyTieStatusFromOutcome(urm.reconOutcome)).toBe("kickout");
    expect(legacyTieStatusFromOutcome(urm.reconOutcome)).not.toBe(
      measurementLegacyBadge,
    );
  });
});
