/**
 * CC-2B — persisted Continuous Close OBSERVE contracts.
 *
 * Persistence/composition only. CC-1 remains readiness authority.
 */

import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import type { ContinuousCloseObserveResult } from "@/lib/continuous-close/observe";
import type {
  AuthoritativeObservationExecutionContext,
  AuthoritativeObservationInput,
  AuthoritativeObservationMode,
  AuthoritativeObservationResult,
} from "@/lib/audit-ready/authoritative-observation/types";

export const PERSIST_OBSERVE_ERROR = {
  POLICY_REQUIRED: "observe_policy_required",
  OBSERVATION_FAILED: "authoritative_observation_failed",
  TRIO_INCOMPLETE: "authoritative_snapshot_trio_incomplete",
  SYNC_UNAVAILABLE: "accounting_sync_unavailable",
  SYNC_NOT_SUCCESS: "accounting_sync_not_success",
  SYNC_COMPANY_MISMATCH: "accounting_sync_company_mismatch",
  SYNC_CONNECTION_MISMATCH: "accounting_sync_connection_mismatch",
  SYNC_PERIOD_MISMATCH: "accounting_sync_period_mismatch",
  PROVIDER_UNSUPPORTED: "accounting_provider_unsupported",
  LEDGER_PUBLISH_FAILED: "ledger_publish_failed",
  PERSIST_FAILED: "continuous_close_run_persist_failed",
} as const;

export type PersistObserveErrorCode =
  (typeof PERSIST_OBSERVE_ERROR)[keyof typeof PERSIST_OBSERVE_ERROR];

export type AuthoritativeUrmKind = "ar_aging" | "ap_aging" | "inventory";

export type SelectedUrmRuns = {
  ar_aging?: string;
  ap_aging?: string;
  inventory?: string;
};

export type ContinuousCloseRunRow = {
  id: string;
  company_id: string;
  engagement_id: string;
  firm_client_id: string | null;
  close_period_id: string | null;
  accounting_sync_id: string;
  period_end: string;
  mode: "OBSERVE";
  readiness: "READY" | "READY_WITH_REVIEW" | "BLOCKED";
  status: "completed";
  policy_hash: string;
  input_hash: string;
  policy_snapshot: Record<string, unknown>;
  observation_summary: Record<string, unknown>;
  result: Record<string, unknown>;
  created_by: string;
  started_at: string;
  completed_at: string;
  supersedes_run_id: string | null;
  idempotency_key: string;
  created_at?: string;
};

export type PersistContinuousCloseRunInput = {
  row: ContinuousCloseRunRow;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type PersistContinuousCloseRunResult = {
  reused: boolean;
  row: ContinuousCloseRunRow;
  ledgerEventId: string | null;
};

export type ObserveAccountingState = {
  accountingSyncId: string;
  companyId: string;
  accountingConnectionId: string;
  provider: "quickbooks" | "xero";
  tenantOrRealmId: string;
  periodStart: string;
  periodEnd: string;
  syncedAt: string | null;
  statementControl: unknown;
  statementControlContractVersion: number | null;
};

export type ObservationSummary = {
  observationId: string;
  observationMode: AuthoritativeObservationMode;
  acquisitionId: string | null;
  accountingSyncId: string;
  periodEnd: string | null;
  status: AuthoritativeObservationResult["status"];
  reconciliations: {
    ar: { runId: string | null; authoritative: boolean; baselineSyncId: string | null };
    ap: { runId: string | null; authoritative: boolean; baselineSyncId: string | null };
    inventory: {
      runId: string | null;
      authoritative: boolean;
      baselineSyncId: string | null;
    };
  };
  snapshotHashes?: AuthoritativeObservationResult["custody"]["snapshotHashes"];
};

export type RunAndPersistAuthoritativeObserveSuccess = {
  ok: true;
  reused: boolean;
  run: ContinuousCloseRunRow;
  observe: ContinuousCloseObserveResult | null;
  observation: AuthoritativeObservationResult;
  ledgerEventId: string | null;
};

export type RunAndPersistAuthoritativeObserveFailure = {
  ok: false;
  code: string;
  message: string;
  observation?: AuthoritativeObservationResult;
};

export type RunAndPersistAuthoritativeObserveResult =
  | RunAndPersistAuthoritativeObserveSuccess
  | RunAndPersistAuthoritativeObserveFailure;

export type RunAndPersistAuthoritativeObserveArgs = {
  input: AuthoritativeObservationInput;
  executionContext: AuthoritativeObservationExecutionContext;
  observePolicy: ContinuousCloseObservePolicy;
};
