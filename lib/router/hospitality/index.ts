import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import {
  buildHospitalityEmitterInput,
  hasUsaliInput,
  isCasinoOperator,
  isFranchiseOperator,
  isTimeshareOperator,
} from "./types";
import * as usRooms from "./usgaap/roomsRevenueDisclosure";
import * as usLoyalty from "./usgaap/loyaltyMaterialRightDisclosure";
import * as usGiftCards from "./usgaap/giftCardBreakageDisclosure";
import * as usFranchise from "./usgaap/franchiseFeeRevenueDisclosure";
import * as usLeases from "./usgaap/operatingLeaseCommitments";
import * as usCasino from "./usgaap/casinoJackpotAccrual";
import * as usTimeshare from "./usgaap/timeshareRevenueDisclosure";
import * as usUsali from "./usgaap/usaliDepartmentalSchedules";

export interface HospitalityRouterOutput {
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

function runUSGAAPLane(input: ReturnType<typeof buildHospitalityEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("rooms-revenue-disclosure", usRooms.EMITTER_PATH, () =>
      usRooms.emitRoomsRevenueDisclosure(input),
    ),
    wrapEmit("loyalty-material-right-disclosure", usLoyalty.EMITTER_PATH, () =>
      usLoyalty.emitLoyaltyMaterialRightDisclosure(input),
    ),
    wrapEmit("gift-card-breakage-disclosure", usGiftCards.EMITTER_PATH, () =>
      usGiftCards.emitGiftCardBreakageDisclosure(input),
    ),
    wrapEmit("operating-lease-commitments", usLeases.EMITTER_PATH, () =>
      usLeases.emitOperatingLeaseCommitments(input),
    ),
  ];
}

export function runHospitalityRouter(extracted: ExtractedFiling): HospitalityRouterOutput {
  const input = buildHospitalityEmitterInput(extracted);
  const results = runUSGAAPLane(input);

  if (isFranchiseOperator(extracted)) {
    results.push(
      wrapEmit("franchise-fee-revenue-disclosure", usFranchise.EMITTER_PATH, () =>
        usFranchise.emitFranchiseFeeRevenueDisclosure(input),
      ),
    );
  }

  if (isCasinoOperator(extracted)) {
    results.push(
      wrapEmit("casino-jackpot-accrual", usCasino.EMITTER_PATH, () =>
        usCasino.emitCasinoJackpotAccrual(input),
      ),
    );
  }

  if (isTimeshareOperator(extracted)) {
    results.push(
      wrapEmit("timeshare-revenue-disclosure", usTimeshare.EMITTER_PATH, () =>
        usTimeshare.emitTimeshareRevenueDisclosure(input),
      ),
    );
  }

  if (hasUsaliInput(extracted)) {
    results.push(
      wrapEmit("usali-departmental-schedules", usUsali.EMITTER_PATH, () =>
        usUsali.emitUsaliDepartmentalSchedules(input),
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
  const router = runHospitalityRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
