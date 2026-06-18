import {
  buildFileBasedConnector,
  type BuildFileBasedConnectorInput,
  type SyntheticFileBasedConnector,
} from "./buildFileBasedConnector";

export interface BuildFileBasedConnectorsInput {
  fileBasedConnectors: BuildFileBasedConnectorInput[];
}

export interface BuildFileBasedConnectorsResult {
  fileBasedConnectors: SyntheticFileBasedConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFileBasedConnectors(
  input: BuildFileBasedConnectorsInput,
): BuildFileBasedConnectorsResult {
  const fileBasedConnectors: SyntheticFileBasedConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.fileBasedConnectors.forEach((connectorInput, index) => {
    const result = buildFileBasedConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.fileBasedConnector) {
      fileBasedConnectors.push(result.fileBasedConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `fileBasedConnector[${index}]: ${warning}`));
  });

  return {
    fileBasedConnectors,
    skippedIndexes,
    warnings,
  };
}
