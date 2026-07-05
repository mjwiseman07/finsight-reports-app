import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  makeReviewerMockDb,
  seedClient,
  seedEngagement,
  seedFirmUser,
} from "../../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const createMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));
vi.mock("@/lib/assertions/manual-test-service", () => ({
  createManualTestEvidence: createMock,
}));

import { POST, GET } from "@/app/api/reviewer/manual-tests/route";

beforeEach(() => {
  mock.__reset();
  createMock.mockReset();
  createMock.mockResolvedValue({ id: "mt1", evidenceType: "bank_statement" });
});

describe("POST /api/reviewer/manual-tests", () => {
  it("401 without bearer", async () => {
    const res = await POST(new NextRequest("http://localhost/api/reviewer/manual-tests", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("400 missing field", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ firmClientId: "fc1" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 invalid evidence_type", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          firmClientId: "fc1",
          engagementId: "e1",
          closePeriodId: "cp1",
          accountCategory: "cash",
          assertionId: "accuracy",
          evidenceType: "bogus",
          sourceType: "upload",
          evidenceSummary: "test summary here",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("403 reader cannot create", async () => {
    seedFirmUser(mock, "u1", "f1", "readonly");
    seedEngagement(mock, "e1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          firmClientId: "fc1",
          engagementId: "e1",
          closePeriodId: "cp1",
          accountCategory: "cash",
          assertionId: "accuracy",
          evidenceType: "bank_statement",
          sourceType: "upload",
          evidenceSummary: "Bank reconciliation walkthrough",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("200 on valid create", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          firmClientId: "fc1",
          engagementId: "e1",
          closePeriodId: "cp1",
          accountCategory: "cash",
          assertionId: "accuracy",
          evidenceType: "bank_statement",
          sourceType: "upload",
          evidenceSummary: "Bank reconciliation walkthrough",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalled();
  });
});

describe("GET /api/reviewer/manual-tests", () => {
  it("400 without closePeriodId", async () => {
    seedFirmUser(mock, "u1", "f1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/manual-tests", {
        headers: { authorization: "Bearer t" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("lists evidence for period", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    mock.__seed("manual_test_evidence", [
      {
        id: "mt1",
        close_period_id: "cp1",
        engagement_id: "e1",
        firm_client_id: "fc1",
        account_category: "cash",
        assertion_id: "accuracy",
        created_at: "2026-07-06T12:00:00Z",
      },
    ]);
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/manual-tests?closePeriodId=cp1", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.evidence).toHaveLength(1);
  });

  it("403 foreign firm", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e2", "f2");
    mock.__seed("manual_test_evidence", [
      { id: "mt1", close_period_id: "cp1", engagement_id: "e2", firm_client_id: "fc2" },
    ]);
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/manual-tests?closePeriodId=cp1", {
        headers: { authorization: "Bearer t" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
