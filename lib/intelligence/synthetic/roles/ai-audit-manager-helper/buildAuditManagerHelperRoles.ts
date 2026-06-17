import {
  buildAuditManagerHelperRole,
  type BuildAuditManagerHelperRoleInput,
  type SyntheticAuditManagerHelperRole,
} from "./buildAuditManagerHelperRole";

export interface BuildAuditManagerHelperRolesInput {
  roles: BuildAuditManagerHelperRoleInput[];
}

export interface BuildAuditManagerHelperRolesResult {
  auditManagerHelperRoles: SyntheticAuditManagerHelperRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditManagerHelperRoles(input: BuildAuditManagerHelperRolesInput): BuildAuditManagerHelperRolesResult {
  const auditManagerHelperRoles: SyntheticAuditManagerHelperRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildAuditManagerHelperRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.auditManagerHelperRole) {
      auditManagerHelperRoles.push(result.auditManagerHelperRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    auditManagerHelperRoles,
    skippedIndexes,
    warnings,
  };
}
