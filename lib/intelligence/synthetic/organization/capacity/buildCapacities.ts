import {
  buildCapacity,
  type BuildCapacityInput,
  type SyntheticCapacity,
} from "./buildCapacity";
import {
  buildCapacityPackage,
  type BuildCapacityPackageInput,
  type SyntheticCapacityPackage,
} from "./buildCapacityPackage";

export interface BuildCapacitiesInput {
  capacities: BuildCapacityInput[];
  capacityPackage?: BuildCapacityPackageInput;
}

export interface BuildCapacitiesResult {
  capacities: SyntheticCapacity[];
  capacityPackage: SyntheticCapacityPackage | null;
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCapacities(input: BuildCapacitiesInput): BuildCapacitiesResult {
  const capacities: SyntheticCapacity[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.capacities.forEach((capacityInput, index) => {
    const result = buildCapacity({
      ...capacityInput,
      skippedIndexes: [...(capacityInput.skippedIndexes ?? []), index],
    });

    if (result.capacity) {
      capacities.push(result.capacity);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `capacity[${index}]: ${warning}`));
  });

  if (!input.capacityPackage) {
    return {
      capacities,
      capacityPackage: null,
      skippedIndexes,
      warnings,
    };
  }

  const packageResult = buildCapacityPackage({
    ...input.capacityPackage,
    capacities,
  });

  return {
    capacities,
    capacityPackage: packageResult.capacityPackage,
    skippedIndexes,
    warnings: [
      ...warnings,
      ...packageResult.warnings.map((warning) => `capacityPackage: ${warning}`),
    ],
  };
}
