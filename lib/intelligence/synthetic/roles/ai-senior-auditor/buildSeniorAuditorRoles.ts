import {
  buildSeniorAuditorRole,
  type BuildSeniorAuditorRoleInput,
  type SyntheticSeniorAuditorRole,
} from "./buildSeniorAuditorRole";

export interface BuildSeniorAuditorRolesInput {
  roles: BuildSeniorAuditorRoleInput[];
}

export interface BuildSeniorAuditorRolesResult {
  seniorAuditorRoles: SyntheticSeniorAuditorRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSeniorAuditorRoles(input: BuildSeniorAuditorRolesInput): BuildSeniorAuditorRolesResult {
  const seniorAuditorRoles: SyntheticSeniorAuditorRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildSeniorAuditorRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.seniorAuditorRole) {
      seniorAuditorRoles.push(result.seniorAuditorRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    seniorAuditorRoles,
    skippedIndexes,
    warnings,
  };
}
