import { assertNumericTolerance, assertPresence, findFactByPattern, narrativeHas } from "../helpers";
import type { AssertionResult, ValidatorContext } from "../types";
import {
  chnaCoverageForChnaCycle,
  communityBenefitCoverageForCharityCare,
  runTaxableHcDisclosureCoverage,
} from "../../../../assertion-packs/healthcare";
import {
  emitterSatisfiesAssertion,
  runHealthcareRouter,
} from "../../../../lib/router/healthcare";

function assertEmitterOrNarrative(
  ctx: ValidatorContext,
  id: string,
  tier: AssertionResult["tier"],
  patterns: RegExp[],
  message: string,
  options: {
    classification?: AssertionResult["classification"];
    severity?: AssertionResult["severity"];
  } = {},
): AssertionResult {
  const router = runHealthcareRouter(ctx.extracted);
  const emitter = emitterSatisfiesAssertion(router.results, id);
  if (emitter.satisfied) {
    return {
      id,
      pack: ctx.vertical,
      tier,
      passed: true,
      message: `satisfied by emitter ${emitter.emitterPath} at citation ${emitter.citation}`,
    };
  }
  return assertPresence(ctx, id, tier, narrativeHas(ctx.extracted, patterns), message, {
    classification: options.classification ?? "missing-field",
    severity: options.severity ?? "high",
  });
}

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

  out.push(chnaCoverageForChnaCycle(extracted));
  out.push(communityBenefitCoverageForCharityCare(extracted));

  const taxablePack = runTaxableHcDisclosureCoverage(extracted);
  if (!taxablePack.skipped) {
    out.push(...taxablePack.assertions);
  }

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "bad-debt-vs-charity",
      "structural",
      [/bad debt/i, /provision for doubtful/i, /price concession/i],
      "Bad debt vs charity care distinction (ASU 2011-07) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  const patientRev = findFactByPattern(extracted, /PatientService|HealthCareOrganization/i);
  if (patientRev) {
    out.push(
      assertNumericTolerance(
        ctx,
        "patient-service-revenue",
        "numeric",
        patientRev.tag,
        tolerances.revenuePct,
        "tolerance-exceeded",
        "medium",
      ),
    );
  }

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "payor-mix",
      "structural",
      [/medicare/i, /medicaid/i, /commercial payor/i, /self-?pay/i],
      "Third-party payor mix not disclosed",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "regulatory-narrative",
      "narrative",
      narrativeHas(extracted, [/hipaa/i, /malpractice/i, /regulat/i, /cms/i]),
      "HIPAA / malpractice / regulatory narrative not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
