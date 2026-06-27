import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  findFactByPattern,
  hasFactTag,
  narrativeHas,
} from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

  const inventoryDeclared =
    Boolean(extracted.inventoryMethod) ||
    narrativeHas(extracted, [/fifo/i, /lifo/i, /weighted average/i, /inventory method/i]);
  out.push(
    assertPresence(
      ctx,
      "inventory-method-declared",
      "structural",
      inventoryDeclared,
      "Inventory measurement method not declared in filing extract",
      { classification: "missing-field", severity: "high" },
    ),
  );

  if (ctx.framework === "ifrs" || ctx.framework === "ipsas") {
    const lifoSuspect =
      extracted.inventoryMethod?.toUpperCase().includes("LIFO") ||
      narrativeHas(extracted, [/\blifo\b/i]);
    out.push(
      assertPresence(
        ctx,
        "ifrs-lifo-prohibition",
        "structural",
        !lifoSuspect,
        "IFRS retail filing shows LIFO inventory (comingling suspect)",
        {
          classification: "comingling-suspect",
          severity: "critical",
          observed: extracted.inventoryMethod ?? "LIFO signal in narrative",
          expected: "FIFO or weighted-average only",
        },
      ),
    );
  }

  const cogs = findFactByPattern(extracted, /CostOfGoods|CostOfRevenue|CostOfSales/i);
  if (cogs) {
    out.push(
      assertNumericTolerance(
        ctx,
        "cogs-tolerance",
        "numeric",
        cogs.tag,
        tolerances.tightPct,
        "tolerance-exceeded",
        "medium",
      ),
    );
  }

  out.push(
    assertPresence(
      ctx,
      "comp-sales-presence",
      "narrative",
      narrativeHas(extracted, [/comparable store/i, /same store/i, /comp sales/i]),
      "Same-store / comparable sales disclosure not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "lease-obligations",
      "structural",
      hasFactTag(extracted, ["OperatingLeaseLiability", "FinanceLeaseLiability"]) ||
        narrativeHas(extracted, [/lease obligation/i, /asc 842/i, /ifrs 16/i]),
      "Lease obligations (ASC 842 / IFRS 16) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "channel-disaggregation",
      "structural",
      narrativeHas(extracted, [/e-?commerce/i, /online/i, /in-?store/i, /digital/i]),
      "E-commerce vs in-store disaggregation not present when expected for retail",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
