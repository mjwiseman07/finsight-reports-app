import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeReviewerMockDb, seedFirmUser } from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const buildMock = vi.hoisted(() => vi.fn());
const pdfMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mock,
}));
vi.mock("@/lib/close-packet/sections/assertion_coverage", () => ({
  build: buildMock,
  toAssertionCoverageStatement: (built: Record<string, unknown>) => {
    if (built.status === "error") return null;
    const { status: _s, error_message: _e, ...rest } = built;
    return rest;
  },
}));
vi.mock("@/lib/close-packet/pdf/AssertionCoverageStatement", () => ({
  generateAssertionCoverageStatementPdf: pdfMock,
}));

import { GET as getPdf } from "@/app/api/reviewer/close-periods/[closePeriodId]/assertion-coverage/pdf/route";
import { makeSyntheticStatement } from "../close-packet/_fixtures/statement";

const CP = "cp1";
const FC = "fc1";
const FIRM = "f1";

function seedClosePeriod() {
  mock.__seed("firm_clients", [
    {
      id: FC,
      firm_id: FIRM,
      name: "Client",
      industry_vertical: "general",
      accounting_method: "accrual",
      is_demo: false,
    },
  ]);
  mock.__seed("close_periods", [
    {
      id: CP,
      firm_client_id: FC,
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      status: "prep",
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  buildMock.mockReset();
  pdfMock.mockReset();
  const statement = makeSyntheticStatement();
  buildMock.mockResolvedValue({ status: "ok", ...statement });
  pdfMock.mockResolvedValue({
    buffer: Buffer.from("%PDF-1.4 fake"),
    sha256: "a".repeat(64),
    byteSize: 12,
  });
});

describe("GET assertion-coverage/pdf", () => {
  it("returns 200 application/pdf for firm-scoped caller", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("returns 401 without bearer token", async () => {
    const res = await getPdf(new NextRequest("http://localhost"), {
      params: Promise.resolve({ closePeriodId: CP }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller not in firm", async () => {
    seedFirmUser(mock, "u1", "other-firm");
    seedClosePeriod();
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing close_period", async () => {
    seedFirmUser(mock, "u1", FIRM);
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("writes to assertion_coverage_statement_downloads", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(mock.__state.assertion_coverage_statement_downloads).toHaveLength(1);
    expect(mock.__state.assertion_coverage_statement_downloads[0].content_sha256).toHaveLength(64);
  });

  it("Content-Disposition includes period dates", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.headers.get("content-disposition")).toContain("2026-06-01-to-2026-06-30");
  });

  it("X-Coverage-Sha256 header matches computed sha", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.headers.get("X-Coverage-Sha256")).toBe("a".repeat(64));
  });

  it("returns 500 statement_build_failed on builder error", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    buildMock.mockResolvedValue({ status: "error", error_message: "boom" });
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("statement_build_failed");
  });

  it("returns 500 internal_error on unexpected error", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    pdfMock.mockRejectedValue(new Error("render boom"));
    const res = await getPdf(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ closePeriodId: CP }) },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("internal_error");
  });

  it("concurrent downloads produce separate audit rows", async () => {
    seedFirmUser(mock, "u1", FIRM);
    seedClosePeriod();
    const req = new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } });
    const params = { params: Promise.resolve({ closePeriodId: CP }) };
    await Promise.all([getPdf(req, params), getPdf(req, params)]);
    expect(mock.__state.assertion_coverage_statement_downloads.length).toBeGreaterThanOrEqual(2);
  });
});
