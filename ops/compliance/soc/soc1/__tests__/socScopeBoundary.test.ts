/**
 * SOC scope boundary tests — delegates to static construction suite.
 * containsVerticalComplianceLogic: false executable: false
 */
import { executeSocScopeBoundaryStaticConstructionTests } from "../socScopeBoundaryStaticConstructionTests";

export function runSocScopeBoundaryTests(): boolean {
  const result = executeSocScopeBoundaryStaticConstructionTests();
  if (!result.pass) {
    for (const failure of result.results.filter((entry) => !entry.passed)) {
      console.error(`FAIL ${failure.caseId}: ${failure.reason}`);
    }
  }
  return result.pass;
}

if (require.main === module) {
  process.exit(runSocScopeBoundaryTests() ? 0 : 1);
}
