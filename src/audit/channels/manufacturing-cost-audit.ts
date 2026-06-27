import type { AuditChannelHandler } from "./types";
import type { MfgKvColumn, MfgKvRow, ReportingBasis } from "../../verticals/manufacturing/types";

export interface ManufacturingCostAuditContext {
  row: MfgKvRow;
  column: MfgKvColumn;
  basis: ReportingBasis;
}

export const manufacturingCostAuditHandler: AuditChannelHandler = {
  channel: "manufacturing-cost-audit",
  status: "structural",
  invoke: () => ({ status: "structural" as const }),
};

export function invokeManufacturingCostAudit(ctx: ManufacturingCostAuditContext) {
  if (ctx.column !== "manufacturing-cost-audit") {
    throw new Error("manufacturing-cost-audit channel mismatch — fail-closed.");
  }
  return {
    channel: "manufacturing-cost-audit" as const,
    row: ctx.row,
    basis: ctx.basis,
    citationAnchors: ["ASC.330-10-35-1B", "IAS.2.9"],
    emitted: true,
  };
}

export function honorRestrictedNetAssetAcrossChannels(
  column: MfgKvColumn,
  containsRestrictedNetAssetData: boolean,
): void {
  if (column === "restricted-net-asset-audit") {
    throw new Error("restricted-net-asset-audit is NA for all MFG rows — fail-closed.");
  }
  if (containsRestrictedNetAssetData === undefined) {
    throw new Error("containsRestrictedNetAssetData must be explicit — no silent skip.");
  }
}
