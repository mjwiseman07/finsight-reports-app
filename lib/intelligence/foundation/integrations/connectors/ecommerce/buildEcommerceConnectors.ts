import {
  buildEcommerceConnector,
  type BuildEcommerceConnectorInput,
  type SyntheticEcommerceConnector,
} from "./buildEcommerceConnector";

export interface BuildEcommerceConnectorsInput {
  ecommerceConnectors: BuildEcommerceConnectorInput[];
}

export interface BuildEcommerceConnectorsResult {
  ecommerceConnectors: SyntheticEcommerceConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEcommerceConnectors(input: BuildEcommerceConnectorsInput): BuildEcommerceConnectorsResult {
  const ecommerceConnectors: SyntheticEcommerceConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.ecommerceConnectors.forEach((connectorInput, index) => {
    const result = buildEcommerceConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.ecommerceConnector) {
      ecommerceConnectors.push(result.ecommerceConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `ecommerceConnector[${index}]: ${warning}`));
  });

  return {
    ecommerceConnectors,
    skippedIndexes,
    warnings,
  };
}
