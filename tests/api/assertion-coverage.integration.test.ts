import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  ACCOUNT_CATEGORIES,
  ASSERTION_IDS,
} from "@/lib/pre-close/assertions-types";
import { makeReviewerMockDb, seedClient, seedFirmUser } from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const workerMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth }),
}));
vi.mock("@/lib/assertions/projection-worker", () => ({
  runProjectionWorker: workerMock,
}));

import { GET as getCoverage } from "@/app/api/reviewer/close-periods/[closePeriodId]/assertion-coverage/route";
import { POST as postRecompute } from "@/app/api/reviewer/close-periods/[closePeriodId]/assertion-coverage/recompute/route";

const CP = "cp1";
const FC = "fc1";
const FIRM = "f1";

function seedClosePeriod(firmId = FIRM, fc = FC, cp = CP) {
  seedClient(mock, fc, firmId);
  mock.__seed("close_periods", [{ id: cp, firm_client_id: fc }]);
}

function seedCoverageRows(count = 144) {
  const rows = ACCOUNT_CATEGORIES.flatMap((account_category) =>
    ASSERTION_IDS.map((assertion_id) => ({
      coverage_id: `${account_category}-${assertion_id}`,
      firm_client_id: FC,
      close_period_id: CP,
      account_category,
      assertion_id,
      relevance_at_computation: "relevant",
      coverage_status: "gap",
      covering_rule_ids: [],
      covering_fire_ids: [],
      evidence_strength: "unassessed",
      gap_root_cause_code: "no_rule_defined",
    })),
  );
  mock.__seed("close_assertion_coverage", rows.slice(0, count));
}

beforeEach(() => {
  mock.__reset();
  workerMock.mockReset();
  workerMock.mockResolvedValue({
    workerRunId: "wr1",
    closePeriodId: CP,
    firmClientId: FC,
    rowsWritten: 144,
    gapsDetected: 100,
    reasonerEnabled: false,
    reasonerSucceeded: 0,
    reasonerFailed: 0,
    summary: { totalPairs: 144, tested: 1, partial: 0, gap: 100, notApplicable: 43, gapRate: 0.99 },
  });
});

describe("GET assertion-coverage", () => {
  it("requires bearer token", async () => {
    const res = await getCoverage(new NextRequest("http://localhost"), {
      params: Promise.resolve({ closePeriodId: CP }),
    });
    expect(res.status).toBe(401);
  });

  it("404 on unknown close_period", async () => {
    seedFirmUser(mock, "u1", FIRM);
    const res = await getCoverage(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("403 when user firm does not match close period firm", async () => {
    seedFirmUser(mock, "u1", "other-firm");
    seedClosePeriod("f2", "fc2", "cp2");
    seedCoverageRows(1);
    const res = await getCoverage(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: "cp2" }) },
    );
    expect(res.status).toBe(403);
  });

  it("200 returns rows for authorized firm user", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    seedCoverageRows();
    const res = await getCoverage(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.close_period_id).toBe(CP);
    expect(body.rows).toHaveLength(144);
  });
});

describe("POST assertion-coverage/recompute", () => {
  it("403 for readonly role", async () => {
    seedFirmUser(mock, "u1", FIRM, "readonly");
    seedClosePeriod();
    const res = await postRecompute(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(403);
  });

  it("200 returns WorkerResult for writer", async () => {
    seedFirmUser(mock, "u1", FIRM, "firm_admin");
    seedClosePeriod();
    const res = await postRecompute(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rowsWritten).toBe(144);
    expect(workerMock).toHaveBeenCalledWith(FC, CP);
  });

  it("403 for close period in different firm", async () => {
    seedFirmUser(mock, "u1", FIRM, "firm_admin");
    seedClosePeriod("f2", "fc2", "cp2");
    const res = await postRecompute(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ closePeriodId: "cp2" }) },
    );
    expect(res.status).toBe(403);
  });
});
