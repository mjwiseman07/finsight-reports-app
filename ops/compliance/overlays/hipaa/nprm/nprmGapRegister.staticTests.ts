import {
  assertNprmNotFinalInvariant,
  assertRegisterSchemaValid,
  getLockTimeStatus,
  type NprmGapRegisterRow,
  type RegisterAssertionResult,
} from "./nprmGapRegister";

export interface NprmGapRegisterStaticCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): RegisterAssertionResult | { decision: "DENY" | "ALLOW"; reason: string };
}

export interface NprmGapRegisterStaticCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

const FEDERAL_REGISTER_URL =
  "https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information";

function baseRow(overrides: Partial<NprmGapRegisterRow> = {}): NprmGapRegisterRow {
  return {
    rowId: "NGR-STATIC-01",
    nprmProvisionId: "164.312(f)-mfa",
    currentRuleReference: "docs/trust/hipaa/POLICY_SET.md §164.312(d)",
    nprmTargetState: "Would require multi-factor authentication for ePHI access if finalized as proposed.",
    primarySourceUrl: FEDERAL_REGISTER_URL,
    primarySourceVerifiedAt: "2026-06-22T00:00:00.000Z",
    gapSize: "M",
    founderEffortEstimate: "2 weeks founder (founder-estimated)",
    owner: "Matthew Wiseman",
    triggerDate: null,
    status: "open",
    notes: "Static test fixture row.",
    ...overrides,
  };
}

function happyPathRows(): NprmGapRegisterRow[] {
  const owners = ["Matthew Wiseman", "Janice"];
  const provisions = [
    ["NGR-STATIC-01", "164.312(f)-mfa", "M"],
    ["NGR-STATIC-02", "164.312(b)-encryption-at-rest", "M"],
    ["NGR-STATIC-03", "164.312(e)-encryption-in-transit", "S"],
    ["NGR-STATIC-04", "164.312-addressable-required-removal", "L"],
    ["NGR-STATIC-05", "164.308(a)(8)-vulnerability-scans-6mo", "S"],
    ["NGR-STATIC-06", "164.308(a)(8)-penetration-testing-12mo", "M"],
    ["NGR-STATIC-07", "164.308(a)(1)-asset-inventory-network-map", "M"],
    ["NGR-STATIC-08", "164.308(a)(8)-annual-compliance-audit", "M"],
  ] as const;

  return provisions.map(([rowId, provisionId, gapSize], index) =>
    baseRow({
      rowId,
      nprmProvisionId: provisionId,
      gapSize,
      owner: owners[index % owners.length],
    }),
  );
}

export const NPRM_GAP_REGISTER_STATIC_CASES: NprmGapRegisterStaticCase[] = [
  {
    caseId: "NGRS-01-HAPPY-PATH",
    description: "Eight well-formed owned rows with primary-source URLs → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertRegisterSchemaValid(happyPathRows());
    },
  },
  {
    caseId: "NGRS-02-UNOWNED-GAP-ROW",
    description: "Row with empty owner → DENY unowned-gap-row",
    expectedDecision: "DENY",
    run() {
      return assertRegisterSchemaValid([baseRow({ owner: "" })]);
    },
  },
  {
    caseId: "NGRS-03-NON-PRIMARY-SOURCE",
    description: "Law-firm summary URL → DENY non-primary-source",
    expectedDecision: "DENY",
    run() {
      return assertRegisterSchemaValid([
        baseRow({ primarySourceUrl: "https://example-lawfirm.com/summary" }),
      ]);
    },
  },
  {
    caseId: "NGRS-04-INVALID-GAP-SIZE",
    description: "gapSize XL → DENY",
    expectedDecision: "DENY",
    run() {
      return assertRegisterSchemaValid([baseRow({ gapSize: "XL" as NprmGapRegisterRow["gapSize"] })]);
    },
  },
  {
    caseId: "NGRS-05-MITIGATION-WITHOUT-CONTROL",
    description: "mitigated-via-existing-control with not-currently-required → DENY",
    expectedDecision: "DENY",
    run() {
      return assertRegisterSchemaValid([
        baseRow({
          status: "mitigated-via-existing-control",
          currentRuleReference: "not-currently-required",
        }),
      ]);
    },
  },
  {
    caseId: "NGRS-06-DUPLICATE-ROW-ID",
    description: "Duplicate rowId → DENY",
    expectedDecision: "DENY",
    run() {
      const row = baseRow();
      return assertRegisterSchemaValid([row, { ...row }]);
    },
  },
  {
    caseId: "NGRS-07-LOCK-TIME-IS-FINAL",
    description: "LOCK-time status isFinal true path → DENY obsolescence guard",
    expectedDecision: "DENY",
    run() {
      return assertNprmNotFinalInvariant(true);
    },
  },
  {
    caseId: "NGRS-08-FROZEN-LOCK-TIME-STATUS",
    description: "getLockTimeStatus returns frozen object; mutation rejected",
    expectedDecision: "ALLOW",
    run() {
      const status = getLockTimeStatus();
      const mutationRejected = !Reflect.set(status, "isFinal", true);
      const ok = status.isFinal === false && Object.isFrozen(status) && mutationRejected;
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "lock_time_status_frozen" : "lock_time_status_mutation_allowed",
      };
    },
  },
];

export function executeNprmGapRegisterStaticConstructionTests(): {
  pass: boolean;
  results: NprmGapRegisterStaticCaseResult[];
} {
  const results = NPRM_GAP_REGISTER_STATIC_CASES.map((testCase) => {
    const outcome = testCase.run();
    const passed = outcome.decision === testCase.expectedDecision;
    return {
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      decision: outcome.decision,
      reason: outcome.reason,
      details: { violations: "violations" in outcome ? outcome.violations : [] },
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
