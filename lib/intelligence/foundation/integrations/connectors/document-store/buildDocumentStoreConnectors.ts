import {
  buildDocumentStoreConnector,
  type BuildDocumentStoreConnectorInput,
  type SyntheticDocumentStoreConnector,
} from "./buildDocumentStoreConnector";

export interface BuildDocumentStoreConnectorsInput {
  documentStoreConnectors: BuildDocumentStoreConnectorInput[];
}

export interface BuildDocumentStoreConnectorsResult {
  documentStoreConnectors: SyntheticDocumentStoreConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDocumentStoreConnectors(
  input: BuildDocumentStoreConnectorsInput,
): BuildDocumentStoreConnectorsResult {
  const documentStoreConnectors: SyntheticDocumentStoreConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.documentStoreConnectors.forEach((connectorInput, index) => {
    const result = buildDocumentStoreConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.documentStoreConnector) {
      documentStoreConnectors.push(result.documentStoreConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `documentStoreConnector[${index}]: ${warning}`));
  });

  return {
    documentStoreConnectors,
    skippedIndexes,
    warnings,
  };
}
