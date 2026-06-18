import {
  buildDynamicsConnector,
  type BuildDynamicsConnectorInput,
  type SyntheticDynamicsConnector,
} from "./buildDynamicsConnector";

export interface BuildDynamicsConnectorsInput {
  dynamicsConnectors: BuildDynamicsConnectorInput[];
}

export interface BuildDynamicsConnectorsResult {
  dynamicsConnectors: SyntheticDynamicsConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDynamicsConnectors(input: BuildDynamicsConnectorsInput): BuildDynamicsConnectorsResult {
  const dynamicsConnectors: SyntheticDynamicsConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.dynamicsConnectors.forEach((connectorInput, index) => {
    const result = buildDynamicsConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.dynamicsConnector) {
      dynamicsConnectors.push(result.dynamicsConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `dynamicsConnector[${index}]: ${warning}`));
  });

  return {
    dynamicsConnectors,
    skippedIndexes,
    warnings,
  };
}
