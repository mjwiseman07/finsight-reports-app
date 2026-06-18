import {
  buildMultiFrameworkEntity,
  type BuildMultiFrameworkEntityInput,
  type SyntheticMultiFrameworkEntity,
} from "./buildMultiFrameworkEntity";

export interface BuildMultiFrameworkEntitiesInput {
  multiFrameworkEntities: BuildMultiFrameworkEntityInput[];
}

export interface BuildMultiFrameworkEntitiesResult {
  multiFrameworkEntities: SyntheticMultiFrameworkEntity[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMultiFrameworkEntities(
  input: BuildMultiFrameworkEntitiesInput,
): BuildMultiFrameworkEntitiesResult {
  const multiFrameworkEntities: SyntheticMultiFrameworkEntity[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.multiFrameworkEntities.forEach((entityInput, index) => {
    const result = buildMultiFrameworkEntity({
      ...entityInput,
      skippedIndexes: [...(entityInput.skippedIndexes ?? []), index],
    });

    if (result.multiFrameworkEntity) {
      multiFrameworkEntities.push(result.multiFrameworkEntity);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `multiFrameworkEntity[${index}]: ${warning}`));
  });

  return {
    multiFrameworkEntities,
    skippedIndexes,
    warnings,
  };
}
