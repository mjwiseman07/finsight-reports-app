import {
  buildBankingConnector,
  type BuildBankingConnectorInput,
  type SyntheticBankingConnector,
} from "./buildBankingConnector";

export interface BuildBankingConnectorsInput {
  bankingConnectors: BuildBankingConnectorInput[];
}

export interface BuildBankingConnectorsResult {
  bankingConnectors: SyntheticBankingConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildBankingConnectors(input: BuildBankingConnectorsInput): BuildBankingConnectorsResult {
  const bankingConnectors: SyntheticBankingConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.bankingConnectors.forEach((connectorInput, index) => {
    const result = buildBankingConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.bankingConnector) {
      bankingConnectors.push(result.bankingConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `bankingConnector[${index}]: ${warning}`));
  });

  return {
    bankingConnectors,
    skippedIndexes,
    warnings,
  };
}
