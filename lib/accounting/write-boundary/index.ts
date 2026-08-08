// WBP W1b — Barrel export. Callers (W1c adapters) import from here only.

export { validateJournalEntry } from "./validator";
export { detectDrift } from "./drift-detector";
export type { DriftResult } from "./drift-detector";
export {
  isForbiddenXeroAccount,
  isForbiddenQboAccount,
  forbiddenRulesSnapshot,
} from "./forbidden-accounts";
export type { ForbiddenAccountReason } from "./forbidden-accounts";
export {
  readXeroAccounts,
  readQboAccounts,
  upsertXeroAccounts,
  upsertQboAccounts,
  countXeroAccounts,
  countQboAccounts,
} from "./accounts-cache-repo";
export type { XeroAccountUpsertInput, QboAccountUpsertInput } from "./accounts-cache-repo";
export { writeEnabled, writeDisabledReason } from "./kill-switch";
export { findPriorWriteByExternalRef } from "./idempotency";
export type { PriorWriteHit } from "./idempotency";
export { emitWriteLifecycleEvent, computeRequestHash } from "./event-emitter";
export type { EmitWriteLifecycleEventParams } from "./event-emitter";
export type {
  XeroAccountSnapshot,
  QboAccountSnapshot,
  WriteBoundaryConnection,
  ProviderWriteResponse,
  WriteLifecycleEventKind,
  WriteLifecyclePayload,
} from "./types";

// Re-exports from the W1a contract for consumer convenience
export type {
  JournalEntry,
  JournalLine,
  ValidationIssue,
  ValidationResult,
  WriteReceipt,
  AccountsCacheRefreshResult,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
export {
  WriteBoundaryError,
  WriteRejected,
  WriteDrifted,
  WriteFailed,
  WriteBoundaryDisabled,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
