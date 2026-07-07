/**
 * CSV adapter — reads rows previously staged under
 * baseline_csv_uploads/<firm_client_id>/{vendors,purchase_orders,bills,goods_receipts}.csv.
 * Block 6a scaffold returns empty; Block 6b wires actual CSV parsing.
 */
import type {
  HarvestSourceAdapter,
  HarvestedVendorRow,
  HarvestedPoRow,
  HarvestedBillRow,
  HarvestedGoodsReceiptRow,
} from "../types";
export class CsvHarvestAdapter implements HarvestSourceAdapter {
  constructor(private readonly actorUserId: string) {}
  async fetchVendors(_ctx: { firmClientId: string }): Promise<HarvestedVendorRow[]> {
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
}
