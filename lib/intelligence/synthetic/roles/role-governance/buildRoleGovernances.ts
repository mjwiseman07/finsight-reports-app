import {
  buildRoleGovernance,
  type BuildRoleGovernanceInput,
  type SyntheticRoleGovernance,
} from "./buildRoleGovernance";

export interface BuildRoleGovernancesInput {
  items: BuildRoleGovernanceInput[];
}

export interface BuildRoleGovernancesResult {
  roleGovernances: SyntheticRoleGovernance[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleGovernances(input: BuildRoleGovernancesInput): BuildRoleGovernancesResult {
  const roleGovernances: SyntheticRoleGovernance[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleGovernance(item);

    if (result.roleGovernance) {
      roleGovernances.push(result.roleGovernance);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleGovernances[${index}]: ${warning}`));
  });

  return {
    roleGovernances,
    skippedIndexes,
    warnings,
  };
}
