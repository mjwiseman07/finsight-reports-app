/**
 * Per-vertical audit-channel applicability metadata (VC-5a).
 * Vertical-only channels are NA-by-design outside their owning vertical.
 */
import type { VerifierAuditChannel, VerifierVertical } from "./vertical-registry";
import { VERIFIER_AUDIT_CHANNELS, VERIFIER_VERTICALS } from "./vertical-registry";

export type AuditChannelApplicability = "APPLICABLE" | "NOT_APPLICABLE_BY_DESIGN";

export function resolveAuditChannelApplicability(
  vertical: VerifierVertical,
  channel: VerifierAuditChannel,
): AuditChannelApplicability {
  if (channel === "manufacturing-cost-audit") {
    return vertical === "manufacturing" ? "APPLICABLE" : "NOT_APPLICABLE_BY_DESIGN";
  }
  if (channel === "restricted-net-asset-audit") {
    return vertical === "nonprofit" ? "APPLICABLE" : "NOT_APPLICABLE_BY_DESIGN";
  }
  if (channel === "fund-accounting-audit") {
    return vertical === "fund-accounting" ? "APPLICABLE" : "NOT_APPLICABLE_BY_DESIGN";
  }
  if (channel === "dcaa-audit") {
    return vertical === "govcon" ? "APPLICABLE" : "NOT_APPLICABLE_BY_DESIGN";
  }
  if (channel === "construction-contract-audit") {
    return vertical === "construction" ? "APPLICABLE" : "NOT_APPLICABLE_BY_DESIGN";
  }
  return "APPLICABLE";
}

export function assertVerticalApplicabilityRegistryComplete(): void {
  for (const vertical of VERIFIER_VERTICALS) {
    for (const channel of VERIFIER_AUDIT_CHANNELS) {
      const status = resolveAuditChannelApplicability(vertical, channel);
      if (status !== "APPLICABLE" && status !== "NOT_APPLICABLE_BY_DESIGN") {
        throw new Error(`invalid applicability for ${vertical}/${channel}`);
      }
    }
  }
}

/** RTL sub-segment rows referenced by RTL-2 K-V matrix. */
export const RTL_SUB_SEGMENT_ROWS = ["B", "E", "O", "G", "S"] as const;

/** NPO sub-segment codes referenced by NPO-2 routing. */
export const NPO_SUB_SEGMENT_CODES = ["P", "F", "H", "R", "A1", "A2"] as const;
