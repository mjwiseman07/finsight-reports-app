import { assertPresence, narrativeHas } from "../helpers";
import type { AssertionResult, ValidatorContext } from "../types";
import {
  emitterSatisfiesAssertion,
  runManufacturingRouter,
} from "../../../../lib/router/manufacturing";

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
  const router = runManufacturingRouter(ctx.extracted);
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
    severity: options.severity ?? "medium",
  });
}

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted } = ctx;

  if (ctx.framework === "ifrs" || ctx.framework === "ipsas") {
    const lifoSuspect =
      extracted.inventoryMethod?.toUpperCase().includes("LIFO") ||
      narrativeHas(extracted, [/\blifo\b/i]);
    out.push(
      assertPresence(
        ctx,
        "ifrs-inventory-binding",
        "structural",
        !lifoSuspect,
        "IFRS manufacturing filing shows LIFO (prohibited)",
        { classification: "comingling-suspect", severity: "critical" },
      ),
    );
  }

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "inventory-decomposition",
      "structural",
      [/raw materials/i, /work in process/i, /work in progress/i, /finished goods/i],
      "Raw materials / WIP / finished goods decomposition not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertEmitterOrNarrative(
      ctx,
      "cogm-rollforward",
      "structural",
      [/cost of goods manufactured/i, /work in process/i, /manufacturing overhead/i],
      "COGM rollforward not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "variance-disclosures",
      "narrative",
      narrativeHas(extracted, [/variance/i, /direct material/i, /direct labor/i, /overhead/i]),
      "Manufacturing variance disclosures not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "lcm-nrv-writedowns",
      "narrative",
      narrativeHas(extracted, [/lower of cost/i, /net realizable value/i, /inventory writedown/i]),
      "LCM / NRV writedown disclosure not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "capacity-utilization",
      "narrative",
      narrativeHas(extracted, [/capacity utilization/i, /plant utilization/i]),
      "Capacity utilization narrative not present (optional if not disclosed)",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
