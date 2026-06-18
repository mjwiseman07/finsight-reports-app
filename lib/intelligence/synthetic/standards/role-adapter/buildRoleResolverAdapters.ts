import {
  buildRoleResolverAdapter,
  type BuildRoleResolverAdapterInput,
  type SyntheticRoleResolverAdapter,
} from "./buildRoleResolverAdapter";

export interface BuildRoleResolverAdaptersInput {
  roleResolverAdapters: BuildRoleResolverAdapterInput[];
}

export interface BuildRoleResolverAdaptersResult {
  roleResolverAdapters: SyntheticRoleResolverAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleResolverAdapters(
  input: BuildRoleResolverAdaptersInput,
): BuildRoleResolverAdaptersResult {
  const roleResolverAdapters: SyntheticRoleResolverAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roleResolverAdapters.forEach((adapterInput, index) => {
    const result = buildRoleResolverAdapter({
      ...adapterInput,
      skippedIndexes: [...(adapterInput.skippedIndexes ?? []), index],
    });

    if (result.roleResolverAdapter) {
      roleResolverAdapters.push(result.roleResolverAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `roleResolverAdapter[${index}]: ${warning}`),
    );
  });

  return {
    roleResolverAdapters,
    skippedIndexes,
    warnings,
  };
}
