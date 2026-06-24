import assert from "node:assert/strict";
import {
  getEscalationRegistrySize,
  selectEscalationTarget,
  __testOnly,
} from "../escalationRegistry";

const { validateEntry } = __testOnly;

export function runEscalationRegistryTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  try {
    assert.equal(getEscalationRegistrySize(), 1);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("registry size FAIL:", (error as Error).message);
  }

  try {
    const target = selectEscalationTarget({
      industryCode: "MANUFACTURING",
      jurisdictionCountry: "US",
      companyId: "any",
    });
    assert.notEqual(target, null);
    assert.equal(target!.role, "founder");
    assert.equal(target!.scope, "universal");
    assert.equal(target!.contactRef, "mwiseman@advisacor.com");
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("universal lookup FAIL:", (error as Error).message);
  }

  try {
    const target = selectEscalationTarget({
      industryCode: "RETAIL",
      jurisdictionCountry: "CA",
      companyId: "co-x",
    });
    assert.equal(target!.role, "founder");
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("retail-CA lookup FAIL:", (error as Error).message);
  }

  try {
    assert.throws(
      () =>
        validateEntry(
          {
            attestedBy: "u",
            attestedAt: "2026-01-01",
            role: "x",
            scope: "universal",
            scopeFilter: {},
            contactRef: "c",
            citationHandle: null,
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
            attestedBy: "u",
            attestedAt: "2026-01-01T00:00:00Z",
            role: "x",
            scope: "industry",
            scopeFilter: {},
            contactRef: "c",
            citationHandle: null,
          },
          0,
        ),
      /industryCode/,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate industry-no-filter FAIL:", (error as Error).message);
  }

  try {
    validateEntry(
      {
        attestedBy: "u",
        attestedAt: "2026-01-01T00:00:00Z",
        role: "controller",
        scope: "company",
        scopeFilter: { companyId: "co-1" },
        contactRef: "c@x.com",
        citationHandle: null,
      },
      0,
    );
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("validate well-formed FAIL:", (error as Error).message);
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runEscalationRegistryTests();
  console.log(`escalationRegistry: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
