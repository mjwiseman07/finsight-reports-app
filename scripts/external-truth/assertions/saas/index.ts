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

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

  out.push(
    assertPresence(
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
    assertPresence(
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
    assertPresence(
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
  if (revenueTag) {
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
      assertPresence(ctx, "revenue-disaggregation", "structural", false, "Revenue disaggregation tag missing", {
        classification: "missing-field",
        severity: "high",
      }),
    );
  }

  out.push(
    assertPresence(
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
      ctx,
      "saas-metrics-presence",
      "narrative",
      narrativeHas(extracted, [
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
