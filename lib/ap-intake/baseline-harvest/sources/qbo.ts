/**
 * QBO adapter — Block 6b COA wiring via governed read-only Account query.
 */
import { getCoaForFirmClient } from "@/lib/pulse-je/coa-cache";
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
  async fetchChartOfAccounts(ctx: {
    firmClientId: string;
  }): Promise<HarvestedCoaRow[]> {
    void this.actorUserId;
    const coa = await getCoaForFirmClient(ctx.firmClientId, { forceRefresh: true });
    return coa.accounts.map((account) => ({
      externalAccountId: account.qbo_id,
      accountNumber: null,
      accountName: account.name || account.fully_qualified_name,
      accountType: account.account_type || null,
      accountSubtype: account.account_sub_type || null,
      active: account.active,
    }));
  }
}
