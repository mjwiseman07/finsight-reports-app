import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, narrativeHas } from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted } = ctx;

  out.push(
    assertPresence(
      ctx,
      "poc-method-declared",
      "structural",
      narrativeHas(extracted, [
        /percentage of completion/i,
        /cost-?to-?cost/i,
        /over time/i,
        /input method/i,
      ]),
      "Percentage-of-completion method not declared",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "cost-to-cost-ratio",
      "structural",
      narrativeHas(extracted, [/cost incurred/i, /estimated total cost/i, /percent complete/i]),
      "Cost-to-cost ratio inputs not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "contract-balances-rollforward",
      "structural",
      narrativeHas(extracted, [/contract asset/i, /contract liability/i, /billings in excess/i]),
      "Contract assets / liabilities rollforward not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "backlog-disclosure",
      "narrative",
      narrativeHas(extracted, [/backlog/i, /remaining performance/i]),
      "Backlog disclosure not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "change-orders-claims",
      "narrative",
      narrativeHas(extracted, [/change order/i, /claims/i, /variations/i]),
      "Change orders / claims narrative not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "asc606-over-time",
      "structural",
      narrativeHas(extracted, [/over time/i, /asc 606/i, /ifrs 15/i, /satisfaction of performance obligation/i]),
      "ASC 606 / IFRS 15 over-time justification not present",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  return out;
}
