/**
 * D-Assertions Part 6 — Pure evidence-strength scoring function.
 */
import type { EvidenceStrength } from "@/lib/pre-close/assertions-coverage-types";
import {
  EVIDENCE_TYPE_STRENGTH,
  type ManualEvidenceType,
} from "@/lib/pre-close/manual-test-evidence-types";

export interface FireCoverageInput {
  ruleId: string;
  coverageStrength: "primary" | "secondary" | "partial";
  outcome: "fired" | "suppressed" | "error" | "other";
}

export interface ManualTestInput {
  evidenceId: string;
  evidenceType: ManualEvidenceType;
  dataSourceReliabilityBasis: string | null;
}

const STRENGTH_ORDER: EvidenceStrength[] = ["unassessed", "weak", "moderate", "strong"];

function maxStrength(a: EvidenceStrength, b: EvidenceStrength): EvidenceStrength {
  return STRENGTH_ORDER.indexOf(a) >= STRENGTH_ORDER.indexOf(b) ? a : b;
}

function promoteOnce(s: EvidenceStrength): EvidenceStrength {
  const idx = STRENGTH_ORDER.indexOf(s);
  return idx < STRENGTH_ORDER.length - 1 ? STRENGTH_ORDER[idx + 1] : s;
}

export function assessFireOnlyStrength(fires: FireCoverageInput[]): {
  strength: EvidenceStrength;
  anyPrimaryFired: boolean;
  anySecondaryFired: boolean;
  anyPartialFired: boolean;
  anyFired: boolean;
  anySuppressed: boolean;
  anyErrored: boolean;
} {
  let anyPrimaryFired = false;
  let anySecondaryFired = false;
  let anyPartialFired = false;
  let anyFired = false;
  let anySuppressed = false;
  let anyErrored = false;
  for (const f of fires) {
    if (f.outcome === "fired") {
      anyFired = true;
      if (f.coverageStrength === "primary") anyPrimaryFired = true;
      else if (f.coverageStrength === "secondary") anySecondaryFired = true;
      else if (f.coverageStrength === "partial") anyPartialFired = true;
    } else if (f.outcome === "suppressed") {
      anySuppressed = true;
    } else if (f.outcome === "error") {
      anyErrored = true;
    }
  }
  let strength: EvidenceStrength;
  if (anyPrimaryFired) strength = "strong";
  else if (anySecondaryFired) strength = "moderate";
  else if (anyPartialFired) strength = "weak";
  else strength = "unassessed";
  return {
    strength,
    anyPrimaryFired,
    anySecondaryFired,
    anyPartialFired,
    anyFired,
    anySuppressed,
    anyErrored,
  };
}

export interface AssessEvidenceStrengthInput {
  fires: FireCoverageInput[];
  manualTests: ManualTestInput[];
}

export interface AssessEvidenceStrengthResult {
  strength: EvidenceStrength;
  reasoning: string;
  fireContribution: EvidenceStrength;
  manualContribution: EvidenceStrength;
  promoted: boolean;
}

export function assessEvidenceStrength(
  input: AssessEvidenceStrengthInput,
): AssessEvidenceStrengthResult {
  const fireResult = assessFireOnlyStrength(input.fires);
  if (input.manualTests.length === 0) {
    return {
      strength: fireResult.strength,
      reasoning: fireResult.anyPrimaryFired
        ? "primary rule fired"
        : fireResult.anySecondaryFired
          ? "secondary rule fired (partial by design)"
          : fireResult.anyPartialFired
            ? "only partial coverage rule fired"
            : "no coverage evidence",
      fireContribution: fireResult.strength,
      manualContribution: "unassessed",
      promoted: false,
    };
  }

  let manualContribution: EvidenceStrength = "unassessed";
  for (const mt of input.manualTests) {
    const tierRaw = EVIDENCE_TYPE_STRENGTH[mt.evidenceType];
    const tier: EvidenceStrength = tierRaw ?? "weak";
    manualContribution = maxStrength(manualContribution, tier);
  }

  const combined = maxStrength(fireResult.strength, manualContribution);
  const bothModeratePlus =
    STRENGTH_ORDER.indexOf(fireResult.strength) >= STRENGTH_ORDER.indexOf("moderate") &&
    STRENGTH_ORDER.indexOf(manualContribution) >= STRENGTH_ORDER.indexOf("moderate");
  const canPromote = bothModeratePlus && combined !== "strong";
  const promoted = canPromote;
  const finalStrength = canPromote ? promoteOnce(combined) : combined;
  const reasoning = promoted
    ? `combined fire (${fireResult.strength}) + manual (${manualContribution}) with independent corroboration → promoted to ${finalStrength}`
    : `combined fire (${fireResult.strength}) + manual (${manualContribution}) → ${finalStrength}`;

  return {
    strength: finalStrength,
    reasoning,
    fireContribution: fireResult.strength,
    manualContribution,
    promoted,
  };
}
