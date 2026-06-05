import type { SyntheticMemorySourceReference } from "../../company-memory-ingestion";
import type { SyntheticCompanyMemorySourceRef } from "../../types/company-memory";

export function mapSourceReferencesToMemorySourceRefs(
  sourceReferences: SyntheticMemorySourceReference[],
): SyntheticCompanyMemorySourceRef[] {
  return sourceReferences.map((sourceReference) => ({
    sourceType: "historical_snapshot",
    sourceId: sourceReference.sourceId,
    sourceLabel: `${sourceReference.sourceSystem}:${sourceReference.tenantId || "unknown-tenant"}:${sourceReference.periodKey}:${sourceReference.snapshotId}`,
    observedPeriodKey: sourceReference.periodKey,
  }));
}
