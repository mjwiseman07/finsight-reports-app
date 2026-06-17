import {
  buildOrganizationalTwin,
  type BuildOrganizationalTwinInput,
  type SyntheticOrganizationalTwin,
} from "./buildOrganizationalTwin";

export interface BuildOrganizationalTwinsInput {
  organizationalTwinInputs?: BuildOrganizationalTwinInput[];
}

export interface BuildOrganizationalTwinsResult {
  organizationalTwins: SyntheticOrganizationalTwin[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildOrganizationalTwins(input: BuildOrganizationalTwinsInput): BuildOrganizationalTwinsResult {
  const organizationalTwins: SyntheticOrganizationalTwin[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.organizationalTwinInputs).forEach((twinInput, index) => {
    const result = buildOrganizationalTwin(twinInput);

    warnings.push(...result.warnings.map((warning) => `organizationalTwin[${index}]: ${warning}`));

    if (result.skipped || !result.organizationalTwin) {
      skippedIndexes.push(index);
      return;
    }

    organizationalTwins.push(result.organizationalTwin);
  });

  return {
    organizationalTwins,
    skippedIndexes,
    warnings,
  };
}
