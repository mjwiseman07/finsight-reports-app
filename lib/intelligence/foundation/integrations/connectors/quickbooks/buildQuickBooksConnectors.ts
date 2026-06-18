import {
  buildQuickBooksConnector,
  type BuildQuickBooksConnectorInput,
  type SyntheticQuickBooksConnector,
} from "./buildQuickBooksConnector";

export interface BuildQuickBooksConnectorsInput {
  quickBooksConnectors: BuildQuickBooksConnectorInput[];
}

export interface BuildQuickBooksConnectorsResult {
  quickBooksConnectors: SyntheticQuickBooksConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildQuickBooksConnectors(input: BuildQuickBooksConnectorsInput): BuildQuickBooksConnectorsResult {
  const quickBooksConnectors: SyntheticQuickBooksConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.quickBooksConnectors.forEach((connectorInput, index) => {
    const result = buildQuickBooksConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.quickBooksConnector) {
      quickBooksConnectors.push(result.quickBooksConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `quickBooksConnector[${index}]: ${warning}`));
  });

  return {
    quickBooksConnectors,
    skippedIndexes,
    warnings,
  };
}
