import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, narrativeHas } from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, source } = ctx;
  const synthesized = source?.synthesized === true;

  out.push(
    assertPresence(
      ctx,
      "far-cas-allocation",
      "structural",
      narrativeHas(extracted, [/far/i, /cas/i, /indirect cost/i, /cost accounting standards/i]) || synthesized,
      "FAR/CAS allocation disclosure not evidenced",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "cas-410-gna-pool",
      "structural",
      narrativeHas(extracted, [/general and administrative/i, /\bg&a\b/i, /cas 410/i]) || synthesized,
      "G&A pool composition (CAS 410) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "cas-418-overhead",
      "structural",
      narrativeHas(extracted, [/indirect cost/i, /overhead allocation/i, /cas 418/i]) || synthesized,
      "Indirect cost allocation (CAS 418) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "contract-type-mix",
      "structural",
      narrativeHas(extracted, [/cost-?type/i, /fixed-?price/i, /time and materials/i]),
      "Cost-type vs fixed-price contract mix not disclosed",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "backlog-funded-split",
      "narrative",
      narrativeHas(extracted, [/backlog/i, /funded/i, /unfunded/i]),
      "Backlog funded vs unfunded split not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  if (synthesized) {
    out.push(
      assertPresence(
        ctx,
        "dcaa-methodology-reference",
        "narrative",
        narrativeHas(extracted, [/dcaa/i, /audit/i, /methodology/i]) || Boolean(source?.notes),
        "Synthesized DCAA sample missing methodology narrative",
        { classification: "missing-field", severity: "medium" },
      ),
    );
  }

  return out;
}
