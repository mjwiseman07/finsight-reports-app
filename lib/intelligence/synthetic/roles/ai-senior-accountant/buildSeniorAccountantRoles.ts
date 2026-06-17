import {
  buildSeniorAccountantRole,
  type BuildSeniorAccountantRoleInput,
  type SyntheticSeniorAccountantRole,
} from "./buildSeniorAccountantRole";

export interface BuildSeniorAccountantRolesInput {
  roles: BuildSeniorAccountantRoleInput[];
}

export interface BuildSeniorAccountantRolesResult {
  seniorAccountantRoles: SyntheticSeniorAccountantRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSeniorAccountantRoles(input: BuildSeniorAccountantRolesInput): BuildSeniorAccountantRolesResult {
  const seniorAccountantRoles: SyntheticSeniorAccountantRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildSeniorAccountantRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.seniorAccountantRole) {
      seniorAccountantRoles.push(result.seniorAccountantRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    seniorAccountantRoles,
    skippedIndexes,
    warnings,
  };
}
