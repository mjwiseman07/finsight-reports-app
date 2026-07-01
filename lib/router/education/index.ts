import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import {
  buildEducationEmitterInput,
  isInternationalPublic,
} from "./types";
import * as usTuition from "./usgaap/tuitionRevenueDisclosure";
import * as usContributions from "./usgaap/contributionsGrantsDisclosure";
import * as usEndowment from "./usgaap/endowmentNetAssetClassification";
import * as usFunctional from "./usgaap/functionalExpenseAllocation";
import * as usTitleIv from "./usgaap/titleIvCompositeScore";
import * as usRestricted from "./usgaap/restrictedUnrestrictedNetAssets";
import * as usAuxiliary from "./usgaap/auxiliaryEnterprisesDisclosure";
import * as ipsasNonExchange from "./ipsas/nonExchangeRevenueDisclosure";

export interface EducationRouterOutput {
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

function runUSGAAPLane(input: ReturnType<typeof buildEducationEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("tuition-revenue-disclosure", usTuition.EMITTER_PATH, () =>
      usTuition.emitTuitionRevenueDisclosure(input),
    ),
    wrapEmit("contributions-grants-disclosure", usContributions.EMITTER_PATH, () =>
      usContributions.emitContributionsGrantsDisclosure(input),
    ),
    wrapEmit("endowment-net-asset-classification", usEndowment.EMITTER_PATH, () =>
      usEndowment.emitEndowmentNetAssetClassification(input),
    ),
    wrapEmit("functional-expense-allocation", usFunctional.EMITTER_PATH, () =>
      usFunctional.emitFunctionalExpenseAllocation(input),
    ),
    wrapEmit("title-iv-composite-score", usTitleIv.EMITTER_PATH, () =>
      usTitleIv.emitTitleIvCompositeScore(input),
    ),
    wrapEmit("restricted-unrestricted-net-assets", usRestricted.EMITTER_PATH, () =>
      usRestricted.emitRestrictedUnrestrictedNetAssets(input),
    ),
    wrapEmit("auxiliary-enterprises-disclosure", usAuxiliary.EMITTER_PATH, () =>
      usAuxiliary.emitAuxiliaryEnterprisesDisclosure(input),
    ),
  ];
}

export function runEducationRouter(extracted: ExtractedFiling): EducationRouterOutput {
  const input = buildEducationEmitterInput(extracted);
  const results = runUSGAAPLane(input);

  if (isInternationalPublic(extracted)) {
    results.push(
      wrapEmit("ipsas-non-exchange-revenue", ipsasNonExchange.EMITTER_PATH, () =>
        ipsasNonExchange.emitNonExchangeRevenueDisclosure(input),
      ),
    );
  }

  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
  ];

  return { framework: extracted.framework, results, augmentedNarratives };
}

export function emitterSatisfiesAssertion(
  results: EmitterResult[],
  assertionId: string,
): { satisfied: boolean; emitterPath?: string; citation?: string } {
  for (const result of results) {
    if (result.status !== "satisfied") continue;
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
  const router = runEducationRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
