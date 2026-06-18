import {
  buildCrmConnector,
  type BuildCrmConnectorInput,
  type SyntheticCrmConnector,
} from "./buildCrmConnector";

export interface BuildCrmConnectorsInput {
  crmConnectors: BuildCrmConnectorInput[];
}

export interface BuildCrmConnectorsResult {
  crmConnectors: SyntheticCrmConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrmConnectors(input: BuildCrmConnectorsInput): BuildCrmConnectorsResult {
  const crmConnectors: SyntheticCrmConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.crmConnectors.forEach((connectorInput, index) => {
    const result = buildCrmConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.crmConnector) {
      crmConnectors.push(result.crmConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `crmConnector[${index}]: ${warning}`));
  });

  return {
    crmConnectors,
    skippedIndexes,
    warnings,
  };
}
