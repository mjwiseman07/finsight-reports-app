import { describe, it, expect } from "vitest";
import {
  INVENTORY_FA_URM_OUTCOME_POLICY,
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
  deriveFaIdentifiedItems,
  deriveInventoryIdentifiedItems,
} from "@/lib/audit-ready/tie-out/inventory-fa-urm";
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
    leftLabel: "Inventory Valuation",
    leftAmountCents: 10_000,
    rightLabel: "GL Inventory Account",
    rightAmountCents: 7_000,
    varianceCents: 3_000,
    toleranceCents: 100,
    tieStatus: "ties",
    sections: [],
    engagementName: "Co",
    engagementId: "eng",
    periodEnd: "2026-07-31",
    tieOutKind: "inventory",
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

describe("URM-5 Inventory/FA identification + policy", () => {
  it("uses explicit fail-closed DEFAULT outcome policy (not measurement thresholds)", () => {
    expect(INVENTORY_FA_URM_OUTCOME_POLICY).toEqual(DEFAULT_RECON_OUTCOME_POLICY);
    expect(INVENTORY_FA_URM_OUTCOME_POLICY.allowTimingReconciled).toBe(false);
    expect(INVENTORY_FA_URM_OUTCOME_POLICY.immaterialResidualMaxDollar).toBe(0);
  });

  it("Inventory identification returns no items when only negative qty/value flags exist", () => {
    const items = deriveInventoryIdentifiedItems({
      runId: "run",
      totalsVarianceCents: 3_000,
      itemRows: [
        {
          entityQboId: "i1",
          entityDisplayName: "Neg Widget",
          subledgerAmountCents: -500,
          status: "review",
          classificationReason: "item_negative_qty_on_hand",
        },
      ],
    });
    expect(items).toEqual([]);
  });

  it("FA identification returns no items from cost/accum diagnostics alone", () => {
    const items = deriveFaIdentifiedItems({
      runId: "run",
      totalsVarianceCents: 2_500,
      costVarianceCents: 1_000,
      accumVarianceCents: -1_500,
    });
    expect(items).toEqual([]);
  });

  it("Inventory gross / I / U path: empty items ⇒ U = Gross", () => {
    const gross = 12_345;
    const items = deriveInventoryIdentifiedItems({
      runId: "run",
      totalsVarianceCents: gross,
      itemRows: [],
    });
    const derived = deriveReconBridge({
      grossVarianceCents: gross,
      items,
      policy: INVENTORY_FA_URM_OUTCOME_POLICY,
    });
    expect(derived.identifiedItemsTotalCents).toBe(0);
    expect(derived.unidentifiedResidualCents).toBe(gross);
    expect(derived.reconOutcome).toBe("open_material");
  });

  it("FA gross / I / U path: empty items ⇒ U = Gross", () => {
    const gross = -4_200;
    const items = deriveFaIdentifiedItems({
      runId: "run",
      totalsVarianceCents: gross,
      costVarianceCents: -4_200,
      accumVarianceCents: 0,
    });
    const derived = deriveReconBridge({
      grossVarianceCents: gross,
      items,
      policy: INVENTORY_FA_URM_OUTCOME_POLICY,
    });
    expect(derived.identifiedItemsTotalCents).toBe(0);
    expect(derived.unidentifiedResidualCents).toBe(gross);
    expect(derived.reconOutcome).toBe("open_material");
  });

  it("applyUrmBridgeToFace overlays URM fields and maps outcome to legacy badge", () => {
    const face = applyUrmBridgeToFace(baseFace({ tieStatus: "ties" }), bridge());
    expect(face.identifiedItemsTotalCents).toBe(0);
    expect(face.unidentifiedResidualCents).toBe(3_000);
    expect(face.reconOutcome).toBe("open_material");
    expect(face.providerFamily).toBe("quickbooks");
    expect(face.tieStatus).toBe(legacyTieStatusFromOutcome("open_material"));
  });

  it("applyUrmBridgeToFace leaves pre-URM faces unchanged when bridge outcome is null", () => {
    const face = applyUrmBridgeToFace(
      baseFace({ tieStatus: "ties" }),
      bridge({ reconOutcome: null }),
    );
    expect(face.reconOutcome).toBeUndefined();
    expect(face.tieStatus).toBe("ties");
  });

  it("Reconciling Items tab footer is derived residual, not a persisted item", () => {
    const tab = buildReconcilingItemsBackupTab(bridge());
    expect(tab.tabName).toBe("Reconciling Items");
    expect(tab.rows).toEqual([]);
    expect(tab.subtotalRow?.item_class).toBe("unidentified_residual (derived)");
    expect(tab.subtotalRow?.amount_cents).toBe(3_000);
  });
});
