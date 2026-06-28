import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  findFact,
  narrativeHas,
  topicPresent,
} from "../helpers";
import {
  emitterSatisfiesAssertion,
  runNonprofitRouter,
  withRouterNarratives,
} from "../../../../lib/router/nonprofit";

function augmentedCtx(ctx: ValidatorContext): ValidatorContext {
  return { ...ctx, extracted: withRouterNarratives(ctx.extracted) };
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
  const router = runNonprofitRouter(ctx.extracted);
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
  const { extracted, tolerances } = ctx;
  const router = runNonprofitRouter(extracted);

  if (router.deferred) {
    out.push({
      id: "ifrs-for-smes-deferred",
      pack: ctx.vertical,
      tier: "structural",
      passed: true,
      message: router.deferred.reason,
    });
    return out;
  }

  const revenue = findFact(extracted, "totrevenue");
  const assets = findFact(extracted, "totassetsend");
  if (revenue) {
    out.push(
      assertNumericTolerance(
        ctx,
        "form990-part1-part8-revenue",
        "numeric",
        "totrevenue",
        tolerances.form990Pct,
        "tolerance-exceeded",
        "high",
      ),
    );
  }

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "part9-part10-cross-tie",
      "structural",
      [/functional expenses/i, /balance sheet/i, /part ix/i, /part x/i],
      "Form 990 Part IX ↔ Part X cross-tie fields not extractable",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "restricted-net-assets",
      "structural",
      narrativeHas(augmentedCtx(ctx).extracted, [/donor restriction/i, /without donor restrictions/i, /with donor restrictions/i]) ||
        topicPresent(ctx.expected, "restricted-net-assets"),
      "Net assets with/without donor restrictions (ASU 2016-14) not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "liquidity-disclosure",
      "narrative",
      narrativeHas(augmentedCtx(ctx).extracted, [/liquidity/i, /available resources/i, /financial assets/i]),
      "Liquidity disclosure (ASU 2016-14) not present",
      { classification: "narrative-gap", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "functional-expense-allocation",
      "structural",
      [/program services/i, /management and general/i, /fundraising/i],
      "Functional expense allocation (program/management/fundraising) not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "endowment-composition",
      "narrative",
      narrativeHas(augmentedCtx(ctx).extracted, [/endowment/i, /permanently restricted/i]),
      "Endowment composition not present (may be immaterial)",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
