import {
  buildConnectorVersion,
  type BuildConnectorVersionInput,
  type SyntheticConnectorVersion,
} from "./buildConnectorVersion";

export interface BuildConnectorVersionsInput {
  connectorVersions: BuildConnectorVersionInput[];
}

export interface BuildConnectorVersionsResult {
  connectorVersions: SyntheticConnectorVersion[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConnectorVersions(input: BuildConnectorVersionsInput): BuildConnectorVersionsResult {
  const connectorVersions: SyntheticConnectorVersion[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectorVersions.forEach((versionInput, index) => {
    const result = buildConnectorVersion({
      ...versionInput,
      skippedIndexes: [...(versionInput.skippedIndexes ?? []), index],
    });

    if (result.connectorVersion) {
      connectorVersions.push(result.connectorVersion);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectorVersion[${index}]: ${warning}`));
  });

  return {
    connectorVersions,
    skippedIndexes,
    warnings,
  };
}
