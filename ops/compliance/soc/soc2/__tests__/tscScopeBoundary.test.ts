/**
 * TSC scope boundary tests — delegates to static construction suite.
 * containsVerticalComplianceLogic: false executable: false
 */
import { executeTscScopeBoundaryStaticConstructionTests } from "../tscScopeBoundaryStaticConstructionTests";

export function runTscScopeBoundaryTests(): boolean {
  const result = executeTscScopeBoundaryStaticConstructionTests();
  if (!result.pass) {
    for (const failure of result.results.filter((entry) => !entry.passed)) {
      console.error(`FAIL ${failure.caseId}: ${failure.reason}`);
    }
  }
  return result.pass;
}

if (require.main === module) {
  process.exit(runTscScopeBoundaryTests() ? 0 : 1);
}
