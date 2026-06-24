import { hashTreatmentDeterminism } from "../hashTreatmentDeterminism";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runTreatmentDeterminismHashTests(): boolean {
  const inputA = {
    contextDeterminismHash: "ctx-abc",
    chosenFramework: "US_GAAP",
    matchedRules: ["RULE-001"],
    unresolvedConflicts: [],
  };
  const inputB = {
    unresolvedConflicts: [],
    matchedRules: ["RULE-001"],
    chosenFramework: "US_GAAP",
    contextDeterminismHash: "ctx-abc",
  };
  const hashA = hashTreatmentDeterminism(inputA);
  const hashB = hashTreatmentDeterminism(inputB);
  assert(hashA === hashB, "Identical semantic input should produce identical hash");

  const inputC = {
    ...inputA,
    chosenFramework: "IFRS",
  };
  const hashC = hashTreatmentDeterminism(inputC);
  assert(hashA !== hashC, "Single byte change should produce different hash");

  assert(/^[a-f0-9]{64}$/.test(hashA), "Hash should be SHA-256 hex-encoded");

  return true;
}

if (require.main === module) {
  try {
    const pass = runTreatmentDeterminismHashTests();
    console.log(pass ? "PASS treatmentDeterminismHash" : "FAIL treatmentDeterminismHash");
    process.exit(pass ? 0 : 1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
