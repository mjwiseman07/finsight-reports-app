import {
  buildEmailConnector,
  type BuildEmailConnectorInput,
  type SyntheticEmailConnector,
} from "./buildEmailConnector";

export interface BuildEmailConnectorsInput {
  emailConnectors: BuildEmailConnectorInput[];
}

export interface BuildEmailConnectorsResult {
  emailConnectors: SyntheticEmailConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEmailConnectors(input: BuildEmailConnectorsInput): BuildEmailConnectorsResult {
  const emailConnectors: SyntheticEmailConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.emailConnectors.forEach((connectorInput, index) => {
    const result = buildEmailConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.emailConnector) {
      emailConnectors.push(result.emailConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `emailConnector[${index}]: ${warning}`));
  });

  return {
    emailConnectors,
    skippedIndexes,
    warnings,
  };
}
