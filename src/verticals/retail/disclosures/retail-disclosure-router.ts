import type { RetailInventory, RetailPanelContext } from "../types";

export type RegSkItem = "101" | "103" | "105";

export interface DisclosureSurface {
  regSkItems: ReadonlyArray<RegSkItem>;
  inventoryPolicyFootnote: {
    method: string;
    rimDisclosureInline: boolean;
    lcnrvNote?: string;
    lcmNote?: string;
  };
  shrinkReserveDisclosure?: { amount: number; subSegment: string };
  giftCardLiabilityDisclosure?: { outstandingBalance: number; breakageMethodology: string };
  loyaltyProgramDisclosure?: { deferredRevenue: number; breakageRate: number };
  leaseDisclosure: { rouAsset: number; leaseLiability: number; framework: "ASC842" | "IFRS16" };
}

export function routeRetailDisclosures(
  ctx: RetailPanelContext,
  inventory: RetailInventory,
): DisclosureSurface {
  const regSkItems: ReadonlyArray<RegSkItem> = ["101", "103", "105"];
  const isRim = inventory.basis === "US_GAAP" && inventory.method === "RIM";
  return {
    regSkItems,
    inventoryPolicyFootnote: {
      method: inventory.method,
      rimDisclosureInline: isRim,
      lcnrvNote: inventory.basis === "US_GAAP" && inventory.lcnrvApplies ? "ASU 2015-11 LCNRV" : undefined,
      lcmNote:
        inventory.basis === "US_GAAP" && (inventory.method === "LIFO" || inventory.method === "RIM")
          ? "LCM legacy lane"
          : undefined,
    },
    leaseDisclosure: {
      rouAsset: 0,
      leaseLiability: 0,
      framework: ctx.reportingBasis === "IFRS" ? "IFRS16" : "ASC842",
    },
  };
}
