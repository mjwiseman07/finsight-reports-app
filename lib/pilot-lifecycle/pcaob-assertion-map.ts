/**
 * Block 7: Maps between the locked PCAOB-6 taxonomy (from
 * lib/audit-ready/assertion-taxonomy.ts, used by Blocks 1–6) and the
 * ISA-315 8-taxonomy (from lib/pre-close/assertions-types, used by the
 * existing D-Assertions Part 3 coverage matrix).
 *
 * See Block 7 Design Decision D3 for the full mapping table.
 */

import type { PcaobAssertion } from "./types";
import type { AssertionId } from "@/lib/pre-close/assertions-types";

export const PCAOB_TO_ISA_MAP: Readonly<
  Record<PcaobAssertion, readonly AssertionId[]>
> = {
  existence: ["existence_occurrence"],
  completeness: ["completeness"],
  accuracy: ["accuracy", "classification"],
  valuation: ["valuation_allocation"],
  rights_obligations: ["rights_obligations"],
  presentation_disclosure: ["presentation_disclosure", "cutoff"],
} as const;

export const ISA_TO_PCAOB_PRIMARY: Readonly<
  Record<AssertionId, PcaobAssertion>
> = {
  existence_occurrence: "existence",
  completeness: "completeness",
  accuracy: "accuracy",
  classification: "accuracy",
  valuation_allocation: "valuation",
  rights_obligations: "rights_obligations",
  presentation_disclosure: "presentation_disclosure",
  cutoff: "presentation_disclosure",
} as const;

export function pcaobToIsa(pcaob: PcaobAssertion): readonly AssertionId[] {
  return PCAOB_TO_ISA_MAP[pcaob] ?? [];
}

export function isaToPcaob(isa: AssertionId): PcaobAssertion {
  return ISA_TO_PCAOB_PRIMARY[isa];
}
