import type { ArrMrrAuditEntry } from "./types";
import { ARR_MRR_AUDIT_CHANNEL_ID, ARR_MRR_AUDIT_EVIDENCE_VERSION } from "./types";

export function validateArrMrrAuditEntry(entry: ArrMrrAuditEntry): void {
  if (entry.channelId !== ARR_MRR_AUDIT_CHANNEL_ID) {
    throw new Error("ARR_MRR_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== ARR_MRR_AUDIT_EVIDENCE_VERSION) {
    throw new Error("ARR_MRR_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsSaaSARRData !== true) {
    throw new Error("ARR_MRR_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("ARR_MRR_AUDIT_OUTCOME_REQUIRED");
  }
}
