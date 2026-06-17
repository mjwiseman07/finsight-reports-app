import {
  buildStaffAuditorRole,
  type BuildStaffAuditorRoleInput,
  type SyntheticStaffAuditorRole,
} from "./buildStaffAuditorRole";

export interface BuildStaffAuditorRolesInput {
  roles: BuildStaffAuditorRoleInput[];
}

export interface BuildStaffAuditorRolesResult {
  staffAuditorRoles: SyntheticStaffAuditorRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildStaffAuditorRoles(input: BuildStaffAuditorRolesInput): BuildStaffAuditorRolesResult {
  const staffAuditorRoles: SyntheticStaffAuditorRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildStaffAuditorRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.staffAuditorRole) {
      staffAuditorRoles.push(result.staffAuditorRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    staffAuditorRoles,
    skippedIndexes,
    warnings,
  };
}
