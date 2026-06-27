/**
 * LOCK-VC C3 — role × audit-channel permission matrix.
 */
import type { VerticalKvAuditChannel } from "../audit/channels/vertical-kv-audit-registry";
import type { RolePermission } from "./role-definitions";

export type PermissionMatrix = Readonly<
  Record<string, Partial<Record<VerticalKvAuditChannel, readonly RolePermission[]>>>
>;

export const PERMISSION_MATRIX: PermissionMatrix = Object.freeze({
  "mfg-cost-auditor": Object.freeze({
    "manufacturing-cost-audit": Object.freeze(["READ_DECISIONS", "AUDIT_TRAIL"] as const),
  }),
  "restricted-net-asset-auditor": Object.freeze({
    "restricted-net-asset-audit": Object.freeze(["READ_DECISIONS", "AUDIT_TRAIL"] as const),
  }),
  "compliance-auditor": Object.freeze({
    "manufacturing-cost-audit": Object.freeze(["READ_DECISIONS"] as const),
    "restricted-net-asset-audit": Object.freeze(["READ_DECISIONS"] as const),
  }),
  controller: Object.freeze({
    "manufacturing-cost-audit": Object.freeze([
      "READ_DECISIONS",
      "AUDIT_TRAIL",
      "WRITE_DECISIONS",
    ] as const),
    "restricted-net-asset-audit": Object.freeze([
      "READ_DECISIONS",
      "AUDIT_TRAIL",
      "WRITE_DECISIONS",
    ] as const),
  }),
});

export function verifyAuditChannelPermissions(
  matrix: PermissionMatrix = PERMISSION_MATRIX,
): { passed: boolean; missing: readonly string[] } {
  const required: ReadonlyArray<[string, VerticalKvAuditChannel]> = [
    ["mfg-cost-auditor", "manufacturing-cost-audit"],
    ["restricted-net-asset-auditor", "restricted-net-asset-audit"],
    ["compliance-auditor", "manufacturing-cost-audit"],
    ["compliance-auditor", "restricted-net-asset-audit"],
  ];
  const missing = required
    .filter(([role, channel]) => !matrix[role]?.[channel])
    .map(([role, channel]) => `${role}→${channel}`);
  return { passed: missing.length === 0, missing };
}
