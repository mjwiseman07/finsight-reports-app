import {
  buildOrganizationalMemoryArchive,
  type BuildOrganizationalMemoryArchiveInput,
  type SyntheticOrganizationalMemoryArchive,
} from "./buildOrganizationalMemoryArchive";

export interface BuildOrganizationalMemoryArchivesInput {
  archiveInputs: BuildOrganizationalMemoryArchiveInput[];
}

export interface BuildOrganizationalMemoryArchivesResult {
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalMemoryArchives(input: BuildOrganizationalMemoryArchivesInput): BuildOrganizationalMemoryArchivesResult {
  const organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.archiveInputs.forEach((archiveInput, index) => {
    const result = buildOrganizationalMemoryArchive(archiveInput);

    warnings.push(...result.warnings.map((warning) => `archiveInputs[${index}]: ${warning}`));

    if (result.organizationalMemoryArchive) {
      organizationalMemoryArchives.push(result.organizationalMemoryArchive);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    organizationalMemoryArchives,
    skippedIndexes,
    warnings,
  };
}
