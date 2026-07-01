import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import {
  buildFundAccountingEmitterInput,
  hasBrokerageInput,
  hasDerivativesInput,
  hasPortfolioTurnoverInput,
  hasTopHoldingsInput,
} from "./types";
import * as usNav from "./usgaap/navPerShareRollforward";
import * as usExpense from "./usgaap/expenseRatioDisclosure";
import * as usSchedule from "./usgaap/investmentScheduleSummary";
import * as usGains from "./usgaap/realizedUnrealizedGains";
import * as usTop from "./usgaap/topHoldingsDisclosure";
import * as usDerivatives from "./usgaap/derivativesScheduleDisclosure";
import * as usBrokerage from "./usgaap/brokerageCommissionDisclosure";
import * as usTurnover from "./usgaap/portfolioTurnoverDisclosure";
import * as ifrsNav from "./ifrs/navPerShareDisclosure";
import * as ifrsExpense from "./ifrs/expenseRatioDisclosure";
import * as ifrsSchedule from "./ifrs/investmentScheduleSummary";
import * as ifrsGains from "./ifrs/realizedUnrealizedGains";
import * as ifrsTop from "./ifrs/topHoldingsDisclosure";
import * as ifrsDerivatives from "./ifrs/derivativesScheduleDisclosure";
import * as ifrsBrokerage from "./ifrs/brokerageCommissionDisclosure";

export interface FundAccountingRouterOutput {
  framework: RouterFramework;
  results: EmitterResult[];
  augmentedNarratives: string[];
}

function wrapEmit(emitterId: string, emitterPath: string, fn: () => EmitterResult): EmitterResult {
  try {
    return fn();
  } catch (error) {
    if (error instanceof MissingDisclosureInputError) {
      return {
        emitterId,
        emitterPath,
        lines: [],
        status: "fail-closed",
        failureReason: error.message,
      };
    }
    throw error;
  }
}

function runUSGAAPLane(input: ReturnType<typeof buildFundAccountingEmitterInput>): EmitterResult[] {
  const { extracted } = input;
  const results: EmitterResult[] = [
    wrapEmit("nav-computation", usNav.EMITTER_PATH, () => usNav.emitNavPerShareRollforward(input)),
    wrapEmit("expense-ratio", usExpense.EMITTER_PATH, () => usExpense.emitExpenseRatioDisclosure(input)),
    wrapEmit("portfolio-composition", usSchedule.EMITTER_PATH, () =>
      usSchedule.emitInvestmentScheduleSummary(input),
    ),
    wrapEmit("realized-unrealized-gains", usGains.EMITTER_PATH, () =>
      usGains.emitRealizedUnrealizedGains(input),
    ),
  ];

  if (hasTopHoldingsInput(extracted)) {
    results.push(
      wrapEmit("top-holdings-disclosure", usTop.EMITTER_PATH, () => usTop.emitTopHoldingsDisclosure(input)),
    );
  }
  if (hasDerivativesInput(extracted)) {
    results.push(
      wrapEmit("derivatives-schedule-disclosure", usDerivatives.EMITTER_PATH, () =>
        usDerivatives.emitDerivativesScheduleDisclosure(input),
      ),
    );
  }
  if (hasBrokerageInput(extracted)) {
    results.push(
      wrapEmit("brokerage-commission-disclosure", usBrokerage.EMITTER_PATH, () =>
        usBrokerage.emitBrokerageCommissionDisclosure(input),
      ),
    );
  }
  if (hasPortfolioTurnoverInput(extracted)) {
    results.push(
      wrapEmit("portfolio-turnover-disclosure", usTurnover.EMITTER_PATH, () =>
        usTurnover.emitPortfolioTurnoverDisclosure(input),
      ),
    );
  }

  return results;
}

function runIFRSLane(input: ReturnType<typeof buildFundAccountingEmitterInput>): EmitterResult[] {
  const { extracted } = input;
  const results: EmitterResult[] = [
    wrapEmit("nav-computation", ifrsNav.EMITTER_PATH, () => ifrsNav.emitNavPerShareDisclosure(input)),
    wrapEmit("expense-ratio", ifrsExpense.EMITTER_PATH, () => ifrsExpense.emitExpenseRatioDisclosure(input)),
    wrapEmit("portfolio-composition", ifrsSchedule.EMITTER_PATH, () =>
      ifrsSchedule.emitInvestmentScheduleSummary(input),
    ),
    wrapEmit("realized-unrealized-gains", ifrsGains.EMITTER_PATH, () =>
      ifrsGains.emitRealizedUnrealizedGains(input),
    ),
  ];

  if (hasTopHoldingsInput(extracted)) {
    results.push(
      wrapEmit("top-holdings-disclosure", ifrsTop.EMITTER_PATH, () => ifrsTop.emitTopHoldingsDisclosure(input)),
    );
  }
  if (hasDerivativesInput(extracted)) {
    results.push(
      wrapEmit("derivatives-schedule-disclosure", ifrsDerivatives.EMITTER_PATH, () =>
        ifrsDerivatives.emitDerivativesScheduleDisclosure(input),
      ),
    );
  }
  if (hasBrokerageInput(extracted)) {
    results.push(
      wrapEmit("brokerage-commission-disclosure", ifrsBrokerage.EMITTER_PATH, () =>
        ifrsBrokerage.emitBrokerageCommissionDisclosure(input),
      ),
    );
  }

  return results;
}

export function runFundAccountingRouter(extracted: ExtractedFiling): FundAccountingRouterOutput {
  const input = buildFundAccountingEmitterInput(extracted);
  const results =
    extracted.framework === "ifrs" ? runIFRSLane(input) : runUSGAAPLane(input);

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

export function fundAccountingLaneOutputText(extracted: ExtractedFiling, lane: "us-gaap" | "ifrs"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ifrs" ? "ifrs" : "us-gaap",
    rawFrameworkSignals: lane === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
  const router = runFundAccountingRouter(clone);
  const segment = lane === "ifrs" ? "/fund-accounting/ifrs/" : "/fund-accounting/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
