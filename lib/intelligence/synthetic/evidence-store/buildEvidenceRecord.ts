import type { SyntheticEvidenceRecord } from "../types/evidence";

export function buildEvidenceRecord(input: SyntheticEvidenceRecord): SyntheticEvidenceRecord {
  return {
    id: input.id,
    companyId: input.companyId,
    moduleKey: input.moduleKey,
    evidenceType: input.evidenceType,
    sourceRefs: input.sourceRefs || [],
    metrics: input.metrics || [],
    comparisons: input.comparisons || [],
    qualityFlags: input.qualityFlags || [],
    createdAt: input.createdAt,
  };
}
