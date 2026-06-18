import {
  buildConnectorDataResidency,
  type BuildConnectorDataResidencyInput,
  type SyntheticConnectorDataResidency,
} from "./buildConnectorDataResidency";

export interface BuildConnectorDataResidenciesInput {
  connectorDataResidencies: BuildConnectorDataResidencyInput[];
}

export interface BuildConnectorDataResidenciesResult {
  connectorDataResidencies: SyntheticConnectorDataResidency[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConnectorDataResidencies(
  input: BuildConnectorDataResidenciesInput,
): BuildConnectorDataResidenciesResult {
  const connectorDataResidencies: SyntheticConnectorDataResidency[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectorDataResidencies.forEach((residencyInput, index) => {
    const result = buildConnectorDataResidency({
      ...residencyInput,
      skippedIndexes: [...(residencyInput.skippedIndexes ?? []), index],
    });

    if (result.connectorDataResidency) {
      connectorDataResidencies.push(result.connectorDataResidency);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectorDataResidency[${index}]: ${warning}`));
  });

  return {
    connectorDataResidencies,
    skippedIndexes,
    warnings,
  };
}
