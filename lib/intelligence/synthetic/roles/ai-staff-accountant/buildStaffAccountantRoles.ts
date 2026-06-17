import {
  buildStaffAccountantRole,
  type BuildStaffAccountantRoleInput,
  type SyntheticStaffAccountantRole,
} from "./buildStaffAccountantRole";

export interface BuildStaffAccountantRolesInput {
  roles: BuildStaffAccountantRoleInput[];
}

export interface BuildStaffAccountantRolesResult {
  staffAccountantRoles: SyntheticStaffAccountantRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildStaffAccountantRoles(input: BuildStaffAccountantRolesInput): BuildStaffAccountantRolesResult {
  const staffAccountantRoles: SyntheticStaffAccountantRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildStaffAccountantRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.staffAccountantRole) {
      staffAccountantRoles.push(result.staffAccountantRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    staffAccountantRoles,
    skippedIndexes,
    warnings,
  };
}
