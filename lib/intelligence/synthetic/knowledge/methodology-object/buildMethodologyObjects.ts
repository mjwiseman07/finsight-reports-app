import {
  buildMethodologyObject,
  type BuildMethodologyObjectInput,
  type SyntheticMethodologyObject,
} from "./buildMethodologyObject";

export interface BuildMethodologyObjectsInput {
  methodologyInputs: BuildMethodologyObjectInput[];
}

export interface BuildMethodologyObjectsResult {
  methodologyObjects: SyntheticMethodologyObject[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMethodologyObjects(input: BuildMethodologyObjectsInput): BuildMethodologyObjectsResult {
  const methodologyObjects: SyntheticMethodologyObject[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.methodologyInputs.forEach((methodologyInput, index) => {
    const result = buildMethodologyObject(methodologyInput);

    warnings.push(...result.warnings.map((warning) => `methodologyInputs[${index}]: ${warning}`));

    if (result.methodologyObject) {
      methodologyObjects.push(result.methodologyObject);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    methodologyObjects,
    skippedIndexes,
    warnings,
  };
}
