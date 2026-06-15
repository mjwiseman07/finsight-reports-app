import {
  buildExistingCustomerActivation,
  type BuildExistingCustomerActivationInput,
  type SyntheticExistingCustomerActivation,
} from "./buildExistingCustomerActivation";

export interface BuildExistingCustomerActivationsInput {
  items: BuildExistingCustomerActivationInput[];
}

export interface BuildExistingCustomerActivationsResult {
  existingCustomerActivations: SyntheticExistingCustomerActivation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildExistingCustomerActivations(
  input: BuildExistingCustomerActivationsInput,
): BuildExistingCustomerActivationsResult {
  const existingCustomerActivations: SyntheticExistingCustomerActivation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildExistingCustomerActivation(item);

    if (result.existingCustomerActivation) {
      existingCustomerActivations.push(result.existingCustomerActivation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `existingCustomerActivations[${index}]: ${warning}`));
  });

  return {
    existingCustomerActivations,
    skippedIndexes,
    warnings,
  };
}
