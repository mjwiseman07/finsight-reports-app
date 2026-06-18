import {
  buildXeroConnector,
  type BuildXeroConnectorInput,
  type SyntheticXeroConnector,
} from "./buildXeroConnector";

export interface BuildXeroConnectorsInput {
  xeroConnectors: BuildXeroConnectorInput[];
}

export interface BuildXeroConnectorsResult {
  xeroConnectors: SyntheticXeroConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildXeroConnectors(input: BuildXeroConnectorsInput): BuildXeroConnectorsResult {
  const xeroConnectors: SyntheticXeroConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.xeroConnectors.forEach((connectorInput, index) => {
    const result = buildXeroConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.xeroConnector) {
      xeroConnectors.push(result.xeroConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `xeroConnector[${index}]: ${warning}`));
  });

  return {
    xeroConnectors,
    skippedIndexes,
    warnings,
  };
}
