import {
  buildImportTemplate,
  type BuildImportTemplateInput,
  type SyntheticImportTemplate,
} from "./buildImportTemplate";

export interface BuildImportTemplatesInput {
  items: BuildImportTemplateInput[];
}

export interface BuildImportTemplatesResult {
  importTemplates: SyntheticImportTemplate[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildImportTemplates(input: BuildImportTemplatesInput): BuildImportTemplatesResult {
  const importTemplates: SyntheticImportTemplate[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildImportTemplate(item);

    if (result.importTemplate) {
      importTemplates.push(result.importTemplate);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `importTemplates[${index}]: ${warning}`));
  });

  return {
    importTemplates,
    skippedIndexes,
    warnings,
  };
}
