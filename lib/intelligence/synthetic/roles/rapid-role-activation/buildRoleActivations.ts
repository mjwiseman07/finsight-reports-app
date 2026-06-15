import {
  buildRoleActivation,
  type BuildRoleActivationInput,
  type SyntheticRoleActivation,
} from "./buildRoleActivation";

export interface BuildRoleActivationsInput {
  items: BuildRoleActivationInput[];
}

export interface BuildRoleActivationsResult {
  roleActivations: SyntheticRoleActivation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleActivations(input: BuildRoleActivationsInput): BuildRoleActivationsResult {
  const roleActivations: SyntheticRoleActivation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleActivation(item);

    if (result.roleActivation) {
      roleActivations.push(result.roleActivation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleActivations[${index}]: ${warning}`));
  });

  return {
    roleActivations,
    skippedIndexes,
    warnings,
  };
}
