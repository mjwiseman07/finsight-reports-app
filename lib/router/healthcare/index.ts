import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { buildHealthcareEmitterInput } from "./types";
import * as usChna from "./usgaap/chnaCycleDisclosure";
import * as usCommunityBenefit from "./usgaap/communityBenefitReport";
import * as ifrsCommunityBenefit from "./ifrs/communityBenefitPurposeDisclosure";

export interface HealthcareRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
}

export function runHealthcareRouter(extracted: ExtractedFiling): HealthcareRouterOutput {
  const input = buildHealthcareEmitterInput(extracted);
  const results =
    extracted.framework === "ifrs"
      ? [ifrsCommunityBenefit.emitCommunityBenefitPurposeDisclosure(input)]
      : [usChna.emitChnaCycleDisclosure(input), usCommunityBenefit.emitCommunityBenefitReport(input)];

  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((result) =>
      result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
    ),
  ];

  return { framework: extracted.framework, results, augmentedNarratives };
}

export function emitterSatisfiesAssertion(
  results: EmitterResult[],
  assertionId: string,
): { satisfied: boolean; emitterPath?: string; citation?: string } {
  for (const result of results) {
    if (result.status !== "satisfied") {
      continue;
    }
    const line = result.lines.find((entry) => entry.assertionId === assertionId);
    if (line) {
      return {
        satisfied: true,
        emitterPath: result.emitterPath,
        citation: citationResolved(line.citation),
      };
    }
  }
  return { satisfied: false };
}

export function withRouterNarratives(extracted: ExtractedFiling): ExtractedFiling {
  const router = runHealthcareRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function ifrsHealthcareEmitterOutputText(extracted: ExtractedFiling): string {
  const router = runHealthcareRouter(extracted);
  return router.results
    .filter((result) => result.emitterPath.includes("/healthcare/ifrs/"))
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
