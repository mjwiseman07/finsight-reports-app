import { hashTreatmentDeterminism } from "./hashTreatmentDeterminism";
import type {
  FrameworkCode,
  ResolveTreatmentInput,
  TreatmentContext,
  TreatmentResolverDeps,
} from "./types";

const FRAMEWORK_ATTESTATION_KEY = "framework_attestation";
const FRAMEWORK_INFERRED_KEY = "framework_inferred";

async function readHistoricalFramework(
  input: ResolveTreatmentInput,
  memoryReader: TreatmentResolverDeps["memoryReader"],
  memoryKey: string,
): Promise<FrameworkCode | null> {
  const record = await memoryReader.queryLatestMemoryRecord({
    companyId: input.companyMemoryHandle.companyId,
    memoryKey,
    periodKeyAtOrBefore: input.reportingPeriod.periodKey,
  });

  if (!record) {
    return null;
  }

  if (memoryKey === FRAMEWORK_INFERRED_KEY) {
    return record.frameworkInferred ?? record.framework ?? null;
  }

  return record.framework ?? null;
}

function deriveInferredConfidence(
  attestedFramework: FrameworkCode | null,
  inferredFramework: FrameworkCode | null,
): TreatmentContext["historicalInferredConfidence"] {
  if (attestedFramework !== null) {
    return "attested";
  }
  if (inferredFramework !== null) {
    return "inferred_high";
  }
  return "unknown";
}

export async function fetchTreatmentContext(
  input: ResolveTreatmentInput,
  deps: Pick<TreatmentResolverDeps, "memoryReader" | "precedenceTableLoader">,
): Promise<TreatmentContext> {
  const [historicalAttestedFramework, historicalInferredFramework, precedenceTable] =
    await Promise.all([
      readHistoricalFramework(input, deps.memoryReader, FRAMEWORK_ATTESTATION_KEY),
      readHistoricalFramework(input, deps.memoryReader, FRAMEWORK_INFERRED_KEY),
      deps.precedenceTableLoader.load(),
    ]);

  const historicalInferredConfidence = deriveInferredConfidence(
    historicalAttestedFramework,
    historicalInferredFramework,
  );

  const contextDeterminismHash = hashTreatmentDeterminism({
    input,
    precedenceTable,
    historicalAttestedFramework,
    historicalInferredFramework,
    historicalInferredConfidence,
  });

  return {
    input,
    precedenceTable,
    historicalAttestedFramework,
    historicalInferredFramework,
    historicalInferredConfidence,
    contextDeterminismHash,
  };
}
