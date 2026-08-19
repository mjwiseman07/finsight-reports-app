/**
 * CC-2A4 — in-memory authoritative AR+AP+Inventory observation contracts.
 *
 * Modes are a required discriminant. FRESH_CAPTURE and REPLAY_EXISTING_SYNC
 * are different custody events and must never share a provider/sync path.
 * This result is not persisted and is not continuous_close_runs.
 */

import type { PolicySnapshot } from "@/lib/audit-ready/tie-out/policy";
import type { TieOutMeasurementSource } from "@/lib/audit-ready/tie-out/baseline-sync-custody";
import type { ArAcquisitionConnection } from "@/lib/audit-ready/measurement-snapshots/acquisition";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";

export const AUTHORITATIVE_OBSERVATION_MODES = [
  "FRESH_CAPTURE",
  "REPLAY_EXISTING_SYNC",
] as const;

export type AuthoritativeObservationMode =
  (typeof AUTHORITATIVE_OBSERVATION_MODES)[number];

export type AuthoritativeTriggerReason =
  | "manual"
  | "scheduled"
  | "memory_replay"
  | "api";

export type AuthoritativePbcRequestIds = {
  ar?: string;
  ap?: string;
  inventory?: string;
};

type AuthoritativeObservationSharedInput = {
  engagementId: string;
  triggerReason: AuthoritativeTriggerReason;
  pbcRequestIds?: AuthoritativePbcRequestIds;
  closePeriodEnd?: string;
  /**
   * Not authority. If present at runtime, must equal the verified actor.userId.
   * Prefer omitting it; trigger metadata is derived from the execution principal.
   */
  triggeredByUserId?: never;
};

/**
 * Verified human principal. The calling boundary must already have authenticated
 * this actor (e.g. getEngagementActor / requireAuditReadyUser). A raw user id in
 * observation input is not authentication.
 */
export type AuthoritativeVerifiedUserPrincipal = {
  type: "user";
  actor: EngagementActor;
};

/** v1: accepted only as an explicit fail-closed shape. Not executable. */
export type AuthoritativeSystemPrincipal = {
  type: "system";
  service: string;
};

export type AuthoritativeObservationExecutionContext = {
  principal: AuthoritativeVerifiedUserPrincipal | AuthoritativeSystemPrincipal;
};

export type FreshCaptureObservationInput = AuthoritativeObservationSharedInput & {
  mode: "FRESH_CAPTURE";
  /** Type-level rejection. Runtime also fails closed if present. */
  accountingSyncId?: never;
};

export type ReplayExistingSyncObservationInput = AuthoritativeObservationSharedInput & {
  mode: "REPLAY_EXISTING_SYNC";
  accountingSyncId: string;
};

export type AuthoritativeObservationInput =
  | FreshCaptureObservationInput
  | ReplayExistingSyncObservationInput;

export type AuthoritativeObservationStatus = "completed" | "partial" | "failed";

export type AuthoritativeReconKind = "ar" | "ap" | "inventory";

export type AuthoritativeFailureRecon =
  | AuthoritativeReconKind
  | "acquisition"
  | "verification"
  | "context";

export type AuthoritativeFailure = {
  code: string;
  message: string;
  recon?: AuthoritativeFailureRecon;
};

export type AuthoritativeReconSlot = {
  runId: string | null;
  status: "completed" | "failed" | "partial" | "not_run";
  totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout" | null;
  baselineSyncId: string | null;
  measurementSource: TieOutMeasurementSource | null;
  authoritative: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type AuthoritativeObservationResult = {
  observationId: string;
  acquisitionId: string | null;
  mode: AuthoritativeObservationMode | null;
  accountingSyncId: string | null;
  companyId: string | null;
  engagementId: string;
  periodEnd: string | null;
  status: AuthoritativeObservationStatus;
  reconciliations: {
    ar: AuthoritativeReconSlot | null;
    ap: AuthoritativeReconSlot | null;
    inventory: AuthoritativeReconSlot | null;
  };
  custody: {
    allSameSync: boolean;
    snapshotsPresent: Array<"ar_aging" | "ap_aging" | "inventory">;
    snapshotHashes?: {
      ar: string | null;
      ap: string | null;
      inventory: string | null;
    };
  };
  failures: AuthoritativeFailure[];
};

export type AuthoritativeObservationContext = {
  engagementId: string;
  companyId: string;
  actor: EngagementActor;
  /** Derived from the verified actor. Never taken from raw observation input. */
  triggeredByUserId: string;
  connectionId: string;
  provider: string;
  tenantOrRealmId: string;
  periodEnd: string;
  reportPeriod: { startDate: string; endDate: string };
  arAccountId: string;
  apAccountId: string;
  inventoryAccountId: string;
  policy: PolicySnapshot & { policy_mode: string };
  pbcRequestIds: { ar: string; ap: string; inventory: string };
  /** FRESH acquisition only. Never copied onto the observation result. */
  acquisitionConnection: ArAcquisitionConnection;
};

export const AUTHORITATIVE_OBSERVATION_ERROR = {
  MODE_REQUIRED: "mode_required",
  UNKNOWN_MODE: "unknown_mode",
  FRESH_SYNC_ID_FORBIDDEN: "fresh_accounting_sync_id_forbidden",
  REPLAY_SYNC_ID_REQUIRED: "replay_accounting_sync_id_required",
  WRITE_FORBIDDEN: "write_forbidden",
  AUTHENTICATED_ACTOR_REQUIRED: "authenticated_actor_required",
  UNSUPPORTED_PRINCIPAL: "unsupported_principal",
  TRIGGERED_BY_IMPERSONATION: "triggered_by_impersonation",
  CROSS_COMPANY_FORBIDDEN: "cross_company_forbidden",
  ENGAGEMENT_NOT_FOUND: "engagement_not_found",
  COMPANY_UNRESOLVED: "company_unresolved",
  CONNECTION_NOT_FOUND: "connection_not_found",
  CLOSE_PERIOD_UNRESOLVED: "close_period_unresolved",
  CLOSE_PERIOD_MISMATCH: "close_period_mismatch",
  AR_ACCOUNT_ID_REQUIRED: "ar_account_id_required",
  AP_ACCOUNT_ID_REQUIRED: "ap_account_id_required",
  INVENTORY_ACCOUNT_ID_REQUIRED: "inventory_account_id_required",
  NO_TOLERANCE_POLICY: "no_tolerance_policy",
  MISSING_PBC_AR: "missing_pbc_ar_aging",
  AMBIGUOUS_PBC_AR: "ambiguous_pbc_ar_aging",
  MISSING_PBC_AP: "missing_pbc_ap_aging",
  AMBIGUOUS_PBC_AP: "ambiguous_pbc_ap_aging",
  MISSING_PBC_INVENTORY: "missing_pbc_inventory",
  AMBIGUOUS_PBC_INVENTORY: "ambiguous_pbc_inventory",
  PBC_CALLER_MISMATCH: "pbc_caller_mismatch",
  SNAPSHOT_CUSTODY_MISMATCH: "snapshot_custody_mismatch",
  REPLAY_PARENT_NOT_SUCCESS: "replay_parent_not_success",
  REPLAY_PARENT_COMPANY_MISMATCH: "replay_parent_company_mismatch",
  REPLAY_PARENT_CONNECTION_MISMATCH: "replay_parent_connection_mismatch",
  REPLAY_PARENT_PERIOD_MISMATCH: "replay_parent_period_mismatch",
  REPLAY_AR_SNAPSHOT_MISSING: "replay_ar_snapshot_missing",
  REPLAY_AP_SNAPSHOT_MISSING: "replay_ap_snapshot_missing",
  REPLAY_INVENTORY_SNAPSHOT_MISSING: "replay_inventory_snapshot_missing",
  BASELINE_SYNC_MISMATCH: "baseline_sync_mismatch",
  MEASUREMENT_SOURCE_INVALID: "measurement_source_invalid",
  RUN_ENGAGEMENT_MISMATCH: "run_engagement_mismatch",
  RUN_PERIOD_MISMATCH: "run_period_mismatch",
  RUN_KIND_MISMATCH: "run_kind_mismatch",
  RUN_STATUS_NOT_COMPLETED: "run_status_not_completed",
  SELECTOR_NULL: "selector_null",
  SELECTOR_RUN_MISMATCH: "selector_run_mismatch",
} as const;

export class AuthoritativeObservationError extends Error {
  code: string;
  recon?: AuthoritativeFailureRecon;

  constructor(code: string, message: string, recon?: AuthoritativeFailureRecon) {
    super(message);
    this.name = "AuthoritativeObservationError";
    this.code = code;
    if (recon) this.recon = recon;
  }
}
