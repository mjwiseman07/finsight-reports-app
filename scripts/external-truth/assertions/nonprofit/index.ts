import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  findFact,
  narrativeHas,
  topicPresent,
} from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

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
    assertPresence(
      ctx,
      "part9-part10-cross-tie",
      "structural",
      Boolean(revenue && assets) || narrativeHas(extracted, [/functional expenses/i, /balance sheet/i]),
      "Form 990 Part IX ↔ Part X cross-tie fields not extractable",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "restricted-net-assets",
      "structural",
      narrativeHas(extracted, [/donor restriction/i, /without donor restrictions/i, /with donor restrictions/i]) ||
        topicPresent(ctx.expected, "restricted-net-assets"),
      "Net assets with/without donor restrictions (ASU 2016-14) not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "liquidity-disclosure",
      "narrative",
      narrativeHas(extracted, [/liquidity/i, /available resources/i, /financial assets/i]),
      "Liquidity disclosure (ASU 2016-14) not present",
      { classification: "narrative-gap", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "functional-expense-allocation",
      "structural",
      narrativeHas(extracted, [/program services/i, /management and general/i, /fundraising/i]),
      "Functional expense allocation (program/management/fundraising) not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "endowment-composition",
      "narrative",
      narrativeHas(extracted, [/endowment/i, /permanently restricted/i]),
      "Endowment composition not present (may be immaterial)",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
