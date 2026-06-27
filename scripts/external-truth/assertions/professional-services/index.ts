import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertPresence,
  findFactByPattern,
  narrativeHas,
} from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted } = ctx;

  out.push(
    assertPresence(
      ctx,
      "unbilled-receivables",
      "structural",
      findFactByPattern(extracted, /ContractWithCustomerAsset|Unbilled/i) !== undefined ||
        narrativeHas(extracted, [/unbilled/i, /contract asset/i]),
      "Unbilled receivables (contract assets) not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "receivables-aging",
      "narrative",
      narrativeHas(extracted, [/aging/i, /days outstanding/i, /receivable/i]),
      "Billed receivables aging not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "revenue-mix-tm-fixed",
      "structural",
      narrativeHas(extracted, [/time and materials/i, /fixed fee/i, /fixed price/i, /engagement/i]),
      "T&M vs fixed fee revenue mix not disclosed",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "utilization-rate",
      "structural",
      narrativeHas(extracted, [/utilization/i, /billable hours/i, /chargeable hours/i]),
      "Utilization rate not disclosed",
      { classification: "missing-field", severity: "low" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "principal-agent-pass-through",
      "structural",
      narrativeHas(extracted, [/principal/i, /agent/i, /pass-?through/i, /reimbursable/i]),
      "Pass-through / principal-vs-agent classification not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  return out;
}
