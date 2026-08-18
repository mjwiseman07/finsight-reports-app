import { requireAuthoritativeBaselineSyncId } from "@/lib/audit-ready/tie-out/baseline-sync-custody";
import { hashMeasurementSnapshotBody } from "./hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ArAgingMeasurementPayload,
  type TieOutArMeasurementSnapshot,
} from "./types";

const SECRET_KEY = /token|secret|authorization|password|cookie|apikey|api_key|refresh/i;

export function asIsoDate(value: unknown): string {
  return String(value ?? "").trim().slice(0, 10);
}

export function assertNoSecrets(value: unknown, path = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key)) {
        throw new MeasurementSnapshotError(
          MEASUREMENT_SNAPSHOT_ERROR.SECRETS_FORBIDDEN,
          `Forbidden secret-shaped key at ${path}.${key}`,
        );
      }
      assertNoSecrets(entry, `${path}.${key}`);
    }
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function assertArAgingPayload(
  payload: unknown,
): asserts payload is ArAgingMeasurementPayload {
  if (!payload || typeof payload !== "object") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AR snapshot payload must be an object.",
    );
  }
  const raw = payload as Record<string, unknown>;
  if (raw.currency != null && typeof raw.currency !== "string") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AR snapshot currency must be a string or null.",
    );
  }
  if (!isFiniteNumber(raw.subledgerTotalCents)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AR snapshot subledgerTotalCents must be a finite number.",
    );
  }
  if (!Array.isArray(raw.customers)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AR snapshot customers must be an array.",
    );
  }
  for (const customer of raw.customers) {
    if (!customer || typeof customer !== "object") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot customer rows must be objects.",
      );
    }
    const row = customer as Record<string, unknown>;
    if (typeof row.entityRef !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot customer entityRef must be a string.",
      );
    }
    if (row.displayName != null && typeof row.displayName !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot customer displayName must be a string or null.",
      );
    }
    if (!isFiniteNumber(row.totalCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot customer totalCents must be a finite number.",
      );
    }
  }
  if (!Array.isArray(raw.trialBalance)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AR snapshot trialBalance must be an array.",
    );
  }
  for (const line of raw.trialBalance) {
    if (!line || typeof line !== "object") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance rows must be objects.",
      );
    }
    const row = line as Record<string, unknown>;
    if (typeof row.accountRef !== "string" || !row.accountRef.trim()) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance accountRef must be a non-empty string.",
      );
    }
    if (row.accountName != null && typeof row.accountName !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance accountName must be a string or null.",
      );
    }
    if (row.debitCents != null && !isFiniteNumber(row.debitCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance debitCents must be a finite number or null.",
      );
    }
    if (row.creditCents != null && !isFiniteNumber(row.creditCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance creditCents must be a finite number or null.",
      );
    }
    if (!isFiniteNumber(row.netCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "AR snapshot trialBalance netCents must be a finite number.",
      );
    }
  }
}

export type ArSnapshotExpectedCustody = {
  asOfDate: string;
  companyId: string;
  accountingConnectionId: string;
  provider: string;
  tenantOrRealmId: string;
  accountingSyncId?: string | null;
};

export function validateArMeasurementSnapshot(
  snapshot: TieOutArMeasurementSnapshot,
  expected: ArSnapshotExpectedCustody,
): TieOutArMeasurementSnapshot {
  if (snapshot.snapshotKind !== AR_AGING_SNAPSHOT_KIND) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.KIND_INVALID,
      `snapshotKind must be ${AR_AGING_SNAPSHOT_KIND}.`,
    );
  }
  if (snapshot.schemaVersion !== TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SCHEMA_UNSUPPORTED,
      `schemaVersion ${snapshot.schemaVersion} is not supported.`,
    );
  }
  let accountingSyncId: string;
  try {
    accountingSyncId = requireAuthoritativeBaselineSyncId(snapshot.accountingSyncId);
  } catch {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_ID_MISSING,
      "A non-empty accounting_syncs.id is required on the AR measurement snapshot.",
    );
  }
  if (
    expected.accountingSyncId &&
    requireAuthoritativeBaselineSyncId(expected.accountingSyncId) !== accountingSyncId
  ) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Snapshot accountingSyncId does not match expected sync custody.",
    );
  }
  if (asIsoDate(snapshot.asOfDate) !== asIsoDate(expected.asOfDate)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.AS_OF_MISMATCH,
      "AR snapshot asOfDate must equal the resolver asOfDate.",
    );
  }
  if (
    snapshot.companyId !== expected.companyId ||
    snapshot.accountingConnectionId !== expected.accountingConnectionId ||
    snapshot.provider !== expected.provider ||
    snapshot.tenantOrRealmId !== expected.tenantOrRealmId
  ) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Snapshot company/connection/provider/realm does not match resolver custody.",
    );
  }
  assertArAgingPayload(snapshot.payload);
  assertNoSecrets(snapshot.payload);
  assertNoSecrets(snapshot.sourceRequestIds);
  const expectedHash = hashMeasurementSnapshotBody({
    schemaVersion: snapshot.schemaVersion,
    snapshotKind: snapshot.snapshotKind,
    asOfDate: asIsoDate(snapshot.asOfDate),
    payload: snapshot.payload,
  });
  if (snapshot.payloadHash !== expectedHash) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      "AR snapshot payloadHash does not match canonical SHA-256 of the hash body.",
    );
  }
  return snapshot;
}
