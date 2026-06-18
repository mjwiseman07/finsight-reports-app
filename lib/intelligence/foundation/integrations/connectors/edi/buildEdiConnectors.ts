import {
  buildEdiConnector,
  type BuildEdiConnectorInput,
  type SyntheticEdiConnector,
} from "./buildEdiConnector";

export interface BuildEdiConnectorsInput {
  ediConnectors: BuildEdiConnectorInput[];
}

export interface BuildEdiConnectorsResult {
  ediConnectors: SyntheticEdiConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEdiConnectors(input: BuildEdiConnectorsInput): BuildEdiConnectorsResult {
  const ediConnectors: SyntheticEdiConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.ediConnectors.forEach((connectorInput, index) => {
    const result = buildEdiConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.ediConnector) {
      ediConnectors.push(result.ediConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `ediConnector[${index}]: ${warning}`));
  });

  return {
    ediConnectors,
    skippedIndexes,
    warnings,
  };
}
