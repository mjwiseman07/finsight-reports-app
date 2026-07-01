import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { buildLogisticsEmitterInput } from "./types";
import * as usFreight from "./usgaap/freightRevenueOverTime";
import * as usPrincipal from "./usgaap/principalVsAgentDisclosure";
import * as usBillAndHold from "./usgaap/billAndHoldDisclosure";
import * as usFuelHedge from "./usgaap/fuelHedgeAccounting";
import * as usImpairment from "./usgaap/fleetImpairment";
import * as usLeases from "./usgaap/equipmentLeaseAccounting";
import * as usDemurrage from "./usgaap/demurrageDetentionRevenue";
import * as usFuelSurcharge from "./usgaap/fuelSurchargeDisclosure";

export interface LogisticsRouterOutput {
  framework: ExtractedFiling["framework"];
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

function runUSGAAPLane(input: ReturnType<typeof buildLogisticsEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("freight-revenue-over-time", usFreight.EMITTER_PATH, () =>
      usFreight.emitFreightRevenueOverTime(input),
    ),
    wrapEmit("principal-vs-agent-disclosure", usPrincipal.EMITTER_PATH, () =>
      usPrincipal.emitPrincipalVsAgentDisclosure(input),
    ),
    wrapEmit("bill-and-hold-disclosure", usBillAndHold.EMITTER_PATH, () =>
      usBillAndHold.emitBillAndHoldDisclosure(input),
    ),
    wrapEmit("fuel-hedge-accounting", usFuelHedge.EMITTER_PATH, () =>
      usFuelHedge.emitFuelHedgeAccounting(input),
    ),
    wrapEmit("fleet-impairment", usImpairment.EMITTER_PATH, () =>
      usImpairment.emitFleetImpairment(input),
    ),
    wrapEmit("equipment-lease-accounting", usLeases.EMITTER_PATH, () =>
      usLeases.emitEquipmentLeaseAccounting(input),
    ),
    wrapEmit("demurrage-detention-revenue", usDemurrage.EMITTER_PATH, () =>
      usDemurrage.emitDemurrageDetentionRevenue(input),
    ),
    wrapEmit("fuel-surcharge-disclosure", usFuelSurcharge.EMITTER_PATH, () =>
      usFuelSurcharge.emitFuelSurchargeDisclosure(input),
    ),
  ];
}

export function runLogisticsRouter(extracted: ExtractedFiling): LogisticsRouterOutput {
  const input = buildLogisticsEmitterInput(extracted);
  const results = runUSGAAPLane(input);

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
  const router = runLogisticsRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
