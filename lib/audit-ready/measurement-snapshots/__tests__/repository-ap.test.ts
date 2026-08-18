import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type TieOutApMeasurementSnapshot,
} from "../types";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { persistApMeasurementSnapshot } from "../repository";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const payload = {
  currency: "USD",
  vendors: [{ entityRef: "1", displayName: "Vendor A", totalCents: 500 }],
  subledgerTotalCents: 500,
  trialBalance: [
    {
      accountRef: "33",
      accountName: "AP",
      debitCents: 0,
      creditCents: 500,
      netCents: -500,
    },
  ],
};

function snapshot(
  over: Partial<TieOutApMeasurementSnapshot> = {},
): TieOutApMeasurementSnapshot {
  const asOfDate = over.asOfDate ?? "2026-07-31";
  const bodyPayload = over.payload ?? payload;
  const payloadHash =
    over.payloadHash ??
    hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AP_AGING_SNAPSHOT_KIND,
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
    snapshotKind: over.snapshotKind ?? AP_AGING_SNAPSHOT_KIND,
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
        id: "snap-ap-1",
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

describe("AP measurement snapshot persistence", () => {
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

  it("20. same hash insert reuses", async () => {
    await persistApMeasurementSnapshot(snapshot());
    inserts = [];
    const second = await persistApMeasurementSnapshot(
      snapshot({ capturedAt: "2026-08-18T00:00:00.000Z" }),
    );
    expect(second.reused).toBe(true);
    expect(inserts).toHaveLength(0);
  });

  it("21. different hash same coordinates fails", async () => {
    await persistApMeasurementSnapshot(snapshot());
    const otherPayload = {
      ...payload,
      subledgerTotalCents: 900,
      vendors: [{ entityRef: "1", displayName: "Vendor A", totalCents: 900 }],
    };
    await expect(
      persistApMeasurementSnapshot(snapshot({ payload: otherPayload })),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.IMMUTABLE_CONFLICT,
    });
  });

  it("22. persist never updates an existing snapshot row", async () => {
    await persistApMeasurementSnapshot(snapshot());
    await persistApMeasurementSnapshot(snapshot());
    expect(updateCalls).toBe(0);
  });

  it("23. parent custody mismatch rejects", async () => {
    await expect(
      persistApMeasurementSnapshot(snapshot({ companyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" })),
    ).rejects.toMatchObject({ code: MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH });
    expect(inserts).toHaveLength(0);
  });

  it("does not persist duplicated custody columns", async () => {
    const result = await persistApMeasurementSnapshot(snapshot());
    expect(inserts[0]?.accounting_sync_id).toBe(SYNC);
    expect(inserts[0]?.snapshot_kind).toBe(AP_AGING_SNAPSHOT_KIND);
    expect(inserts[0]).not.toHaveProperty("company_id");
    expect(inserts[0]).not.toHaveProperty("provider");
    expect(result.snapshot.companyId).toBe(COMPANY);
  });
});
