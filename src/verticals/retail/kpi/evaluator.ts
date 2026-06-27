import type { RetailPanelContext, RetailSubSegment } from "../types";
import { isKpiApplicableToSubSegment } from "../sub-segment/registry";

export type RetailKpiId =
  | "RTL-K-01"
  | "RTL-K-02"
  | "RTL-K-03"
  | "RTL-K-04"
  | "RTL-K-05"
  | "RTL-K-06"
  | "RTL-K-07"
  | "RTL-K-08"
  | "RTL-K-09"
  | "RTL-K-10"
  | "RTL-K-11"
  | "RTL-K-12"
  | "RTL-K-13"
  | "RTL-K-14"
  | "RTL-K-15"
  | "RTL-K-16";

export const RETAIL_KPI_APPLICABILITY: Record<RetailKpiId, ReadonlyArray<RetailSubSegment>> = {
  "RTL-K-01": ["B", "E", "O", "G", "S"],
  "RTL-K-02": ["B", "O", "S"],
  "RTL-K-03": ["B", "E", "O", "G", "S"],
  "RTL-K-04": ["B", "E", "O", "G", "S"],
  "RTL-K-05": ["B", "E", "O", "G", "S"],
  "RTL-K-06": ["B", "O", "S"],
  "RTL-K-07": ["B", "O", "S"],
  "RTL-K-08": ["E", "O"],
  "RTL-K-09": ["E", "O"],
  "RTL-K-10": ["E", "O"],
  "RTL-K-11": ["G"],
  "RTL-K-12": ["S"],
  "RTL-K-13": ["S"],
  "RTL-K-14": ["B", "E", "O", "G", "S"],
  "RTL-K-15": ["B", "E", "O", "G", "S"],
  "RTL-K-16": ["B", "E", "O", "G", "S"],
};

export type KvStatus = "APPLICABLE" | "NOT_APPLICABLE_BY_DESIGN";

export type RtlKvRow =
  | "B-brick-mortar"
  | "E-ecommerce"
  | "O-omni"
  | "G-grocery"
  | "S-specialty"
  | "GAAP-RIM"
  | "GAAP-LIFO-Retail"
  | "GAAP-FIFO-Retail"
  | "IFRS-Retail"
  | "MultiEntity-Mixed"
  | "MarketplaceAgent";

export type RtlKvChannel =
  | "revenue-recognition"
  | "journal-entry-prep"
  | "reconciliation"
  | "variance-analysis"
  | "close-management"
  | "financial-statements"
  | "audit-support"
  | "fund-accounting-audit"
  | "dcaa-audit"
  | "construction-contract-audit"
  | "restricted-net-asset-audit"
  | "manufacturing-cost-audit";

export const RTL_KV_ROWS: ReadonlyArray<RtlKvRow> = [
  "B-brick-mortar",
  "E-ecommerce",
  "O-omni",
  "G-grocery",
  "S-specialty",
  "GAAP-RIM",
  "GAAP-LIFO-Retail",
  "GAAP-FIFO-Retail",
  "IFRS-Retail",
  "MultiEntity-Mixed",
  "MarketplaceAgent",
];

export const RTL_KV_CHANNELS: ReadonlyArray<RtlKvChannel> = [
  "revenue-recognition",
  "journal-entry-prep",
  "reconciliation",
  "variance-analysis",
  "close-management",
  "financial-statements",
  "audit-support",
  "fund-accounting-audit",
  "dcaa-audit",
  "construction-contract-audit",
  "restricted-net-asset-audit",
  "manufacturing-cost-audit",
];

export const RTL_KV_CELL_COUNT = RTL_KV_ROWS.length * RTL_KV_CHANNELS.length;

const NA_AUDIT_CHANNELS: ReadonlyArray<RtlKvChannel> = [
  "dcaa-audit",
  "construction-contract-audit",
  "fund-accounting-audit",
  "restricted-net-asset-audit",
  "manufacturing-cost-audit",
];

export function evaluateRetailKv(
  row: RtlKvRow,
  channel: RtlKvChannel,
): { status: KvStatus; reason?: string } {
  if (NA_AUDIT_CHANNELS.includes(channel)) {
    return {
      status: "NOT_APPLICABLE_BY_DESIGN",
      reason: `retail excluded from ${channel}`,
    };
  }
  if (row === "MarketplaceAgent" && channel === "variance-analysis") {
    return {
      status: "NOT_APPLICABLE_BY_DESIGN",
      reason: "pure agent — commission-based, no inventory variance",
    };
  }
  return { status: "APPLICABLE" };
}

export function isKpiEnabledForContext(
  kpiId: RetailKpiId,
  ctx: RetailPanelContext,
): boolean {
  return isKpiApplicableToSubSegment(RETAIL_KPI_APPLICABILITY[kpiId], ctx.subSegment);
}
