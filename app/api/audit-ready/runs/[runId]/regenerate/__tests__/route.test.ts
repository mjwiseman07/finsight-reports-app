import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequire = vi.fn();
const mockActor = vi.fn();
const mockRegenerate = vi.fn();

const runRow = {
  id: "run-1",
  engagement_id: "eng-1",
};

let runResult: {
  data: typeof runRow | null;
  error: null | { message: string };
} = { data: runRow, error: null };

function makeChain(table: string) {
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    async maybeSingle() {
      if (table === "audit_ready_tie_out_runs") return runResult;
      return { data: null, error: null };
    },
  };
  return chain;
}

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: () => mockRequire(),
  getEngagementActor: (...a: unknown[]) => mockActor(...a),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/audit-ready/tie-out/regenerate-run", () => ({
  regenerateRun: (...a: unknown[]) => mockRegenerate(...a),
}));

import { POST } from "../route";

beforeEach(() => {
  mockRequire.mockReset();
  mockActor.mockReset();
  mockRegenerate.mockReset();
  runResult = { data: runRow, error: null };
  mockRequire.mockResolvedValue({ user: { id: "u1" } });
  mockActor.mockResolvedValue({
    userId: "u1",
    canRead: true,
    canWrite: true,
    scope: "company",
  });
  mockRegenerate.mockResolvedValue({ newRunId: "run-new" });
});

describe("POST /api/audit-ready/runs/[runId]/regenerate", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequire.mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    });
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("returns 404 when run_not_found", async () => {
    runResult = { data: null, error: null };
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ runId: "missing" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "run_not_found" });
  });

  it("returns 403 when actor is null", async () => {
    mockActor.mockResolvedValue(null);
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("returns 403 when canWrite is false", async () => {
    mockActor.mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: false,
      scope: "company",
    });
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("returns 200 with new_run_id on happy path", async () => {
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ new_run_id: "run-new" });
    expect(mockRegenerate).toHaveBeenCalledWith("run-1", "u1");
  });
});
