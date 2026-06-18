import {
  buildPaymentsConnector,
  type BuildPaymentsConnectorInput,
  type SyntheticPaymentsConnector,
} from "./buildPaymentsConnector";

export interface BuildPaymentsConnectorsInput {
  paymentsConnectors: BuildPaymentsConnectorInput[];
}

export interface BuildPaymentsConnectorsResult {
  paymentsConnectors: SyntheticPaymentsConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPaymentsConnectors(input: BuildPaymentsConnectorsInput): BuildPaymentsConnectorsResult {
  const paymentsConnectors: SyntheticPaymentsConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.paymentsConnectors.forEach((connectorInput, index) => {
    const result = buildPaymentsConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.paymentsConnector) {
      paymentsConnectors.push(result.paymentsConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `paymentsConnector[${index}]: ${warning}`));
  });

  return {
    paymentsConnectors,
    skippedIndexes,
    warnings,
  };
}
