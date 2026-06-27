import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, findFact, narrativeHas } from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted } = ctx;

  const netAssets = findFact(extracted, "NetAssets");
  const shares = findFact(extracted, "SharesOutstanding") ?? findFact(extracted, "EntityCommonStockSharesOutstanding");
  const navComputed =
    netAssets && shares && shares.value > 0 ? netAssets.value / shares.value : undefined;

  out.push(
    assertPresence(
      ctx,
      "nav-computation",
      "numeric",
      navComputed !== undefined ||
        narrativeHas(extracted, [/net asset value/i, /\bnav\b/i, /per share/i]),
      "NAV = net assets / shares outstanding not computable from extract",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "expense-ratio",
      "structural",
      narrativeHas(extracted, [/expense ratio/i, /operating expenses/i, /average net assets/i]),
      "Expense ratio disclosure not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "fee-waivers",
      "narrative",
      narrativeHas(extracted, [/fee waiver/i, /expense limitation/i, /reimbursement/i]),
      "Fee waivers / expense limitation not present",
      { classification: "narrative-gap", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "portfolio-composition",
      "structural",
      narrativeHas(extracted, [/portfolio/i, /asset class/i, /equity/i, /fixed income/i]),
      "Portfolio composition by asset class not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "top-holdings",
      "structural",
      narrativeHas(extracted, [/top \d+ holdings/i, /schedule of investments/i, /portfolio holdings/i]),
      "Top holdings disclosure not present",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "realized-unrealized-gains",
      "structural",
      narrativeHas(extracted, [/realized gain/i, /unrealized gain/i, /change in unrealized/i]),
      "Realized vs unrealized gains/losses split not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "distributions",
      "narrative",
      narrativeHas(extracted, [/distribution/i, /dividend/i, /capital gain distribution/i]),
      "Distributions to shareholders not disclosed",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
