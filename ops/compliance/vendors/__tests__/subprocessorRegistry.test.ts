/**
 * Subprocessor registry tests — delegates to static construction suite.
 * containsVerticalComplianceLogic: false executable: false
 */
import { executeSubprocessorRegistryStaticConstructionTests } from "../subprocessorRegistryStaticConstructionTests";

export function runSubprocessorRegistryTests(): boolean {
  const result = executeSubprocessorRegistryStaticConstructionTests();
  if (!result.pass) {
    for (const failure of result.results.filter((entry) => !entry.passed)) {
      console.error(`FAIL ${failure.caseId}: ${failure.description}`);
    }
  }
  return result.pass;
}

if (require.main === module) {
  process.exit(runSubprocessorRegistryTests() ? 0 : 1);
}
