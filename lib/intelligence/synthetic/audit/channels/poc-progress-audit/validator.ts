import type { POCProgressAuditEntry } from "./types";
import { POC_PROGRESS_AUDIT_CHANNEL_ID, POC_PROGRESS_AUDIT_EVIDENCE_VERSION } from "./types";

export function validatePOCProgressAuditEntry(entry: POCProgressAuditEntry): void {
  if (entry.channelId !== POC_PROGRESS_AUDIT_CHANNEL_ID) {
    throw new Error("POC_PROGRESS_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== POC_PROGRESS_AUDIT_EVIDENCE_VERSION) {
    throw new Error("POC_PROGRESS_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsConstructionContractData !== true) {
    throw new Error("POC_PROGRESS_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("POC_PROGRESS_AUDIT_OUTCOME_REQUIRED");
  }
}
