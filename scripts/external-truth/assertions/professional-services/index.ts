import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, narrativeHas } from "../helpers";
import {
  emitterSatisfiesAssertion,
  runProfessionalServicesRouter,
  withRouterNarratives,
} from "../../../../lib/router/professional-services";

function augmentedCtx(ctx: ValidatorContext): ValidatorContext {
  return { ...ctx, extracted: withRouterNarratives(ctx.extracted) };
}

function assertEmitterOrPresence(
  ctx: ValidatorContext,
  id: string,
  tier: AssertionResult["tier"],
  fallback: boolean,
  message: string,
  options: {
    classification?: AssertionResult["classification"];
    severity?: AssertionResult["severity"];
  } = {},
): AssertionResult {
  const router = runProfessionalServicesRouter(ctx.extracted);
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
  return assertPresence(augmentedCtx(ctx), id, tier, fallback, message, {
    classification: options.classification ?? "missing-field",
    severity: options.severity ?? "high",
  });
}

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted } = ctx;

  out.push(
    assertEmitterOrPresence(
      ctx,
      "unbilled-receivables",
      "structural",
      narrativeHas(extracted, [/unbilled/i, /contract asset/i]),
      "Unbilled receivables (contract assets) not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "receivables-aging",
      "narrative",
      narrativeHas(augmentedCtx(ctx).extracted, [/aging/i, /days outstanding/i, /receivable/i]),
      "Billed receivables aging not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertEmitterOrPresence(
      ctx,
      "revenue-mix-tm-fixed",
      "structural",
      narrativeHas(extracted, [/time and materials/i, /fixed fee/i, /fixed price/i, /engagement/i]),
      "T&M vs fixed fee revenue mix not disclosed",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "utilization-rate",
      "structural",
      narrativeHas(augmentedCtx(ctx).extracted, [/utilization/i, /billable hours/i, /chargeable hours/i]),
      "Utilization rate not disclosed",
      { classification: "missing-field", severity: "low" },
    ),
  );

  out.push(
    assertEmitterOrPresence(
      ctx,
      "principal-agent-pass-through",
      "structural",
      narrativeHas(extracted, [/principal/i, /agent/i, /pass-?through/i, /reimbursable/i]),
      "Pass-through / principal-vs-agent classification not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  return out;
}
