import {
  buildSageIntacctConnector,
  type BuildSageIntacctConnectorInput,
  type SyntheticSageIntacctConnector,
} from "./buildSageIntacctConnector";

export interface BuildSageIntacctConnectorsInput {
  sageIntacctConnectors: BuildSageIntacctConnectorInput[];
}

export interface BuildSageIntacctConnectorsResult {
  sageIntacctConnectors: SyntheticSageIntacctConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSageIntacctConnectors(
  input: BuildSageIntacctConnectorsInput,
): BuildSageIntacctConnectorsResult {
  const sageIntacctConnectors: SyntheticSageIntacctConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.sageIntacctConnectors.forEach((connectorInput, index) => {
    const result = buildSageIntacctConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.sageIntacctConnector) {
      sageIntacctConnectors.push(result.sageIntacctConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `sageIntacctConnector[${index}]: ${warning}`));
  });

  return {
    sageIntacctConnectors,
    skippedIndexes,
    warnings,
  };
}
