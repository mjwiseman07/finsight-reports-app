import {
  buildActionHandoffPackage,
  type BuildActionHandoffPackageInput,
  type Phase39ExecutionHandoff,
  type SyntheticActionHandoffPackage,
} from "./buildActionHandoffPackage";

export interface BuildActionHandoffPackagesInput {
  items: BuildActionHandoffPackageInput[];
}

export interface BuildActionHandoffPackagesResult {
  actionHandoffPackages: SyntheticActionHandoffPackage[];
  phase39ExecutionHandoffs: Phase39ExecutionHandoff[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildActionHandoffPackages(input: BuildActionHandoffPackagesInput): BuildActionHandoffPackagesResult {
  const actionHandoffPackages: SyntheticActionHandoffPackage[] = [];
  const phase39ExecutionHandoffs: Phase39ExecutionHandoff[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildActionHandoffPackage(item);

    if (result.actionHandoffPackage) {
      actionHandoffPackages.push(result.actionHandoffPackage);
    }

    if (result.phase39ExecutionHandoff) {
      phase39ExecutionHandoffs.push(result.phase39ExecutionHandoff);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `actionHandoffPackages[${index}]: ${warning}`));
  });

  return {
    actionHandoffPackages,
    phase39ExecutionHandoffs,
    skippedIndexes,
    warnings,
  };
}
