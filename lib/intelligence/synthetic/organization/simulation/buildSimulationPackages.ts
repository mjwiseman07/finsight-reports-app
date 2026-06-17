import {
  buildSimulationPackage,
  type BuildSimulationPackageInput,
  type SyntheticSimulationPackage,
} from "./buildSimulationPackage";

export interface BuildSimulationPackagesInput {
  simulationPackageInputs?: BuildSimulationPackageInput[];
}

export interface BuildSimulationPackagesResult {
  simulationPackages: SyntheticSimulationPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildSimulationPackages(input: BuildSimulationPackagesInput): BuildSimulationPackagesResult {
  const simulationPackages: SyntheticSimulationPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.simulationPackageInputs).forEach((packageInput, index) => {
    const result = buildSimulationPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `simulationPackage[${index}]: ${warning}`));

    if (result.skipped || !result.simulationPackage) {
      skippedIndexes.push(index);
      return;
    }

    simulationPackages.push(result.simulationPackage);
  });

  return {
    simulationPackages,
    skippedIndexes,
    warnings,
  };
}
