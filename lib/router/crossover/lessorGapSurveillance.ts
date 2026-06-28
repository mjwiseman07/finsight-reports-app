import type { GapEntry } from "../../../scripts/external-truth/types";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "lessor-gap-surveillance";

export function validateLessorGapSurveillance(ctx: CrossoverContext): CrossoverValidatorResult {
  const warnings: string[] = [];
  const hits = ctx.register.gaps.filter((gap: GapEntry) => {
    const msg = gap.message.toLowerCase();
    return (
      (msg.includes("lease") || msg.includes("lessor")) &&
      (msg.includes("lessor") || gap.lessor_scope === true)
    );
  });

  if (hits.length > 0) {
    warnings.push(`lessor-scoped lease gaps detected: ${hits.map((g: GapEntry) => g.id).join(", ")}`);
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: false,
    detail: hits.length === 0 ? "no lessor-scoped lease gaps in register" : `${hits.length} lessor hits (warn)`,
    warnings,
  };
}
