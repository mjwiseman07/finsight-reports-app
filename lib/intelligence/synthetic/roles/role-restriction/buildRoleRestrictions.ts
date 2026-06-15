import {
  buildRoleRestriction,
  type BuildRoleRestrictionInput,
  type SyntheticRoleRestriction,
} from "./buildRoleRestriction";

export interface BuildRoleRestrictionsInput {
  items: BuildRoleRestrictionInput[];
}

export interface BuildRoleRestrictionsResult {
  roleRestrictions: SyntheticRoleRestriction[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleRestrictions(input: BuildRoleRestrictionsInput): BuildRoleRestrictionsResult {
  const roleRestrictions: SyntheticRoleRestriction[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleRestriction(item);

    if (result.roleRestriction) {
      roleRestrictions.push(result.roleRestriction);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleRestrictions[${index}]: ${warning}`));
  });

  return {
    roleRestrictions,
    skippedIndexes,
    warnings,
  };
}
