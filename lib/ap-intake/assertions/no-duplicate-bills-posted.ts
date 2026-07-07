/**
 * Phase D6.5 Part 2 — Block 4: Assertion contract for L5 duplicate detection.
 */
export const NO_DUPLICATE_BILLS_POSTED = {
  id: "no_duplicate_bills_posted",
  layer: "L5",
  primary_assertion: "existence_occurrence",
  secondary_assertions: ["accuracy"],
  accounts: ["accounts_payable", "operating_expenses"],
  citation: "ISA 315 ¶A190; PCAOB AS 12 fraud presumption",
  enforced_by: "lib/ap-intake/duplicate/detector.ts",
} as const;

export type NoDuplicateBillsPostedContract = typeof NO_DUPLICATE_BILLS_POSTED;
