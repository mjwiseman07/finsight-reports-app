import type { AuditChannelHandler } from "./types";
import type { EntityDoctrineProfile, NpoKvColumn, NpoKvRow } from "../../verticals/nonprofit/types";
import {
  assertNaCellFailClosed,
  isNaByDesign,
  NotApplicableByDesignError,
  resolveKvCell,
} from "../../verticals/nonprofit/kv-matrix";

export { NotApplicableByDesignError };

export interface RestrictedNetAssetAuditContext {
  row: NpoKvRow;
  column: NpoKvColumn;
  doctrine: EntityDoctrineProfile;
}

export const restrictedNetAssetAuditHandler: AuditChannelHandler = {
  channel: "restricted-net-asset-audit",
  status: "structural",
  invoke: () => ({ status: "structural" as const }),
};

export function invokeRestrictedNetAssetAudit(ctx: RestrictedNetAssetAuditContext) {
  if (isNaByDesign(ctx.row, ctx.column)) {
    throw new NotApplicableByDesignError(ctx.row, ctx.column);
  }
  if (!ctx.doctrine.containsRestrictedNetAssetData) {
    throw new Error(
      "restricted-net-asset-audit requires containsRestrictedNetAssetData — fail-closed.",
    );
  }
  return resolveKvCell(ctx.row, ctx.column, ctx.doctrine);
}

export function invokeAuditChannelForCell(ctx: RestrictedNetAssetAuditContext) {
  if (isNaByDesign(ctx.row, ctx.column)) {
    assertNaCellFailClosed(ctx.row, ctx.column);
    return { applicability: "NOT_APPLICABLE_BY_DESIGN" as const };
  }
  return {
    applicability: "APPLICABLE" as const,
    resolution: resolveKvCell(ctx.row, ctx.column, ctx.doctrine),
  };
}

export function honorDoctrineAcrossChannels(doctrine: EntityDoctrineProfile): boolean {
  if (doctrine.containsRestrictedNetAssetData === undefined) {
    throw new Error("containsRestrictedNetAssetData must be explicit — no silent skip.");
  }
  return true;
}
