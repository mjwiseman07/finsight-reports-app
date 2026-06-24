import assert from "node:assert/strict";
import { adaptTreatmentForRole } from "../treatmentRoleAdapter";
import type { RoleEnvelope, TreatmentResolution } from "../types";

const ENV: RoleEnvelope = {
  role: "ai-controller-helper",
  companyId: "co-1",
  taskId: "task-1",
  requestedAt: "2026-06-23T23:50:00Z",
};

function mkResolved(): TreatmentResolution {
  return {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP",
    precedenceReasoning: "RULE-001 selected at weight 900.",
    citationHandlesConsulted: ["SEC_REG_S_X", "ASC_105_10_05_1"],
    unresolvedConflicts: [],
  } as unknown as TreatmentResolution;
}

function mkUnresolved(): TreatmentResolution {
  return {
    chosenFramework: null,
    applicableBasisRef: "basisOf:UNRESOLVED",
    precedenceReasoning: "RULE-006 (US_GAAP w300) tied with RULE-010 (IFRS w300).",
    citationHandlesConsulted: ["SEC_REG_S_X", "IAS_1_PRESENTATION"],
    unresolvedConflicts: [
      { ruleId: "RULE-006", producedFramework: "US_GAAP", citationRef: "SEC_REG_S_X" },
      { ruleId: "RULE-010", producedFramework: "IFRS", citationRef: "IAS_1_PRESENTATION" },
    ],
  } as unknown as TreatmentResolution;
}

export function runTreatmentRoleAdapterTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  try {
    const result = adaptTreatmentForRole({
      resolution: mkResolved(),
      envelope: ENV,
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    assert.equal(result.outcome, "resolved");
    if (result.outcome === "resolved") {
      assert.equal(result.chosenFramework, "US_GAAP");
      assert.equal(result.role, "ai-controller-helper");
      assert.ok(result.citationHandles.includes("SEC_REG_S_X"));
      assert.equal(result.contextHash.length, 32);
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("resolved branch FAIL:", (error as Error).message);
  }

  try {
    const result = adaptTreatmentForRole({
      resolution: mkUnresolved(),
      envelope: ENV,
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    assert.equal(result.outcome, "unresolved");
    if (result.outcome === "unresolved") {
      assert.equal(result.escalationTarget.role, "founder");
      assert.equal(result.escalationTarget.contactRef, "mwiseman@advisacor.com");
      assert.deepEqual(
        result.disambiguationTask.candidateFrameworks.sort(),
        ["IFRS", "US_GAAP"].sort(),
      );
      assert.ok(result.disambiguationTask.conflictingRuleIds.includes("RULE-006"));
      assert.ok(result.disambiguationTask.workerInstructions.length > 0);
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("unresolved branch FAIL:", (error as Error).message);
  }

  try {
    const resultA = adaptTreatmentForRole({
      resolution: mkResolved(),
      envelope: ENV,
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    const resultB = adaptTreatmentForRole({
      resolution: mkResolved(),
      envelope: ENV,
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    assert.equal(resultA.contextHash, resultB.contextHash);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("determinism FAIL:", (error as Error).message);
  }

  try {
    const resultA = adaptTreatmentForRole({
      resolution: mkResolved(),
      envelope: ENV,
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    const resultB = adaptTreatmentForRole({
      resolution: mkResolved(),
      envelope: { ...ENV, taskId: "task-2" },
      jurisdictionCountry: "US",
      industryCode: "MANUFACTURING",
    });
    assert.notEqual(resultA.contextHash, resultB.contextHash);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("hash-diverges-per-task FAIL:", (error as Error).message);
  }

  try {
    const personas = [
      "ai-staff-accountant",
      "ai-senior-accountant",
      "ai-accounting-manager",
      "ai-controller-helper",
      "ai-cfo-helper",
      "ai-staff-auditor",
      "ai-senior-auditor",
      "ai-audit-manager-helper",
      "ai-partner-helper",
    ] as const;
    for (const persona of personas) {
      const result = adaptTreatmentForRole({
        resolution: mkResolved(),
        envelope: { ...ENV, role: persona },
        jurisdictionCountry: "US",
        industryCode: "MANUFACTURING",
      });
      assert.equal(result.role, persona);
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("9-personas FAIL:", (error as Error).message);
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runTreatmentRoleAdapterTests();
  console.log(`treatmentRoleAdapter: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
