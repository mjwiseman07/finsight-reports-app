import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { buildHealthcareEmitterInput } from "./types";
import * as usChna from "./usgaap/chnaCycleDisclosure";
import * as usCommunityBenefit from "./usgaap/communityBenefitReport";
import * as ifrsCommunityBenefit from "./ifrs/communityBenefitPurposeDisclosure";
import {
  hasAllowanceAsc606Input,
  hasAnyAsc606RevenueInput,
  hasAnyIfrsRevenueInput,
  hasIpcAsc606Input,
  hasPayorMixAsc606Input,
  hasPayorMixIfrsInput,
  hasReceivablesEclInput,
} from "../lanes/healthcare/types";
import * as usPayorMix from "../lanes/healthcare/emitters/payorMixDisaggregation";
import * as usIpc from "../lanes/healthcare/emitters/implicitPriceConcession";
import * as usAllowance from "../lanes/healthcare/emitters/allowanceRollforward";
import * as ifrsPayorMix from "../lanes/healthcare/emitters/ifrs/payorMixIFRS";
import * as ifrsEcl from "../lanes/healthcare/emitters/ifrs/receivablesECL";
import { buildIfrs15EmitterInput, buildIfrs9EmitterInput, buildUsgaapAsc606EmitterInput } from "../lanes/healthcare/types";

export interface HealthcareFrameworkViolation {
  framework: string;
  violation: string;
  citation: string;
  remediation: string;
  message: string;
}

export interface HealthcareRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: HealthcareFrameworkViolation;
}

function wrapEmit(emitterId: string, emitterPath: string, fn: () => EmitterResult): EmitterResult {
  try {
    return fn();
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      throw error;
    }
    throw error;
  }
}

function frameworkViolationFromError(error: FrameworkViolationError): HealthcareFrameworkViolation {
  return {
    framework: error.framework,
    violation: error.violation,
    citation: error.citation,
    remediation: error.remediation,
    message: error.message,
  };
}

function runUsgaapRevenueLane(extracted: ExtractedFiling): EmitterResult[] {
  const input = buildUsgaapAsc606EmitterInput(extracted);
  const results: EmitterResult[] = [];
  if (hasPayorMixAsc606Input(extracted)) {
    results.push(
      wrapEmit("payor-mix-disaggregation", usPayorMix.EMITTER_PATH, () =>
        usPayorMix.emitPayorMixDisaggregation(input),
      ),
    );
  }
  if (hasIpcAsc606Input(extracted)) {
    results.push(
      wrapEmit("implicit-price-concession", usIpc.EMITTER_PATH, () =>
        usIpc.emitImplicitPriceConcession(input),
      ),
    );
  }
  if (hasAllowanceAsc606Input(extracted)) {
    results.push(
      wrapEmit("allowance-rollforward", usAllowance.EMITTER_PATH, () =>
        usAllowance.emitAllowanceRollforward(input),
      ),
    );
  }
  return results;
}

function runIfrsRevenueLane(extracted: ExtractedFiling): EmitterResult[] {
  const results: EmitterResult[] = [];
  if (hasPayorMixIfrsInput(extracted)) {
    const input = buildIfrs15EmitterInput(extracted);
    results.push(
      wrapEmit("payor-mix-ifrs", ifrsPayorMix.EMITTER_PATH, () =>
        ifrsPayorMix.emitPayorMixIFRS(input),
      ),
    );
  }
  if (hasReceivablesEclInput(extracted)) {
    const input = buildIfrs9EmitterInput(extracted);
    results.push(
      wrapEmit("receivables-ecl", ifrsEcl.EMITTER_PATH, () => ifrsEcl.emitReceivablesECL(input)),
    );
  }
  return results;
}

function runLegacyHealthcareLane(extracted: ExtractedFiling): EmitterResult[] {
  const input = buildHealthcareEmitterInput(extracted);
  if (extracted.framework === "ifrs") {
    return [ifrsCommunityBenefit.emitCommunityBenefitPurposeDisclosure(input)];
  }
  return [usChna.emitChnaCycleDisclosure(input), usCommunityBenefit.emitCommunityBenefitReport(input)];
}

export function runHealthcareRouter(extracted: ExtractedFiling): HealthcareRouterOutput {
  try {
    if (extracted.framework === "ifrs") {
      if (hasAnyAsc606RevenueInput(extracted)) {
        return {
          framework: extracted.framework,
          results: [],
          augmentedNarratives: extracted.narrativeSnippets,
          frameworkViolation: {
            framework: "IFRS_15",
            violation: "US GAAP ASC 606 revenue inputs not applicable under IFRS lane",
            citation: "IFRS 15",
            remediation: "Use healthcare_revenue.ifrs structured inputs.",
            message: "IFRS healthcare filing cannot use ASC 606 revenue emitters.",
          },
        };
      }
      const revenueResults = hasAnyIfrsRevenueInput(extracted) ? runIfrsRevenueLane(extracted) : [];
      const legacyResults = hasAnyIfrsRevenueInput(extracted) ? [] : runLegacyHealthcareLane(extracted);
      const results = [...revenueResults, ...legacyResults];
      const augmentedNarratives = [
        ...extracted.narrativeSnippets,
        ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
      ];
      return { framework: extracted.framework, results, augmentedNarratives };
    }

    if (extracted.framework === "us-gaap") {
      if (hasAnyIfrsRevenueInput(extracted)) {
        return {
          framework: extracted.framework,
          results: [],
          augmentedNarratives: extracted.narrativeSnippets,
          frameworkViolation: {
            framework: "US_GAAP_ASC606",
            violation: "IFRS revenue/ECL inputs not applicable under US GAAP lane",
            citation: "ASC 606",
            remediation: "Use healthcare_revenue.asc606 structured inputs.",
            message: "US GAAP healthcare filing cannot use IFRS 9 ECL emitters.",
          },
        };
      }
      const revenueResults = hasAnyAsc606RevenueInput(extracted) ? runUsgaapRevenueLane(extracted) : [];
      const legacyResults = runLegacyHealthcareLane(extracted);
      const results = [...legacyResults, ...revenueResults];
      const augmentedNarratives = [
        ...extracted.narrativeSnippets,
        ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
      ];
      return { framework: extracted.framework, results, augmentedNarratives };
    }

    const results = runLegacyHealthcareLane(extracted);
    return {
      framework: extracted.framework,
      results,
      augmentedNarratives: [
        ...extracted.narrativeSnippets,
        ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
      ],
    };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        framework: extracted.framework,
        results: [],
        augmentedNarratives: extracted.narrativeSnippets,
        frameworkViolation: frameworkViolationFromError(error),
      };
    }
    throw error;
  }
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
    .filter((result) => result.emitterPath.includes("/healthcare/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function usgaapHealthcareRevenueOutputText(extracted: ExtractedFiling): string {
  const router = runHealthcareRouter(extracted);
  return router.results
    .filter((result) => result.emitterPath.includes("/lanes/healthcare/emitters/"))
    .filter((result) => !result.emitterPath.includes("/ifrs/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function ifrsHealthcareRevenueOutputText(extracted: ExtractedFiling): string {
  const router = runHealthcareRouter(extracted);
  return router.results
    .filter((result) => result.emitterPath.includes("/lanes/healthcare/emitters/ifrs/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
