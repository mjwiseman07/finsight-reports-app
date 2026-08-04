import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: vi.fn(),
  getEngagementActor: vi.fn(),
}));

type QueryResult = { data: unknown; error: unknown };

let engagementResult: QueryResult = { data: null, error: null };
let eventsResult: QueryResult = { data: [], error: null };
let rpcResult: QueryResult = { data: [], error: null };
let fromCall = 0;

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      fromCall += 1;
      const callIndex = fromCall;
      const terminal = () =>
        Promise.resolve(callIndex === 1 ? engagementResult : eventsResult);
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.maybeSingle = () => terminal();
      // Thenable for the events list query (await query)
      q.then = (
        resolve: (v: QueryResult) => unknown,
        reject?: (e: unknown) => unknown,
      ) => terminal().then(resolve, reject);
      return q;
    },
    rpc: () => Promise.resolve(rpcResult),
  }),
}));

import { GET } from "../route";
import * as auth from "@/lib/audit-ready/server-auth";

const makeParams = (engagementId: string) => ({
  params: Promise.resolve({ engagementId }),
});

describe("GET /api/audit-ready/[engagementId]/lifecycle", () => {
  beforeEach(() => {
    vi.mocked(auth.requireAuditReadyUser).mockReset();
    vi.mocked(auth.getEngagementActor).mockReset();
    engagementResult = { data: null, error: null };
    eventsResult = { data: [], error: null };
    rpcResult = { data: [], error: null };
    fromCall = 0;
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(auth.requireAuditReadyUser).mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    } as never);
    const res = await GET({} as Request, makeParams("eng_1"));
    expect(res.status).toBe(401);
  });

  it("actor lacks canRead → 403", async () => {
    vi.mocked(auth.requireAuditReadyUser).mockResolvedValue({
      user: { id: "u1", email: "x@x" },
    } as never);
    vi.mocked(auth.getEngagementActor).mockResolvedValue(null);
    const res = await GET({} as Request, makeParams("eng_1"));
    expect(res.status).toBe(403);
  });

  it("happy path returns events + server_verify", async () => {
    vi.mocked(auth.requireAuditReadyUser).mockResolvedValue({
      user: { id: "u1", email: "x@x" },
    } as never);
    vi.mocked(auth.getEngagementActor).mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: false,
      scope: "company",
    });
    engagementResult = {
      data: { id: "eng_1", company_id: "c1", firm_id: null },
      error: null,
    };
    eventsResult = { data: [], error: null };
    rpcResult = { data: [], error: null };

    const res = await GET({} as Request, makeParams("eng_1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.engagement.id).toBe("eng_1");
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.server_verify.ok).toBe(true);
  });
});
