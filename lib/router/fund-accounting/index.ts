import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { buildFundAccountingEmitterInput } from "./types";
import * as usNav from "./usgaap/navPerShareRollforward";
import * as usExpense from "./usgaap/expenseRatioDisclosure";
import * as usSchedule from "./usgaap/investmentScheduleSummary";
import * as usGains from "./usgaap/realizedUnrealizedGains";
import * as ifrsNav from "./ifrs/navPerShareDisclosure";
import * as ifrsExpense from "./ifrs/expenseRatioDisclosure";
import * as ifrsSchedule from "./ifrs/investmentScheduleSummary";
import * as ifrsGains from "./ifrs/realizedUnrealizedGains";

export interface FundAccountingRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
}

export function runFundAccountingRouter(extracted: ExtractedFiling): FundAccountingRouterOutput {
  const input = buildFundAccountingEmitterInput(extracted);
  const results =
    extracted.framework === "ifrs"
      ? [
          ifrsNav.emitNavPerShareDisclosure(input),
          ifrsExpense.emitExpenseRatioDisclosure(input),
          ifrsSchedule.emitInvestmentScheduleSummary(input),
          ifrsGains.emitRealizedUnrealizedGains(input),
        ]
      : [
          usNav.emitNavPerShareRollforward(input),
          usExpense.emitExpenseRatioDisclosure(input),
          usSchedule.emitInvestmentScheduleSummary(input),
          usGains.emitRealizedUnrealizedGains(input),
        ];

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
  const router = runFundAccountingRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
