import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, narrativeHas } from "../helpers";
import { emitterSatisfiesAssertion, runConstructionRouter, withRouterNarratives } from "../../../../lib/router/construction";

function augmentedCtx(ctx: ValidatorContext): ValidatorContext {
  return {
    ...ctx,
    extracted: withRouterNarratives(ctx.extracted),
  };
}

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
  const router = runConstructionRouter(ctx.extracted);
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
  return assertPresence(augmentedCtx(ctx), id, tier, narrativeHas(augmentedCtx(ctx).extracted, patterns), message, {
    classification: options.classification ?? "missing-field",
    severity: options.severity ?? "high",
  });
}

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const routed = augmentedCtx(ctx);

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "poc-method-declared",
      "structural",
      [/percentage of completion/i, /cost-?to-?cost/i, /over time/i, /input method/i],
      "Percentage-of-completion method not declared",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "cost-to-cost-ratio",
      "structural",
      [/cost incurred/i, /estimated total cost/i, /percent complete/i],
      "Cost-to-cost ratio inputs not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "contract-balances-rollforward",
      "structural",
      [/contract asset/i, /contract liability/i, /billings in excess/i],
      "Contract assets / liabilities rollforward not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      routed,
      "backlog-disclosure",
      "narrative",
      narrativeHas(routed.extracted, [/backlog/i, /remaining performance/i]),
      "Backlog disclosure not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      routed,
      "change-orders-claims",
      "narrative",
      narrativeHas(routed.extracted, [/change order/i, /claims/i, /variations/i]),
      "Change orders / claims narrative not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "asc606-over-time",
      "structural",
      [/over time/i, /asc 606/i, /ifrs 15/i, /satisfaction of performance obligation/i],
      "ASC 606 / IFRS 15 over-time justification not present",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  return out;
}
