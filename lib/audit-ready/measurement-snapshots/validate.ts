import { requireAuthoritativeBaselineSyncId } from "@/lib/audit-ready/tie-out/baseline-sync-custody";
import { hashMeasurementSnapshotBody } from "./hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  AR_AGING_SNAPSHOT_KIND,
  INVENTORY_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ApAgingMeasurementPayload,
  type ArAgingMeasurementPayload,
  type InventoryMeasurementPayload,
  type MeasurementSnapshotKind,
  type MeasurementSnapshotPayload,
  type TieOutApMeasurementSnapshot,
  type TieOutArMeasurementSnapshot,
  type TieOutInventoryMeasurementSnapshot,
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

function assertEntityRow(
  row: unknown,
  label: string,
): asserts row is { entityRef: string; displayName: string | null; totalCents: number } {
  if (!row || typeof row !== "object") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      `${label} rows must be objects.`,
    );
  }
  const raw = row as Record<string, unknown>;
  if (typeof raw.entityRef !== "string") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      `${label} entityRef must be a string.`,
    );
  }
  if (raw.displayName != null && typeof raw.displayName !== "string") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      `${label} displayName must be a string or null.`,
    );
  }
  if (!isFiniteNumber(raw.totalCents)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      `${label} totalCents must be a finite number.`,
    );
  }
}

function assertTrialBalancePayload(raw: Record<string, unknown>, label: string): void {
  if (!Array.isArray(raw.trialBalance)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      `${label} trialBalance must be an array.`,
    );
  }
  for (const line of raw.trialBalance) {
    if (!line || typeof line !== "object") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance rows must be objects.`,
      );
    }
    const row = line as Record<string, unknown>;
    if (typeof row.accountRef !== "string" || !row.accountRef.trim()) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance accountRef must be a non-empty string.`,
      );
    }
    if (row.accountName != null && typeof row.accountName !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance accountName must be a string or null.`,
      );
    }
    if (row.debitCents != null && !isFiniteNumber(row.debitCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance debitCents must be a finite number or null.`,
      );
    }
    if (row.creditCents != null && !isFiniteNumber(row.creditCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance creditCents must be a finite number or null.`,
      );
    }
    if (!isFiniteNumber(row.netCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        `${label} trialBalance netCents must be a finite number.`,
      );
    }
  }
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
    assertEntityRow(customer, "AR snapshot customer");
  }
  assertTrialBalancePayload(raw, "AR snapshot");
}

export function assertApAgingPayload(
  payload: unknown,
): asserts payload is ApAgingMeasurementPayload {
  if (!payload || typeof payload !== "object") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AP snapshot payload must be an object.",
    );
  }
  const raw = payload as Record<string, unknown>;
  if (raw.currency != null && typeof raw.currency !== "string") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AP snapshot currency must be a string or null.",
    );
  }
  if (!isFiniteNumber(raw.subledgerTotalCents)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AP snapshot subledgerTotalCents must be a finite number.",
    );
  }
  if (!Array.isArray(raw.vendors)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "AP snapshot vendors must be an array.",
    );
  }
  for (const vendor of raw.vendors) {
    assertEntityRow(vendor, "AP snapshot vendor");
  }
  assertTrialBalancePayload(raw, "AP snapshot");
}

export function assertInventoryPayload(
  payload: unknown,
): asserts payload is InventoryMeasurementPayload {
  if (!payload || typeof payload !== "object") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "Inventory snapshot payload must be an object.",
    );
  }
  const raw = payload as Record<string, unknown>;
  if (raw.currency != null && typeof raw.currency !== "string") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "Inventory snapshot currency must be a string or null.",
    );
  }
  if (!isFiniteNumber(raw.subledgerTotalCents)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "Inventory snapshot subledgerTotalCents must be a finite number.",
    );
  }
  if (!Array.isArray(raw.items)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
      "Inventory snapshot items must be an array.",
    );
  }
  for (const item of raw.items) {
    if (!item || typeof item !== "object") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "Inventory snapshot item rows must be objects.",
      );
    }
    const row = item as Record<string, unknown>;
    if (typeof row.entityRef !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "Inventory snapshot item entityRef must be a string.",
      );
    }
    if (row.displayName != null && typeof row.displayName !== "string") {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "Inventory snapshot item displayName must be a string or null.",
      );
    }
    if (row.quantityOnHand != null && !isFiniteNumber(row.quantityOnHand)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "Inventory snapshot item quantityOnHand must be a finite number or null.",
      );
    }
    if (!isFiniteNumber(row.assetValueCents)) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.PAYLOAD_INVALID,
        "Inventory snapshot item assetValueCents must be a finite number.",
      );
    }
  }
  assertTrialBalancePayload(raw, "Inventory snapshot");
}

export type ArSnapshotExpectedCustody = {
  asOfDate: string;
  companyId: string;
  accountingConnectionId: string;
  provider: string;
  tenantOrRealmId: string;
  accountingSyncId?: string | null;
};

export type ApSnapshotExpectedCustody = ArSnapshotExpectedCustody;
export type InventorySnapshotExpectedCustody = ArSnapshotExpectedCustody;

function assertSnapshotEnvelopeCustody(args: {
  snapshotKind: string;
  expectedKind: string;
  schemaVersion: number;
  accountingSyncId: string;
  asOfDate: string;
  companyId: string;
  accountingConnectionId: string;
  provider: string;
  tenantOrRealmId: string;
  payload: unknown;
  payloadHash: string;
  sourceRequestIds: unknown;
  expected: ArSnapshotExpectedCustody;
  label: string;
}): string {
  if (args.snapshotKind !== args.expectedKind) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.KIND_INVALID,
      `snapshotKind must be ${args.expectedKind}.`,
    );
  }
  if (args.schemaVersion !== TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SCHEMA_UNSUPPORTED,
      `schemaVersion ${args.schemaVersion} is not supported.`,
    );
  }
  let accountingSyncId: string;
  try {
    accountingSyncId = requireAuthoritativeBaselineSyncId(args.accountingSyncId);
  } catch {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_ID_MISSING,
      `A non-empty accounting_syncs.id is required on the ${args.label} measurement snapshot.`,
    );
  }
  if (
    args.expected.accountingSyncId &&
    requireAuthoritativeBaselineSyncId(args.expected.accountingSyncId) !== accountingSyncId
  ) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Snapshot accountingSyncId does not match expected sync custody.",
    );
  }
  if (asIsoDate(args.asOfDate) !== asIsoDate(args.expected.asOfDate)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.AS_OF_MISMATCH,
      `${args.label} snapshot asOfDate must equal the resolver asOfDate.`,
    );
  }
  if (
    args.companyId !== args.expected.companyId ||
    args.accountingConnectionId !== args.expected.accountingConnectionId ||
    args.provider !== args.expected.provider ||
    args.tenantOrRealmId !== args.expected.tenantOrRealmId
  ) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Snapshot company/connection/provider/realm does not match resolver custody.",
    );
  }
  assertNoSecrets(args.payload);
  assertNoSecrets(args.sourceRequestIds);
  const expectedHash = hashMeasurementSnapshotBody({
    schemaVersion: args.schemaVersion,
    snapshotKind: args.expectedKind as MeasurementSnapshotKind,
    asOfDate: asIsoDate(args.asOfDate),
    payload: args.payload as MeasurementSnapshotPayload,
  });
  if (args.payloadHash !== expectedHash) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      `${args.label} snapshot payloadHash does not match canonical SHA-256 of the hash body.`,
    );
  }
  return accountingSyncId;
}

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
  assertArAgingPayload(snapshot.payload);
  assertSnapshotEnvelopeCustody({
    snapshotKind: snapshot.snapshotKind,
    expectedKind: AR_AGING_SNAPSHOT_KIND,
    schemaVersion: snapshot.schemaVersion,
    accountingSyncId: snapshot.accountingSyncId,
    asOfDate: snapshot.asOfDate,
    companyId: snapshot.companyId,
    accountingConnectionId: snapshot.accountingConnectionId,
    provider: snapshot.provider,
    tenantOrRealmId: snapshot.tenantOrRealmId,
    payload: snapshot.payload,
    payloadHash: snapshot.payloadHash,
    sourceRequestIds: snapshot.sourceRequestIds,
    expected,
    label: "AR",
  });
  return snapshot;
}

export function validateApMeasurementSnapshot(
  snapshot: TieOutApMeasurementSnapshot,
  expected: ApSnapshotExpectedCustody,
): TieOutApMeasurementSnapshot {
  if (snapshot.snapshotKind !== AP_AGING_SNAPSHOT_KIND) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.KIND_INVALID,
      `snapshotKind must be ${AP_AGING_SNAPSHOT_KIND}.`,
    );
  }
  assertApAgingPayload(snapshot.payload);
  assertSnapshotEnvelopeCustody({
    snapshotKind: snapshot.snapshotKind,
    expectedKind: AP_AGING_SNAPSHOT_KIND,
    schemaVersion: snapshot.schemaVersion,
    accountingSyncId: snapshot.accountingSyncId,
    asOfDate: snapshot.asOfDate,
    companyId: snapshot.companyId,
    accountingConnectionId: snapshot.accountingConnectionId,
    provider: snapshot.provider,
    tenantOrRealmId: snapshot.tenantOrRealmId,
    payload: snapshot.payload,
    payloadHash: snapshot.payloadHash,
    sourceRequestIds: snapshot.sourceRequestIds,
    expected,
    label: "AP",
  });
  return snapshot;
}

export function validateInventoryMeasurementSnapshot(
  snapshot: TieOutInventoryMeasurementSnapshot,
  expected: InventorySnapshotExpectedCustody,
): TieOutInventoryMeasurementSnapshot {
  if (snapshot.snapshotKind !== INVENTORY_SNAPSHOT_KIND) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.KIND_INVALID,
      `snapshotKind must be ${INVENTORY_SNAPSHOT_KIND}.`,
    );
  }
  assertInventoryPayload(snapshot.payload);
  assertSnapshotEnvelopeCustody({
    snapshotKind: snapshot.snapshotKind,
    expectedKind: INVENTORY_SNAPSHOT_KIND,
    schemaVersion: snapshot.schemaVersion,
    accountingSyncId: snapshot.accountingSyncId,
    asOfDate: snapshot.asOfDate,
    companyId: snapshot.companyId,
    accountingConnectionId: snapshot.accountingConnectionId,
    provider: snapshot.provider,
    tenantOrRealmId: snapshot.tenantOrRealmId,
    payload: snapshot.payload,
    payloadHash: snapshot.payloadHash,
    sourceRequestIds: snapshot.sourceRequestIds,
    expected,
    label: "Inventory",
  });
  return snapshot;
}
