import { findFactByPattern, narrativeHas } from "../../scripts/external-truth/assertions/helpers";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import { isTaxableHcEntity, resolveHealthcareEntity } from "./entity";
import type { HealthcarePackOutcome } from "./types";

const PACK = "taxable-hc-disclosure-coverage";

const FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "§501(r)",
  "501(r)",
  "Community Health Needs Assessment",
  "CHNA",
  "Form 990",
  "Schedule H",
] as const;

function assertForbiddenAbsent(output: string): void {
  for (const forbidden of FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (output.includes(forbidden)) {
      throw new Error(`taxable HC pack forbidden substring leakage: ${forbidden}`);
    }
  }
}

export function runTaxableHcDisclosureCoverage(extracted: ExtractedFiling): HealthcarePackOutcome {
  const entity = resolveHealthcareEntity(extracted);

  if (!isTaxableHcEntity(entity)) {
    return {
      skipped: true,
      pack: PACK,
      reason: "Taxable HC pack scope: taxable healthcare entities only",
      scope_precondition:
        "tax_status === taxable AND entity_type in [hospital_system, pharmacy_chain, physician_group]",
    };
  }

  const asc606 =
    findFactByPattern(extracted, /RevenueFromContract|ContractWithCustomer|Revenues/i) !== undefined ||
    narrativeHas(extracted, [/revenue from contract/i, /contract with customer/i, /\brevenues\b/i]);

  const asc842 = narrativeHas(extracted, [/lease/i, /right-of-use/i, /operating lease/i, /finance lease/i]);

  const asc326 = narrativeHas(extracted, [
    /credit loss/i,
    /allowance for doubtful/i,
    /expected credit loss/i,
    /provision for doubtful/i,
  ]);

  const asc280 =
    narrativeHas(extracted, [/segment/i, /reportable segment/i, /operating segment/i]) ||
    Boolean(extracted.cik);

  const lines = [
    `ASC 606 revenue recognition: ${asc606 ? "present" : "absent"}`,
    `ASC 842 lease disclosures: ${asc842 ? "present" : "absent"}`,
    `ASC 326 credit losses: ${asc326 ? "present" : "absent"}`,
    `ASC 280 segment reporting: ${asc280 ? "present" : "absent"}`,
  ];
  const outputText = lines.join("\n");
  assertForbiddenAbsent(outputText);

  const allPassed = asc606 && asc842 && asc326 && asc280;

  return {
    skipped: false,
    pack: PACK,
    assertions: [
      {
        id: "taxable-hc-asc-606",
        pack: PACK,
        tier: "structural",
        passed: asc606,
        message: lines[0],
        classification: "missing-field",
        severity: "medium",
      },
      {
        id: "taxable-hc-asc-842",
        pack: PACK,
        tier: "structural",
        passed: asc842,
        message: lines[1],
        classification: "missing-field",
        severity: "medium",
      },
      {
        id: "taxable-hc-asc-326",
        pack: PACK,
        tier: "structural",
        passed: asc326,
        message: lines[2],
        classification: "missing-field",
        severity: "medium",
      },
      {
        id: "taxable-hc-asc-280",
        pack: PACK,
        tier: "structural",
        passed: asc280,
        message: lines[3],
        classification: "missing-field",
        severity: "low",
      },
    ],
    outputText,
  };
}

export { FORBIDDEN_OUTPUT_SUBSTRINGS as TAXABLE_HC_FORBIDDEN_OUTPUT_SUBSTRINGS };
