import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  makeReviewerMockDb,
  seedClient,
  seedEngagement,
  seedFirmUser,
} from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));

import { GET } from "@/app/api/reviewer/queue/route";

function balanced() {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

function seedItem(id: string, engId: string, fcId: string, extra: Record<string, unknown> = {}) {
  mock.__seed("pre_close_review_items", [
    {
      id,
      fire_id: `fire-${id}`,
      firm_client_id: fcId,
      engagement_id: engId,
      close_period_id: null,
      rule_id: "gen.rule",
      rule_version: 1,
      accounting_method: "accrual",
      je_draft: balanced(),
      je_draft_total_debit_cents: 10000,
      je_draft_total_credit_cents: 10000,
      je_draft_line_count: 2,
      rule_reason_code: "rc",
      rule_reason_detail: {},
      severity: "warning",
      evidence_refs: [],
      decision: null,
      created_at: extra.created_at ?? "2026-07-06T12:00:00Z",
      ...extra,
    },
  ]);
}

beforeEach(() => mock.__reset());

describe("GET /api/reviewer/queue", () => {
  it("401 without bearer", async () => {
    const res = await GET(new NextRequest("http://localhost/api/reviewer/queue"));
    expect(res.status).toBe(401);
  });

  it("401 invalid bearer", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "x" } });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer bad" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("403 without firm membership", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer t" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns items sorted DESC", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1", { created_at: "2026-07-06T10:00:00Z" });
    seedItem("r2", "e1", "fc1", { created_at: "2026-07-06T11:00:00Z" });
    seedItem("r3", "e1", "fc1", { created_at: "2026-07-06T12:00:00Z" });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(3);
    expect(body.items[0].id).toBe("r3");
  });

  it("engagementId filter", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedEngagement(mock, "e2", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1");
    seedItem("r2", "e2", "fc1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?engagementId=e1", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe("r1");
  });

  it("status=pending excludes decided", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1");
    seedItem("r2", "e1", "fc1", { decision: "approved" });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?status=pending", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(["r1"]);
  });

  it("status=posted filter", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1", { posted_je_attempt_id: "att1" });
    seedItem("r2", "e1", "fc1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?status=posted", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].postedJeAttemptId).toBe("att1");
  });

  it("status=blocked filter", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1", { post_block_reason: "ENTITLEMENT_DENIED" });
    seedItem("r2", "e1", "fc1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?status=blocked", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("pagination limit=1 returns cursor", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedItem("r1", "e1", "fc1", { created_at: "2026-07-06T10:00:00Z" });
    seedItem("r2", "e1", "fc1", { created_at: "2026-07-06T11:00:00Z" });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?limit=1", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.cursor).toBeTruthy();
  });

  it("cross-firm isolation", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedEngagement(mock, "e2", "f2");
    seedClient(mock, "fc1", "f1");
    seedClient(mock, "fc2", "f2");
    seedItem("r1", "e1", "fc1");
    seedItem("r2", "e2", "fc2");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(["r1"]);
  });
});
