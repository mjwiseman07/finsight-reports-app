import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import {
  buildRealEstateEmitterInput,
  isIfrsRealEstate,
  isReit,
} from "./types";
import * as usLessor from "./usgaap/lessorRevenueDisclosure";
import * as usLessee from "./usgaap/lesseeRouDisclosure";
import * as usImpairment from "./usgaap/impairmentHeldAndUsed";
import * as usHeldForSale from "./usgaap/heldForSaleClassification";
import * as usRealEstateSales from "./usgaap/realEstateSalesDisclosure";
import * as usReit from "./usgaap/reitNonGaapMeasures";
import * as usAcquisition from "./usgaap/capRateAcquisitionDisclosure";
import * as ifrsInvestmentProperty from "./ifrs/investmentPropertyFairValue";

export interface RealEstateRouterOutput {
  frameworkLane: string;
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

function runUSGAAPLane(input: ReturnType<typeof buildRealEstateEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("lessor-revenue-disclosure", usLessor.EMITTER_PATH, () =>
      usLessor.emitLessorRevenueDisclosure(input),
    ),
    wrapEmit("lessee-rou-disclosure", usLessee.EMITTER_PATH, () =>
      usLessee.emitLesseeRouDisclosure(input),
    ),
    wrapEmit("impairment-held-and-used", usImpairment.EMITTER_PATH, () =>
      usImpairment.emitImpairmentHeldAndUsed(input),
    ),
    wrapEmit("held-for-sale-classification", usHeldForSale.EMITTER_PATH, () =>
      usHeldForSale.emitHeldForSaleClassification(input),
    ),
    wrapEmit("real-estate-sales-disclosure", usRealEstateSales.EMITTER_PATH, () =>
      usRealEstateSales.emitRealEstateSalesDisclosure(input),
    ),
    wrapEmit("cap-rate-acquisition-disclosure", usAcquisition.EMITTER_PATH, () =>
      usAcquisition.emitCapRateAcquisitionDisclosure(input),
    ),
  ];
}

export function runRealEstateRouter(extracted: ExtractedFiling): RealEstateRouterOutput {
  const input = buildRealEstateEmitterInput(extracted);
  const results = runUSGAAPLane(input);

  if (isReit(extracted)) {
    results.push(
      wrapEmit("reit-non-gaap-measures", usReit.EMITTER_PATH, () =>
        usReit.emitReitNonGaapMeasures(input),
      ),
    );
  }

  if (isIfrsRealEstate(extracted)) {
    results.push(
      wrapEmit("investment-property-fair-value", ifrsInvestmentProperty.EMITTER_PATH, () =>
        ifrsInvestmentProperty.emitInvestmentPropertyFairValue(input),
      ),
    );
  }

  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
  ];

  return { frameworkLane: extracted.framework, results, augmentedNarratives };
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
  const router = runRealEstateRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
