/**
 * Phase D6.5 Part 2 — Block 3
 * L2 Assertion: quarantine_release_requires_all_gates.
 * Documents the release contract — enforcement lives in release-service.ts.
 */
export const quarantineReleaseRequiresAllGates = {
  assertion_id: "quarantine_release_requires_all_gates",
  layer: "L2",
  severity_default: "HIGH" as const,
  description:
    "A quarantined bill can only be released when all 4 gates (qc-01..qc-04) pass and are persisted.",
};
