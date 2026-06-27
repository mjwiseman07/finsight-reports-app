import type { AuditChannelHandler } from "./types";

export const restrictedNetAssetAuditHandler: AuditChannelHandler = {
  channel: "restricted-net-asset-audit",
  status: "reserved-for-NPO-2",
  invoke: () => ({ status: "reserved-for-NPO-2" as const }),
};
