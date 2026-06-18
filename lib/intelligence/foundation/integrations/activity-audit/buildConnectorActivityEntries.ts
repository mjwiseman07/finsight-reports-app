import {
  buildConnectorActivityChain,
  type BuildConnectorActivityChainInput,
  type SyntheticConnectorActivityChain,
} from "./buildConnectorActivityChain";
import {
  buildConnectorActivityEntry,
  type BuildConnectorActivityEntryInput,
  type SyntheticConnectorActivityEntry,
} from "./buildConnectorActivityEntry";

export interface BuildConnectorActivityEntriesInput {
  connectorActivityEntries: BuildConnectorActivityEntryInput[];
  connectorActivityChain?: BuildConnectorActivityChainInput;
}

export interface BuildConnectorActivityEntriesResult {
  connectorActivityEntries: SyntheticConnectorActivityEntry[];
  connectorActivityChain: SyntheticConnectorActivityChain | null;
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConnectorActivityEntries(
  input: BuildConnectorActivityEntriesInput,
): BuildConnectorActivityEntriesResult {
  const connectorActivityEntries: SyntheticConnectorActivityEntry[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectorActivityEntries.forEach((entryInput, index) => {
    const result = buildConnectorActivityEntry({
      ...entryInput,
      skippedIndexes: [...(entryInput.skippedIndexes ?? []), index],
    });

    if (result.connectorActivityEntry) {
      connectorActivityEntries.push(result.connectorActivityEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectorActivityEntry[${index}]: ${warning}`));
  });

  if (!input.connectorActivityChain) {
    return {
      connectorActivityEntries,
      connectorActivityChain: null,
      skippedIndexes,
      warnings,
    };
  }

  const chainResult = buildConnectorActivityChain({
    ...input.connectorActivityChain,
    connectorActivityEntries,
  });

  return {
    connectorActivityEntries,
    connectorActivityChain: chainResult.connectorActivityChain,
    skippedIndexes,
    warnings: [
      ...warnings,
      ...chainResult.warnings.map((warning) => `connectorActivityChain: ${warning}`),
    ],
  };
}
