// D6.4b: Write an AP Accrual Manifest into company_memory_records via the
// sanctioned memory-write path (upsertMemory). Deterministic memory_id keyed on
// (firmClientId, closePeriodId) makes re-booking a period idempotent and lets
// D6.4c mutate line matchStatus in place.
//
// Drift reconciliation (P1/P2): the sanctioned path cannot set
// intelligence_record_type (not a parameter; intelligence_scope is derived).
// We therefore follow the real P1 convention using domain/subdomain/topic +
// entity_type/entity_id, mirroring the D5.6 operational_note precedent.
import { upsertMemory } from "@/lib/memory/client-memory-service";
import { validateManifest, type ApAccrualManifestPayload } from "./manifest-schema";

export interface WriteManifestArgs {
  payload: ApAccrualManifestPayload;
}

export interface WriteManifestResult {
  memoryId: string;
  recordVersion: number;
}

export function apAccrualManifestMemoryId(firmClientId: string, closePeriodId: string): string {
  return `mem_${firmClientId}_ap_accrual_manifest_${closePeriodId}`;
}

export async function writeApAccrualManifest(
  args: WriteManifestArgs,
): Promise<WriteManifestResult> {
  validateManifest(args.payload);
  const p = args.payload;
  const memoryId = apAccrualManifestMemoryId(p.firmClientId, p.closePeriodId);

  const { memory_id } = await upsertMemory({
    firmClientId: p.firmClientId,
    memoryType: "ap_accrual_manifest",
    memoryId,
    memoryKey: `ap_accrual_manifest:${p.closePeriodId}`,
    domain: "accruals",
    subdomain: "ap",
    topic: "manifest",
    entityType: "close_period",
    entityId: p.closePeriodId,
    sourceSystem: "d6.4b.accruals",
    payload: p as unknown as Record<string, unknown>,
  });

  return { memoryId: memory_id, recordVersion: 1 };
}
