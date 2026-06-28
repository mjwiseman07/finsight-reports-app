import { narrativeHas } from "../../scripts/external-truth/assertions/helpers";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import { isChnaScopedHospital, resolveHealthcareEntity } from "./entity";
import { scopeSatisfiedAssertion, type HealthcarePackOutcome } from "./types";
import { withRouterNarratives } from "../../lib/router/healthcare";

const PACK = "community-benefit-coverage";

export function runCommunityBenefitCoverage(extracted: ExtractedFiling): HealthcarePackOutcome {
  const entity = resolveHealthcareEntity(extracted);

  if (!isChnaScopedHospital(entity)) {
    return {
      skipped: true,
      pack: PACK,
      reason: "Community benefit scope: §501(r) IRC applies only to §501(c)(3) hospitals",
      scope_precondition: "tax_status === 501(c)(3) AND entity_type === hospital",
      framework_citation: "IRC §501(r)(3) + Form 990 Schedule H",
    };
  }

  const routed = withRouterNarratives(extracted);
  const passed = narrativeHas(routed, [
    /charity care/i,
    /financial assistance/i,
    /community benefit/i,
    /uncompensated care/i,
  ]);

  const assertion = {
    id: "community-benefit-report",
    pack: PACK,
    tier: "narrative" as const,
    passed,
    message: passed
      ? "Community benefit / financial assistance disclosure present"
      : "Community benefit program disclosure not present",
    classification: "narrative-gap" as const,
    severity: "medium" as const,
  };

  return {
    skipped: false,
    pack: PACK,
    assertions: [assertion],
    outputText: assertion.message,
  };
}

export function communityBenefitCoverageForCharityCare(extracted: ExtractedFiling) {
  const outcome = runCommunityBenefitCoverage(extracted);
  if (outcome.skipped) {
    return scopeSatisfiedAssertion(
      extracted,
      PACK,
      "charity-care-policy",
      `scope precondition satisfied: ${outcome.reason}`,
    );
  }
  const charityAssertion = {
    id: "charity-care-policy",
    pack: PACK,
    tier: "narrative" as const,
    passed: outcome.assertions[0]?.passed ?? false,
    message: outcome.assertions[0]?.message ?? "Community benefit scope check",
    classification: "narrative-gap" as const,
    severity: "medium" as const,
  };
  return charityAssertion;
}
