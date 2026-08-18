import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type TieOutArMeasurementSnapshot,
} from "../types";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import {
  persistArMeasurementSnapshot,
  assertAsOfMatchesReportPeriodEnd,
} from "../repository";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const payload = {
  currency: "USD",
  customers: [{ entityRef: "1", displayName: "Acme", totalCents: 500 }],
  subledgerTotalCents: 500,
  trialBalance: [
    {
      accountRef: "84",
      accountName: "AR",
      debitCents: 500,
      creditCents: 0,
      netCents: 500,
    },
  ],
};

function snapshot(
  over: Partial<TieOutArMeasurementSnapshot> = {},
): TieOutArMeasurementSnapshot {
  const asOfDate = over.asOfDate ?? "2026-07-31";
  const bodyPayload = over.payload ?? payload;
  const payloadHash =
    over.payloadHash ??
    hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
      asOfDate,
      payload: bodyPayload,
    });
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: over.accountingSyncId ?? SYNC,
    accountingConnectionId: over.accountingConnectionId ?? CONN,
    companyId: over.companyId ?? COMPANY,
    provider: over.provider ?? "quickbooks",
    tenantOrRealmId: over.tenantOrRealmId ?? "realm-1",
    snapshotKind: over.snapshotKind ?? AR_AGING_SNAPSHOT_KIND,
    asOfDate,
    capturedAt: over.capturedAt ?? "2026-08-17T16:00:00.000Z",
    payloadHash,
    sourceRequestIds: over.sourceRequestIds ?? {},
    payload: bodyPayload,
  };
}

type Stored = Record<string, unknown>;
let stored: Stored | null = null;
let inserts: Stored[] = [];
let updateCalls = 0;

function snapshotSelectChain() {
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    async maybeSingle() {
      return { data: stored, error: null };
    },
    insert(row: Stored) {
      inserts.push(row);
      stored = {
        id: "snap-1",
        created_at: "2026-08-17T16:01:00.000Z",
        ...row,
      };
      return chain;
    },
    update() {
      updateCalls += 1;
      return chain;
    },
    async single() {
      return { data: stored, error: null };
    },
  };
  return chain;
}

function syncSelectChain(row: Stored | null) {
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    async maybeSingle() {
      return { data: row, error: null };
    },
  };
  return chain;
}

describe("AR measurement snapshot persistence", () => {
  beforeEach(() => {
    stored = null;
    inserts = [];
    updateCalls = 0;
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      if (table === "accounting_measurement_snapshots") return snapshotSelectChain();
      if (table === "accounting_syncs") {
        return syncSelectChain({
          id: SYNC,
          company_id: COMPANY,
          connection_id: CONN,
          source_system: "quickbooks",
          tenant_id: "realm-1",
          report_period_end: "2026-07-31",
          validation_status: "SUCCESS",
        });
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it("5. snapshot row references the exact accounting_sync_id", async () => {
    const result = await persistArMeasurementSnapshot(snapshot());
    expect(result.reused).toBe(false);
    expect(inserts[0]?.accounting_sync_id).toBe(SYNC);
    expect(result.snapshot.accountingSyncId).toBe(SYNC);
  });

  it("6. same sync/kind/as-of + same hash reuses the existing row", async () => {
    await persistArMeasurementSnapshot(snapshot());
    inserts = [];
    const second = await persistArMeasurementSnapshot(
      snapshot({ capturedAt: "2026-08-18T00:00:00.000Z" }),
    );
    expect(second.reused).toBe(true);
    expect(inserts).toHaveLength(0);
  });

  it("7. same sync/kind/as-of + different hash fails closed", async () => {
    await persistArMeasurementSnapshot(snapshot());
    const otherPayload = {
      ...payload,
      subledgerTotalCents: 900,
      customers: [{ entityRef: "1", displayName: "Acme", totalCents: 900 }],
    };
    try {
      await persistArMeasurementSnapshot(snapshot({ payload: otherPayload }));
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MeasurementSnapshotError);
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.IMMUTABLE_CONFLICT,
      );
    }
  });

  it("8. persist never updates an existing snapshot row", async () => {
    await persistArMeasurementSnapshot(snapshot());
    await persistArMeasurementSnapshot(snapshot());
    expect(updateCalls).toBe(0);
  });

  it("period equality is validation, not capture authority", () => {
    expect(() =>
      assertAsOfMatchesReportPeriodEnd("2026-07-31", "2026-06-30"),
    ).toThrow(MeasurementSnapshotError);
    try {
      assertAsOfMatchesReportPeriodEnd("2026-07-31", "2026-06-30");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.SYNC_PERIOD_MISMATCH,
      );
    }
    expect(() => assertAsOfMatchesReportPeriodEnd("2026-07-31", "2026-07-31")).not.toThrow();
  });
});
