import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  findFactByPattern,
  narrativeHas,
} from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

  out.push(
    assertPresence(
      ctx,
      "chna-cycle",
      "structural",
      narrativeHas(extracted, [/community health needs assessment/i, /\bchna\b/i]),
      "§501(r) CHNA cycle disclosure not present",
      { classification: "missing-field", severity: "high" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "charity-care-policy",
      "narrative",
      narrativeHas(extracted, [/charity care/i, /financial assistance/i, /uncompensated care/i]),
      "Charity care policy narrative not present",
      { classification: "narrative-gap", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "bad-debt-vs-charity",
      "structural",
      narrativeHas(extracted, [/bad debt/i, /provision for doubtful/i, /price concession/i]),
      "Bad debt vs charity care distinction (ASU 2011-07) not evidenced",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  const patientRev = findFactByPattern(extracted, /PatientService|HealthCareOrganization/i);
  if (patientRev) {
    out.push(
      assertNumericTolerance(
        ctx,
        "patient-service-revenue",
        "numeric",
        patientRev.tag,
        tolerances.revenuePct,
        "tolerance-exceeded",
        "medium",
      ),
    );
  }

  out.push(
    assertPresence(
      ctx,
      "payor-mix",
      "structural",
      narrativeHas(extracted, [/medicare/i, /medicaid/i, /commercial payor/i, /self-?pay/i]),
      "Third-party payor mix not disclosed",
      { classification: "missing-field", severity: "medium" },
    ),
  );

  out.push(
    assertPresence(
      ctx,
      "regulatory-narrative",
      "narrative",
      narrativeHas(extracted, [/hipaa/i, /malpractice/i, /regulat/i, /cms/i]),
      "HIPAA / malpractice / regulatory narrative not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
