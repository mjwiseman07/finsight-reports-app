import {
  buildCommandCenterBriefing,
  type BuildCommandCenterBriefingInput,
  type BuildCommandCenterBriefingResult,
  type SyntheticCommandCenterBriefing,
} from "./buildCommandCenterBriefing";

export interface BuildCommandCenterBriefingsInput {
  requests: BuildCommandCenterBriefingInput[];
}

export interface BuildCommandCenterBriefingsResult {
  briefings: SyntheticCommandCenterBriefing[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterBriefingResult[];
}

export function buildCommandCenterBriefings(input: BuildCommandCenterBriefingsInput): BuildCommandCenterBriefingsResult {
  const briefings: SyntheticCommandCenterBriefing[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterBriefingResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      briefings,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterBriefing(request);
    results.push(result);

    if (result.briefing) {
      briefings.push(result.briefing);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    briefings,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
