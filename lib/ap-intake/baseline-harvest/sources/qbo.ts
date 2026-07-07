/**
 * QBO adapter — Block 6a scaffold.
 * Uses existing @/lib/qbo/client if available; otherwise returns empty arrays
 * so orchestrator can complete without failure. Real QBO wiring lands in Block 6b/7
 * when we integrate the multi-ERP router.
 */
import type {
  HarvestSourceAdapter,
  HarvestedVendorRow,
  HarvestedPoRow,
  HarvestedBillRow,
  HarvestedGoodsReceiptRow,
  HarvestedCoaRow,
} from "../types";
export class QboHarvestAdapter implements HarvestSourceAdapter {
  constructor(private readonly actorUserId: string) {}
  async fetchVendors(_ctx: { firmClientId: string }): Promise<HarvestedVendorRow[]> {
    // TODO Block 6b: wire via @/lib/qbo/vendors.list. Empty is safe (harvest completes).
    return [];
  }
  async fetchPurchaseOrders(_ctx: { firmClientId: string }): Promise<HarvestedPoRow[]> {
    return [];
  }
  async fetchBills(_ctx: { firmClientId: string }): Promise<HarvestedBillRow[]> {
    return [];
  }
  async fetchGoodsReceipts(_ctx: { firmClientId: string }): Promise<HarvestedGoodsReceiptRow[]> {
    return [];
  }
  async fetchChartOfAccounts(_ctx: { firmClientId: string }): Promise<HarvestedCoaRow[]> {
    return [];
  }
}
