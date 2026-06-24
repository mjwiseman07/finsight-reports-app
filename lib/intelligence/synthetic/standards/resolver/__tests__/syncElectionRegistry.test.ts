import assert from "node:assert/strict";
import { getSyncRegistrySize, lookupSyncElection, __testOnly } from "../syncElectionRegistry";

const { validateEntry } = __testOnly;

export function runSyncElectionRegistryTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  try {
    assert.equal(getSyncRegistrySize(), 0, "starter registry must be empty");
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("registry empty FAIL:", (error as Error).message);
  }

  try {
    assert.equal(lookupSyncElection(undefined), null);
    assert.equal(lookupSyncElection("does-not-exist"), null);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("lookup missing FAIL:", (error as Error).message);
  }

  try {
    assert.throws(
      () =>
        validateEntry(
          {
            companyId: "c1",
            electedFramework: "IFRS_SME",
            electedAt: "2026-01-01T00:00:00Z",
            electedBy: "u1",
            electionScope: "company",
            electionEvidenceRef: "GOV-1",
          },
          0,
        ),
      /eligibilityAttestation/,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate missing attestation FAIL:", (error as Error).message);
  }

  try {
    assert.throws(
      () =>
        validateEntry(
          {
            companyId: "c1",
            electedFramework: "IFRS_SME",
            electedAt: "2026-01-01T00:00:00Z",
            electedBy: "u1",
            electionScope: "company",
            electionEvidenceRef: "GOV-1",
            eligibilityAttestation: {
              noPublicAccountability: false,
              publishesGeneralPurposeFinancialStatements: true,
              attestedBy: "u1",
              attestedAt: "2026-01-01T00:00:00Z",
              citationHandle: "IFRS_FOR_SMES_S1",
            },
          },
          0,
        ),
      /public accountability/,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate public accountability FAIL:", (error as Error).message);
  }

  try {
    validateEntry(
      {
        companyId: "c1",
        electedFramework: "IFRS_SME",
        electedAt: "2026-01-01T00:00:00Z",
        electedBy: "u1",
        electionScope: "company",
        electionEvidenceRef: "GOV-1",
        eligibilityAttestation: {
          noPublicAccountability: true,
          publishesGeneralPurposeFinancialStatements: true,
          attestedBy: "u1",
          attestedAt: "2026-01-01T00:00:00Z",
          citationHandle: "IFRS_FOR_SMES_S1",
        },
      },
      0,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate well-formed FAIL:", (error as Error).message);
  }

  try {
    assert.throws(
      () =>
        validateEntry(
          {
            companyId: "c1",
            electedFramework: "US_GAAP",
            electedAt: "2026-01-01",
            electedBy: "u1",
            electionScope: "company",
            electionEvidenceRef: "GOV-1",
          },
          0,
        ),
      /ISO-8601/,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate bad timestamp FAIL:", (error as Error).message);
  }

  try {
    assert.throws(
      () =>
        validateEntry(
          {
            companyId: "c1",
            electedFramework: "US_GAAP",
            electedAt: "2026-01-01T00:00:00Z",
            electedBy: "u1",
            electionScope: "company",
            electionEvidenceRef: "",
          },
          0,
        ),
      /electionEvidenceRef/,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate missing evidence FAIL:", (error as Error).message);
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runSyncElectionRegistryTests();
  console.log(`syncElectionRegistry: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
