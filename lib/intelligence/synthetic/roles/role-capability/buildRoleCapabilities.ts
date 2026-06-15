import {
  buildRoleCapability,
  type BuildRoleCapabilityInput,
  type SyntheticRoleCapability,
} from "./buildRoleCapability";

export interface BuildRoleCapabilitiesInput {
  items: BuildRoleCapabilityInput[];
}

export interface BuildRoleCapabilitiesResult {
  roleCapabilities: SyntheticRoleCapability[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleCapabilities(input: BuildRoleCapabilitiesInput): BuildRoleCapabilitiesResult {
  const roleCapabilities: SyntheticRoleCapability[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleCapability(item);

    if (result.roleCapability) {
      roleCapabilities.push(result.roleCapability);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleCapabilities[${index}]: ${warning}`));
  });

  return {
    roleCapabilities,
    skippedIndexes,
    warnings,
  };
}
