import {
  buildCfoHelperRole,
  type BuildCfoHelperRoleInput,
  type SyntheticCfoHelperRole,
} from "./buildCfoHelperRole";

export interface BuildCfoHelperRolesInput {
  roles: BuildCfoHelperRoleInput[];
}

export interface BuildCfoHelperRolesResult {
  cfoHelperRoles: SyntheticCfoHelperRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCfoHelperRoles(input: BuildCfoHelperRolesInput): BuildCfoHelperRolesResult {
  const cfoHelperRoles: SyntheticCfoHelperRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildCfoHelperRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.cfoHelperRole) {
      cfoHelperRoles.push(result.cfoHelperRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    cfoHelperRoles,
    skippedIndexes,
    warnings,
  };
}
