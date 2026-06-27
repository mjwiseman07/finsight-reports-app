import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";

export const RETENTION_STATE_CAPS = { CA: 5, TX: "varies", FL: "tiered" } as const;
export function getStateRetentionCap(ctx: { containsConstructionContractData?: boolean }, state: "CA" | "TX" | "FL") {
  assertContainsConstructionContractData(ctx);
  return RETENTION_STATE_CAPS[state];
}
