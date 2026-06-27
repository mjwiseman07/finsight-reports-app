import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertPresence,
  findFactByPattern,
  hasFactTag,
  narrativeHas,
} from "../helpers";

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
    assertPresence(
      ctx,
      "inventory-decomposition",
      "structural",
      hasFactTag(extracted, ["InventoryRawMaterials", "InventoryWorkInProcess", "InventoryFinishedGoods"]) ||
        narrativeHas(extracted, [/raw materials/i, /work in process/i, /finished goods/i]),
      "Raw materials / WIP / finished goods decomposition not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "cogm-rollforward",
      "structural",
      narrativeHas(extracted, [/cost of goods manufactured/i, /work in process/i, /manufacturing overhead/i]) ||
        Boolean(findFactByPattern(extracted, /CostOfGoods|CostOfRevenue/i)),
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
