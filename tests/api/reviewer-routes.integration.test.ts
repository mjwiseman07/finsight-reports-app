import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeReviewerMockDb, seedClient, seedEngagement, seedFirmUser } from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const applyMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));
vi.mock("@/lib/directives/apply-directive", () => ({ applyDirective: applyMock }));
vi.mock("@/lib/pre-close/post-approved-review-item", () => ({ postApprovedReviewItem: postMock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishMock }));
vi.mock("@/lib/pre-close/posting-policy-resolver", () => ({
  resolvePostingPolicy: vi.fn().mockResolvedValue({
    engagementId: "e1",
    policyCode: "advisacor_balanced",
    advisacorPreset: "advisacor_balanced",
    autoPostOnApproved: true,
    autoPostOnEditAndApproved: false,
    isDefaulted: true,
  }),
}));

import { GET as getDetail } from "@/app/api/reviewer/review/[id]/route";
import { POST as postDecide } from "@/app/api/reviewer/review/[id]/decide/route";
import { POST as postNow } from "@/app/api/reviewer/review/[id]/post-now/route";
import { GET as getPolicy, PUT as putPolicy } from "@/app/api/reviewer/policy/[engagementId]/route";
import { GET as getVis, PUT as putVis } from "@/app/api/reviewer/visibility/[engagementId]/route";
import { GET as clientQueue } from "@/app/api/client/queue/route";
import { GET as clientDetail } from "@/app/api/client/review/[id]/route";

function draft() {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

function seedItem(id: string, eng = "e1", fc = "fc1", extra: Record<string, unknown> = {}) {
  mock.__seed("pre_close_review_items", [
    {
      id,
      fire_id: `fire-${id}`,
      firm_client_id: fc,
      engagement_id: eng,
      rule_id: "gen.rule",
      rule_version: 1,
      accounting_method: "accrual",
      je_draft: draft(),
      je_draft_total_debit_cents: 10000,
      je_draft_total_credit_cents: 10000,
      je_draft_line_count: 2,
      rule_reason_code: "rc",
      severity: "warning",
      evidence_refs: [],
      decision: null,
      created_at: "2026-07-06T00:00:00Z",
      ...extra,
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  applyMock.mockReset();
  postMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({});
});

describe("reviewer review detail", () => {
  it("happy path", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1");
    const res = await getDetail(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("r1");
  });

  it("404 other firm", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e2", "f2");
    seedClient(mock, "fc2", "f2");
    seedItem("r1", "e2", "fc2");
    const res = await getDetail(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("404 missing id", async () => {
    seedFirmUser(mock, "u1", "f1");
    const res = await getDetail(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("401 without bearer", async () => {
    const res = await getDetail(new NextRequest("http://localhost"), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);
  });
});

describe("reviewer decide", () => {
  it("400 invalid decision", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedItem("r1");
    const res = await postDecide(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ decision: "bogus", decisionReasonCode: "x" }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("403 reader role", async () => {
    seedFirmUser(mock, "u1", "f1", "bookkeeper");
    seedEngagement(mock, "e1", "f1");
    seedItem("r1");
    const res = await postDecide(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ decision: "approved", decisionReasonCode: "x" }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("happy path approved", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1");
    applyMock.mockResolvedValue({ status: "applied", row: {} });
    const res = await postDecide(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ decision: "approved", decisionReasonCode: "ok" }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(200);
    expect(applyMock).toHaveBeenCalled();
  });
});

describe("reviewer post-now", () => {
  it("400 without overridePolicy", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedItem("r1", "e1", "fc1", { decision: "approved" });
    const res = await postNow(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ overridePolicy: false }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("409 undecided", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedItem("r1");
    const res = await postNow(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ overridePolicy: true }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(409);
  });

  it("happy path override", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedItem("r1", "e1", "fc1", { decision: "approved" });
    postMock.mockResolvedValue({ status: "posted", reviewItemId: "r1" });
    const res = await postNow(
      new NextRequest("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ overridePolicy: true }),
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(200);
  });
});

describe("reviewer policy + visibility", () => {
  it("GET policy default", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await getPolicy(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ engagementId: "e1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDefaulted).toBe(true);
  });

  it("PUT policy invalid preset", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await putPolicy(
      new NextRequest("http://localhost", {
        method: "PUT",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ advisacorPreset: "bad" }),
      }),
      { params: Promise.resolve({ engagementId: "e1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("PUT visibility", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await putVis(
      new NextRequest("http://localhost", {
        method: "PUT",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          clientCanViewQueue: true,
          clientCanViewEvidence: false,
          clientCanViewJeDraft: false,
        }),
      }),
      { params: Promise.resolve({ engagementId: "e1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clientCanViewQueue).toBe(true);
  });

  it("GET visibility default", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    const res = await getVis(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ engagementId: "e1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDefaulted).toBe(true);
  });
});

describe("client API", () => {
  it("queue empty without visibility", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    mock.__seed("firm_client_users", [{ firm_client_id: "fc1", user_id: "c1", status: "active" }]);
    mock.__seed("firm_clients", [{ id: "fc1", firm_id: "f1", name: "C" }]);
    seedEngagement(mock, "e1", "f1");
    const res = await clientQueue(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  it("queue with visibility", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    mock.__seed("firm_client_users", [{ firm_client_id: "fc1", user_id: "c1", status: "active" }]);
    mock.__seed("firm_clients", [{ id: "fc1", firm_id: "f1", name: "C" }]);
    seedEngagement(mock, "e1", "f1");
    mock.__seed("engagement_review_visibility", [
      { engagement_id: "e1", client_can_view_queue: true, client_can_view_evidence: true, client_can_view_je_draft: false },
    ]);
    seedItem("r1");
    const res = await clientQueue(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
    );
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("detail redacts je draft", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    mock.__seed("firm_client_users", [{ firm_client_id: "fc1", user_id: "c1", status: "active" }]);
    mock.__seed("firm_clients", [{ id: "fc1", firm_id: "f1", name: "C" }]);
    seedEngagement(mock, "e1", "f1");
    mock.__seed("engagement_review_visibility", [
      { engagement_id: "e1", client_can_view_queue: true, client_can_view_evidence: false, client_can_view_je_draft: false },
    ]);
    seedItem("r1");
    const res = await clientDetail(
      new NextRequest("http://localhost", { headers: { authorization: "Bearer t" } }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const body = await res.json();
    expect(body.jeDraft).toBeNull();
    expect(body._redacted?.jeDraft).toBe(true);
  });
});
