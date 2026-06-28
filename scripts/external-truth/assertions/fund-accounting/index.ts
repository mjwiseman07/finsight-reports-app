import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, findFact, narrativeHas } from "../helpers";
import {
  emitterSatisfiesAssertion,
  runFundAccountingRouter,
  withRouterNarratives,
} from "../../../../lib/router/fund-accounting";

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
  const router = runFundAccountingRouter(ctx.extracted);
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
  const { extracted } = ctx;
  const routed = augmentedCtx(ctx);

  const netAssets = findFact(extracted, "NetAssets");
  const shares = findFact(extracted, "SharesOutstanding") ?? findFact(extracted, "EntityCommonStockSharesOutstanding");
  const navComputed =
    netAssets && shares && shares.value > 0 ? netAssets.value / shares.value : undefined;

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "nav-computation",
      "numeric",
      [/net asset value/i, /\bnav\b/i, /per share/i],
      "NAV = net assets / shares outstanding not computable from extract",
      { classification: "missing-field", severity: "high" },
    ),
  );

  if (navComputed !== undefined && !emitterSatisfiesAssertion(runFundAccountingRouter(extracted).results, "nav-computation").satisfied) {
    out[out.length - 1] = {
      id: "nav-computation",
      pack: ctx.vertical,
      tier: "numeric",
      passed: true,
      message: "NAV computable from extracted numeric facts",
    };
  }

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "expense-ratio",
      "structural",
      [/expense ratio/i, /operating expenses/i, /average net assets/i],
      "Expense ratio disclosure not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      routed,
      "fee-waivers",
      "narrative",
      narrativeHas(routed.extracted, [/fee waiver/i, /expense limitation/i, /reimbursement/i]),
      "Fee waivers / expense limitation not present",
      { classification: "narrative-gap", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "portfolio-composition",
      "structural",
      [/portfolio/i, /asset class/i, /equity/i, /fixed income/i],
      "Portfolio composition by asset class not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "top-holdings",
      "structural",
      [/top \d+ holdings/i, /schedule of investments/i, /portfolio holdings/i],
      "Top holdings disclosure not present",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "realized-unrealized-gains",
      "structural",
      [/realized gain/i, /unrealized gain/i, /change in unrealized/i],
      "Realized vs unrealized gains/losses split not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      routed,
      "distributions",
      "narrative",
      narrativeHas(routed.extracted, [/distribution/i, /dividend/i, /capital gain distribution/i]),
      "Distributions to shareholders not disclosed",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
