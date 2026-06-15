import {
  buildSimulationPackage,
  type BuildSimulationPackageInput,
  type SyntheticSimulationPackage,
} from "./buildSimulationPackage";

export interface BuildSimulationPackagesInput {
  simulationPackageInputs: BuildSimulationPackageInput[];
}

export interface BuildSimulationPackagesResult {
  simulationPackages: SyntheticSimulationPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSimulationPackages(input: BuildSimulationPackagesInput): BuildSimulationPackagesResult {
  const simulationPackages: SyntheticSimulationPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.simulationPackageInputs.forEach((simulationPackageInput, index) => {
    const result = buildSimulationPackage(simulationPackageInput);

    warnings.push(...result.warnings.map((warning) => `simulationPackageInputs[${index}]: ${warning}`));

    if (result.simulationPackage) {
      simulationPackages.push(result.simulationPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    simulationPackages,
    skippedIndexes,
    warnings,
  };
}
