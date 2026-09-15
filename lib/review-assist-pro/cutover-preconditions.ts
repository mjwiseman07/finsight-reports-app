/**
 * Sanitized cutover inventory preconditions (no production I/O).
 * Sealed constants must match docs/security/ra-pro-cutover-operator-decision.json.
 *
 * Evidence contract (see docs/security/ra-pro-cutover-runbook.md):
 * `assertCutoverPreconditions(observed)` validates caller-supplied observations
 * only. It does not collect or independently authenticate production facts.
 * Every required field must be backed by independently collected, authorized
 * read-only evidence (source, collection time, serving deployment/commit
 * identity, sanitized results). Missing, stale, contradictory, or self-attested
 * values block cutover. Do not fabricate observations or treat unit-test
 * fixtures as production evidence.
 */

export const AUTHORIZED_MAPPING_ARTIFACT_SHA256 =
  "93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953";

export const AUTHORIZED_OPERATOR_DECISION = {
  decision_protocol: "ra-pro-cutover-operator-decision/v1",
  mapping_artifact_sha256: AUTHORIZED_MAPPING_ARTIFACT_SHA256,
  actions: {
    NO_CUTOVER: 4,
    LINK_EXISTING_FIRM: 0,
    CREATE_NEW_FIRM: 0,
  },
  backfill_authorized: false,
  expected_linked_firms_after_migration: 0,
  source_aggregate_counts: {
    authorizing_ra_pro_slots: 4,
    company_owned_slots: 3,
    firm_owned_slots: 1,
    firms_total: 6,
    active_firm_members_distinct: 7,
  },
} as const;

export type CutoverInventoryObservation = {
  authorizing_ra_pro_slots: number;
  company_owned_slots: number;
  firm_owned_slots: number;
  firms_total?: number;
  active_firm_members_distinct?: number;
  /** Authorizing slots created after the mapping snapshot (must be 0). */
  authorizing_slots_after_snapshot: number;
  billing_company_id_column_present: boolean;
  migration_version_present: boolean;
  unexpired_processing_leases: number;
  unreviewed_held_or_retryable_ra_pro_events: number;
  cutover_commerce_gate_closed: boolean;
  mapping_artifact_sha256: string;
};

export type CutoverPreconditionResult =
  | { ok: true }
  | { ok: false; code: string; detail?: string };

/** Predicate over supplied observations — not a production evidence collector. */
export function assertCutoverPreconditions(
  observed: CutoverInventoryObservation,
): CutoverPreconditionResult {
  const d = AUTHORIZED_OPERATOR_DECISION;
  if (observed.mapping_artifact_sha256 !== d.mapping_artifact_sha256) {
    return { ok: false, code: "MAPPING_ARTIFACT_SHA_DRIFT" };
  }
  if (d.backfill_authorized !== false) {
    return { ok: false, code: "BACKFILL_MUST_REMAIN_UNAUTHORIZED" };
  }
  if (d.actions.NO_CUTOVER !== 4) {
    return { ok: false, code: "DECISION_ACTION_DRIFT" };
  }
  if (
    d.actions.LINK_EXISTING_FIRM !== 0 ||
    d.actions.CREATE_NEW_FIRM !== 0
  ) {
    return { ok: false, code: "UNEXPECTED_LINK_OR_CREATE" };
  }
  if (
    observed.authorizing_ra_pro_slots !==
    d.source_aggregate_counts.authorizing_ra_pro_slots
  ) {
    return {
      ok: false,
      code: "AUTHORIZING_SLOT_COUNT_DRIFT",
      detail: String(observed.authorizing_ra_pro_slots),
    };
  }
  if (
    observed.company_owned_slots !==
      d.source_aggregate_counts.company_owned_slots ||
    observed.firm_owned_slots !== d.source_aggregate_counts.firm_owned_slots
  ) {
    return { ok: false, code: "OWNERSHIP_SPLIT_DRIFT" };
  }
  if (observed.authorizing_slots_after_snapshot !== 0) {
    return { ok: false, code: "NEW_SLOT_AFTER_SNAPSHOT" };
  }
  if (observed.billing_company_id_column_present) {
    return { ok: false, code: "BILLING_COMPANY_COLUMN_ALREADY_PRESENT" };
  }
  if (observed.migration_version_present) {
    return { ok: false, code: "MIGRATION_ALREADY_PRESENT" };
  }
  if (observed.unexpired_processing_leases !== 0) {
    return { ok: false, code: "UNEXPIRED_PROCESSING_LEASE" };
  }
  if (observed.unreviewed_held_or_retryable_ra_pro_events !== 0) {
    return { ok: false, code: "UNREVIEWED_HELD_OR_RETRYABLE" };
  }
  if (!observed.cutover_commerce_gate_closed) {
    return { ok: false, code: "CUTOVER_COMMERCE_GATE_NOT_CLOSED" };
  }
  return { ok: true };
}
