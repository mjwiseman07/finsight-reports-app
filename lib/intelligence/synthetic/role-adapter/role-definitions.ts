/**
 * LOCK-VC C3 — role definitions for vertical-specific audit channels.
 */
export type RolePermission = "READ_DECISIONS" | "AUDIT_TRAIL" | "WRITE_DECISIONS";

export interface RoleDefinition {
  readonly description: string;
  readonly verticalScope: readonly string[];
  readonly permissions: readonly RolePermission[];
  readonly introducedAt: string;
}

export const ROLE_DEFINITIONS: Readonly<Record<string, RoleDefinition>> = Object.freeze({
  "mfg-cost-auditor": Object.freeze({
    description: "Audit access to manufacturing-cost-audit channel",
    verticalScope: Object.freeze(["manufacturing"]),
    permissions: Object.freeze(["READ_DECISIONS", "AUDIT_TRAIL"] as const),
    introducedAt: "LOCK-VC",
  }),
  "restricted-net-asset-auditor": Object.freeze({
    description: "Audit access to restricted-net-asset-audit channel",
    verticalScope: Object.freeze(["nonprofit"]),
    permissions: Object.freeze(["READ_DECISIONS", "AUDIT_TRAIL"] as const),
    introducedAt: "LOCK-VC",
  }),
});
