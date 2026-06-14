import {
  buildMemoryPreservationPackage,
  type BuildMemoryPreservationPackageInput,
  type SyntheticMemoryPreservationPackage,
} from "./buildMemoryPreservationPackage";

export interface BuildMemoryPreservationPackagesInput {
  preservationInputs: BuildMemoryPreservationPackageInput[];
}

export interface BuildMemoryPreservationPackagesResult {
  memoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMemoryPreservationPackages(input: BuildMemoryPreservationPackagesInput): BuildMemoryPreservationPackagesResult {
  const memoryPreservationPackages: SyntheticMemoryPreservationPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.preservationInputs.forEach((preservationInput, index) => {
    const result = buildMemoryPreservationPackage(preservationInput);

    warnings.push(...result.warnings.map((warning) => `preservationInputs[${index}]: ${warning}`));

    if (result.memoryPreservationPackage) {
      memoryPreservationPackages.push(result.memoryPreservationPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    memoryPreservationPackages,
    skippedIndexes,
    warnings,
  };
}
