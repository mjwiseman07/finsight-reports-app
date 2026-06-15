import {
  buildRoleTemplate,
  type BuildRoleTemplateInput,
  type SyntheticRoleTemplate,
} from "./buildRoleTemplate";

export interface BuildRoleTemplatesInput {
  items: BuildRoleTemplateInput[];
}

export interface BuildRoleTemplatesResult {
  roleTemplates: SyntheticRoleTemplate[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleTemplates(input: BuildRoleTemplatesInput): BuildRoleTemplatesResult {
  const roleTemplates: SyntheticRoleTemplate[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleTemplate(item);

    if (result.roleTemplate) {
      roleTemplates.push(result.roleTemplate);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleTemplates[${index}]: ${warning}`));
  });

  return {
    roleTemplates,
    skippedIndexes,
    warnings,
  };
}
