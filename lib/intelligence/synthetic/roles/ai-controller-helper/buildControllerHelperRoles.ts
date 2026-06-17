import {
  buildControllerHelperRole,
  type BuildControllerHelperRoleInput,
  type SyntheticControllerHelperRole,
} from "./buildControllerHelperRole";

export interface BuildControllerHelperRolesInput {
  roles: BuildControllerHelperRoleInput[];
}

export interface BuildControllerHelperRolesResult {
  controllerHelperRoles: SyntheticControllerHelperRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildControllerHelperRoles(input: BuildControllerHelperRolesInput): BuildControllerHelperRolesResult {
  const controllerHelperRoles: SyntheticControllerHelperRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildControllerHelperRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.controllerHelperRole) {
      controllerHelperRoles.push(result.controllerHelperRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    controllerHelperRoles,
    skippedIndexes,
    warnings,
  };
}
