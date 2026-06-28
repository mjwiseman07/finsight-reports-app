import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  assertRouterSurface,
  findFactByPattern,
  hasFactTag,
  narrativeHas,
  topicPresent,
} from "../helpers";
import {
  emitterSatisfiesAssertion,
  runSaasRouter,
  withRouterNarratives,
} from "../../../../lib/router/saas";

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
  const router = runSaasRouter(ctx.extracted);
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
  const { extracted, tolerances } = ctx;

  out.push(
    assertEmitterOrPresence(
      ctx,
      "deferred-revenue-rollforward",
      "structural",
      hasFactTag(extracted, [
        "ContractWithCustomerLiability",
        "DeferredRevenue",
        "ContractWithCustomerLiabilityCurrent",
      ]) || narrativeHas(extracted, [/deferred revenue/i, /contract liability/i]),
      "Deferred revenue / contract liability rollforward not evidenced in filing",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertEmitterOrPresence(
      ctx,
      "rpo-disclosure",
      "structural",
      narrativeHas(extracted, [/remaining performance obligation/i, /\brpo\b/i, /backlog/i]) ||
        topicPresent(ctx.expected, "deferred-revenue"),
      "RPO / remaining performance obligation disclosure not present",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrPresence(
      ctx,
      "contract-asset-liability-split",
      "structural",
      hasFactTag(extracted, ["ContractWithCustomerAsset", "ContractWithCustomerLiability"]) ||
        narrativeHas(extracted, [/contract asset/i, /contract liability/i, /unbilled/i]),
      "Contract asset / contract liability split not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  const revenueTag = findFactByPattern(extracted, /RevenueFromContract|Revenues/i);
  const router = runSaasRouter(extracted);
  const disaggEmitter = emitterSatisfiesAssertion(router.results, "revenue-disaggregation");
  if (disaggEmitter.satisfied) {
    out.push({
      id: "revenue-disaggregation",
      pack: ctx.vertical,
      tier: "numeric",
      passed: true,
      message: `satisfied by emitter ${disaggEmitter.emitterPath} at citation ${disaggEmitter.citation}`,
    });
  } else if (revenueTag) {
    out.push(
      assertNumericTolerance(
        ctx,
        "revenue-disaggregation",
        "numeric",
        revenueTag.tag,
        tolerances.revenuePct,
        "tolerance-exceeded",
        "medium",
      ),
    );
  } else {
    out.push(
      assertPresence(augmentedCtx(ctx), "revenue-disaggregation", "structural", false, "Revenue disaggregation tag missing", {
        classification: "missing-field",
        severity: "high",
      }),
    );
  }

  out.push(
    assertEmitterOrPresence(
      ctx,
      "cost-to-obtain-contract",
      "structural",
      hasFactTag(extracted, ["CapitalizedContractCost", "DeferredSalesCommission"]) ||
        narrativeHas(extracted, [/cost to obtain/i, /capitalized commission/i]),
      "Cost to obtain contract (capitalized + amortized) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "saas-metrics-presence",
      "narrative",
      narrativeHas(augmentedCtx(ctx).extracted, [
        /\barr\b/i,
        /annual recurring revenue/i,
        /net retention/i,
        /\bnrr\b/i,
        /gross retention/i,
      ]),
      "SaaS metrics (ARR/NRR/gross retention) not present in narrative extract",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(assertRouterSurface(ctx, "asc606-revenue-surface", "asc606-revenue", ["topic", "framework"]));

  return out;
}
