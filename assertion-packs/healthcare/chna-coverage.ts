import { narrativeHas } from "../../scripts/external-truth/assertions/helpers";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import { isChnaScopedHospital, resolveHealthcareEntity } from "./entity";
import { scopeSatisfiedAssertion, type HealthcarePackOutcome } from "./types";
import {
  emitterSatisfiesAssertion,
  runHealthcareRouter,
  withRouterNarratives,
} from "../../lib/router/healthcare";

const PACK = "chna-coverage";

export function runChnaCoverage(extracted: ExtractedFiling): HealthcarePackOutcome {
  const entity = resolveHealthcareEntity(extracted);

  if (!isChnaScopedHospital(entity)) {
    return {
      skipped: true,
      pack: PACK,
      reason: "CHNA scope: §501(r) IRC applies only to §501(c)(3) hospitals",
      scope_precondition: "tax_status === 501(c)(3) AND entity_type === hospital",
      framework_citation: "IRC §501(r)(3)",
    };
  }

  const routed = withRouterNarratives(extracted);
  const router = runHealthcareRouter(extracted);
  const emitter = emitterSatisfiesAssertion(router.results, "chna-cycle");
  const narrativeOk = narrativeHas(routed, [
    /community health needs assessment/i,
    /\bchna\b/i,
    /community benefit assessment cycle/i,
  ]);

  const passed = emitter.satisfied || narrativeOk;
  const message = emitter.satisfied
    ? `satisfied by emitter ${emitter.emitterPath} at citation ${emitter.citation}`
    : passed
      ? "CHNA cycle evidenced in filing corpus"
      : "§501(r) CHNA cycle disclosure not present";

  const assertion = {
    id: "chna-cycle",
    pack: PACK,
    tier: "structural" as const,
    passed,
    message,
    classification: "missing-field" as const,
    severity: "high" as const,
  };

  return {
    skipped: false,
    pack: PACK,
    assertions: [assertion],
    outputText: assertion.message,
  };
}

export function chnaCoverageForChnaCycle(extracted: ExtractedFiling) {
  const outcome = runChnaCoverage(extracted);
  if (outcome.skipped) {
    return scopeSatisfiedAssertion(
      extracted,
      PACK,
      "chna-cycle",
      `scope precondition satisfied: ${outcome.reason}`,
    );
  }
  return outcome.assertions[0];
}
