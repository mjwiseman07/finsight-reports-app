import {
  buildAccountingManagerRole,
  type BuildAccountingManagerRoleInput,
  type SyntheticAccountingManagerRole,
} from "./buildAccountingManagerRole";

export interface BuildAccountingManagerRolesInput {
  roles: BuildAccountingManagerRoleInput[];
}

export interface BuildAccountingManagerRolesResult {
  accountingManagerRoles: SyntheticAccountingManagerRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAccountingManagerRoles(input: BuildAccountingManagerRolesInput): BuildAccountingManagerRolesResult {
  const accountingManagerRoles: SyntheticAccountingManagerRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildAccountingManagerRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.accountingManagerRole) {
      accountingManagerRoles.push(result.accountingManagerRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    accountingManagerRoles,
    skippedIndexes,
    warnings,
  };
}
