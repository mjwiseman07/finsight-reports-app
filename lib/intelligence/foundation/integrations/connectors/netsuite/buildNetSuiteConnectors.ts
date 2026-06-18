import {
  buildNetSuiteConnector,
  type BuildNetSuiteConnectorInput,
  type SyntheticNetSuiteConnector,
} from "./buildNetSuiteConnector";

export interface BuildNetSuiteConnectorsInput {
  netSuiteConnectors: BuildNetSuiteConnectorInput[];
}

export interface BuildNetSuiteConnectorsResult {
  netSuiteConnectors: SyntheticNetSuiteConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildNetSuiteConnectors(input: BuildNetSuiteConnectorsInput): BuildNetSuiteConnectorsResult {
  const netSuiteConnectors: SyntheticNetSuiteConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.netSuiteConnectors.forEach((connectorInput, index) => {
    const result = buildNetSuiteConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.netSuiteConnector) {
      netSuiteConnectors.push(result.netSuiteConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `netSuiteConnector[${index}]: ${warning}`));
  });

  return {
    netSuiteConnectors,
    skippedIndexes,
    warnings,
  };
}
