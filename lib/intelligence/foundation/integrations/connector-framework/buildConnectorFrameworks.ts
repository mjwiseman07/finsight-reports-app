import {
  buildConnectorFramework,
  type BuildConnectorFrameworkInput,
  type SyntheticConnectorFramework,
} from "./buildConnectorFramework";

export interface BuildConnectorFrameworksInput {
  connectorFrameworks: BuildConnectorFrameworkInput[];
}

export interface BuildConnectorFrameworksResult {
  connectorFrameworks: SyntheticConnectorFramework[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConnectorFrameworks(input: BuildConnectorFrameworksInput): BuildConnectorFrameworksResult {
  const connectorFrameworks: SyntheticConnectorFramework[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectorFrameworks.forEach((frameworkInput, index) => {
    const result = buildConnectorFramework({
      ...frameworkInput,
      skippedIndexes: [...(frameworkInput.skippedIndexes ?? []), index],
    });

    if (result.connectorFramework) {
      connectorFrameworks.push(result.connectorFramework);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectorFramework[${index}]: ${warning}`));
  });

  return {
    connectorFrameworks,
    skippedIndexes,
    warnings,
  };
}
