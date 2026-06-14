import {
  buildControllerKnowledgePackage,
  type BuildControllerKnowledgePackageInput,
  type SyntheticControllerKnowledgePackage,
} from "./buildControllerKnowledgePackage";

export interface BuildControllerKnowledgePackagesInput {
  controllerKnowledgeInputs: BuildControllerKnowledgePackageInput[];
}

export interface BuildControllerKnowledgePackagesResult {
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildControllerKnowledgePackages(
  input: BuildControllerKnowledgePackagesInput,
): BuildControllerKnowledgePackagesResult {
  const controllerKnowledgePackages: SyntheticControllerKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.controllerKnowledgeInputs.forEach((controllerKnowledgeInput, index) => {
    const result = buildControllerKnowledgePackage(controllerKnowledgeInput);

    warnings.push(...result.warnings.map((warning) => `controllerKnowledgeInputs[${index}]: ${warning}`));

    if (result.controllerKnowledgePackage) {
      controllerKnowledgePackages.push(result.controllerKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    controllerKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
