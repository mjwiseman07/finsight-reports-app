import {
  buildOrganizationalMethodologyArchive,
  type BuildOrganizationalMethodologyArchiveInput,
  type SyntheticOrganizationalMethodologyArchive,
} from "./buildOrganizationalMethodologyArchive";

export interface BuildOrganizationalMethodologyArchivesInput {
  archives: BuildOrganizationalMethodologyArchiveInput[];
}

export interface BuildOrganizationalMethodologyArchivesResult {
  organizationalMethodologyArchives: SyntheticOrganizationalMethodologyArchive[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalMethodologyArchives(
  input: BuildOrganizationalMethodologyArchivesInput,
): BuildOrganizationalMethodologyArchivesResult {
  const organizationalMethodologyArchives: SyntheticOrganizationalMethodologyArchive[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.archives.forEach((archiveInput, index) => {
    const result = buildOrganizationalMethodologyArchive(archiveInput);

    warnings.push(...result.warnings.map((warning) => `archives[${index}]: ${warning}`));

    if (result.organizationalMethodologyArchive) {
      organizationalMethodologyArchives.push(result.organizationalMethodologyArchive);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    organizationalMethodologyArchives,
    skippedIndexes,
    warnings,
  };
}
