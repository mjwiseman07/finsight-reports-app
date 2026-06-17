import {
  buildRoleResponse,
  type BuildRoleResponseInput,
  type SyntheticRoleResponse,
} from "./buildRoleResponse";

export interface BuildRoleResponsesInput {
  responses: BuildRoleResponseInput[];
}

export interface BuildRoleResponsesResult {
  roleResponses: SyntheticRoleResponse[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleResponses(input: BuildRoleResponsesInput): BuildRoleResponsesResult {
  const roleResponses: SyntheticRoleResponse[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.responses.forEach((responseInput, index) => {
    const result = buildRoleResponse({
      ...responseInput,
      skippedIndexes: [...(responseInput.skippedIndexes ?? []), index],
    });

    if (result.roleResponse) {
      roleResponses.push(result.roleResponse);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `response[${index}]: ${warning}`));
  });

  return {
    roleResponses,
    skippedIndexes,
    warnings,
  };
}
