import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { buildConstructionEmitterInput } from "./types";
import * as usPoc from "./usgaap/pocMethodDisclosure";
import * as usBalances from "./usgaap/contractBalanceRollforward";
import * as usCost from "./usgaap/costToCostInputMeasure";
import * as usDisagg from "./usgaap/revenueDisaggregation";
import * as ifrsPoc from "./ifrs/pocMethodDisclosure";
import * as ifrsBalances from "./ifrs/contractBalanceRollforward";
import * as ifrsInput from "./ifrs/inputMeasureJustification";
import * as ifrsDisagg from "./ifrs/revenueDisaggregation";

export interface ConstructionRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
}

export function runConstructionRouter(extracted: ExtractedFiling): ConstructionRouterOutput {
  const input = buildConstructionEmitterInput(extracted);
  const results =
    extracted.framework === "ifrs"
      ? [
          ifrsPoc.emitPocMethodDisclosure(input),
          ifrsBalances.emitContractBalanceRollforward(input),
          ifrsInput.emitInputMeasureJustification(input),
          ifrsDisagg.emitRevenueDisaggregation(input),
        ]
      : [
          usPoc.emitPocMethodDisclosure(input),
          usBalances.emitContractBalanceRollforward(input),
          usCost.emitCostToCostInputMeasure(input),
          usDisagg.emitRevenueDisaggregation(input),
        ];

  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((result) =>
      result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
    ),
  ];

  return {
    framework: extracted.framework,
    results,
    augmentedNarratives,
  };
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
  const router = runConstructionRouter(extracted);
  return {
    ...extracted,
    narrativeSnippets: router.augmentedNarratives,
  };
}
