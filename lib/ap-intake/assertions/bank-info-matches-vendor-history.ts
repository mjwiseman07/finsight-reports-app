/**
 * Phase D6.5 Part 2 — Block 3
 * L3 Assertion: bank_info_matches_vendor_history.
 * Assertion evaluator is registered here so the ISA discovery pass picks it up.
 * Live evaluation runs inside detectBankChange; this module documents the contract.
 */
export const bankInfoMatchesVendorHistory = {
  assertion_id: "bank_info_matches_vendor_history",
  layer: "L3",
  severity_default: "HIGH" as const,
  description:
    "Extracted vendor bank info must match a known-good entry in vendor_bank_history or trigger quarantine.",
};
