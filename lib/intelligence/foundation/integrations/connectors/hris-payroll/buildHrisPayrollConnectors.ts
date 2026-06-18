import {
  buildHrisPayrollConnector,
  type BuildHrisPayrollConnectorInput,
  type SyntheticHrisPayrollConnector,
} from "./buildHrisPayrollConnector";

export interface BuildHrisPayrollConnectorsInput {
  hrisPayrollConnectors: BuildHrisPayrollConnectorInput[];
}

export interface BuildHrisPayrollConnectorsResult {
  hrisPayrollConnectors: SyntheticHrisPayrollConnector[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHrisPayrollConnectors(
  input: BuildHrisPayrollConnectorsInput,
): BuildHrisPayrollConnectorsResult {
  const hrisPayrollConnectors: SyntheticHrisPayrollConnector[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.hrisPayrollConnectors.forEach((connectorInput, index) => {
    const result = buildHrisPayrollConnector({
      ...connectorInput,
      skippedIndexes: [...(connectorInput.skippedIndexes ?? []), index],
    });

    if (result.hrisPayrollConnector) {
      hrisPayrollConnectors.push(result.hrisPayrollConnector);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `hrisPayrollConnector[${index}]: ${warning}`));
  });

  return {
    hrisPayrollConnectors,
    skippedIndexes,
    warnings,
  };
}
