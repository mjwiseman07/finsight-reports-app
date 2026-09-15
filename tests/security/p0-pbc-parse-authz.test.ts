import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.hoisted(() => vi.fn());
const resolveActor = vi.hoisted(() => vi.fn());
const parseUpload = vi.hoisted(() => vi.fn());

const uploadState = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  serviceCalls: 0,
}));

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: (...args: unknown[]) => requireUser(...args),
  resolveEngagementActorForVerifiedUser: (...args: unknown[]) => resolveActor(...args),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    uploadState.serviceCalls += 1;
    return {
      from: (table: string) => {
        if (table !== "audit_ready_pbc_uploads") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              eq: (_col2: string, val2: string) => ({
                maybeSingle: async () => {
                  const row = uploadState.rows.find(
                    (r) => r.id === val && r.engagement_id === val2,
                  );
                  return { data: row || null, error: null };
                },
              }),
            }),
          }),
        };
      },
    };
  },
}));

vi.mock("@/lib/audit-ready/pbc-parser", () => ({
  parsePbcUpload: (...args: unknown[]) => parseUpload(...args),
}));

import { POST as parseRoute } from "@/app/api/audit-ready/[engagementId]/pbc/parse/route";

beforeEach(() => {
  requireUser.mockReset();
  resolveActor.mockReset();
  parseUpload.mockReset();
  uploadState.rows = [];
  uploadState.serviceCalls = 0;
});

function makeReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/audit-ready/eng-1/pbc/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/audit-ready/[engagementId]/pbc/parse authz", () => {
  it("rejects unauthenticated callers before service-role load", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    });
    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: "eng-1" }),
    });
    expect(res.status).toBe(401);
    expect(uploadState.serviceCalls).toBe(0);
    expect(parseUpload).not.toHaveBeenCalled();
  });

  it("rejects wrong-engagement membership with generic not_found before service load", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    resolveActor.mockResolvedValue(null);
    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: "eng-other" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(uploadState.serviceCalls).toBe(0);
    expect(parseUpload).not.toHaveBeenCalled();
  });

  it("rejects read-only member (no write) before service load", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    resolveActor.mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: false,
      scope: "company",
    });
    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: "eng-1" }),
    });
    expect(res.status).toBe(404);
    expect(uploadState.serviceCalls).toBe(0);
  });

  it("rejects wrong-upload / cross-engagement substitution after authz", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    resolveActor.mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: true,
      scope: "company",
    });
    uploadState.rows = [];
    const res = await parseRoute(makeReq({ upload_id: "up-foreign" }), {
      params: Promise.resolve({ engagementId: "eng-1" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(parseUpload).not.toHaveBeenCalled();
    expect(uploadState.serviceCalls).toBeGreaterThan(0);
  });

  it("allows authorized writer and parses only after recheck", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    resolveActor.mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: true,
      scope: "company",
    });
    const eng = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const sha = "a".repeat(64);
    uploadState.rows = [
      {
        id: "up1",
        engagement_id: eng,
        status: "uploaded",
        storage_path: `${eng}/${sha}-file.pdf`,
        content_type: "application/pdf",
      },
    ];
    parseUpload.mockResolvedValue({ requestsExtracted: 3 });

    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: eng }),
    });
    expect(res.status).toBe(200);
    expect(parseUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementId: eng,
        uploadId: "up1",
        calledByUserId: "u1",
        storagePath: `${eng}/${sha}-file.pdf`,
      }),
    );
    expect(resolveActor.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects poisoned storage_path / cross-engagement object key", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    resolveActor.mockResolvedValue({
      userId: "u1",
      canRead: true,
      canWrite: true,
      scope: "company",
    });
    const eng = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const sha = "a".repeat(64);
    uploadState.rows = [
      {
        id: "up1",
        engagement_id: eng,
        status: "uploaded",
        storage_path: `${other}/${sha}-file.pdf`,
        content_type: "application/pdf",
      },
    ];

    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: eng }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(parseUpload).not.toHaveBeenCalled();
  });

  it("fails closed if membership revoked between auth and parse (TOCTOU)", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1", email: "a@b.c" } });
    let calls = 0;
    resolveActor.mockImplementation(async () => {
      calls += 1;
      if (calls <= 2) {
        return { userId: "u1", canRead: true, canWrite: true, scope: "company" };
      }
      return null;
    });
    uploadState.rows = [
      {
        id: "up1",
        engagement_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        status: "uploaded",
        storage_path: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/${"a".repeat(64)}-file.pdf`,
        content_type: "application/pdf",
      },
    ];

    const res = await parseRoute(makeReq({ upload_id: "up1" }), {
      params: Promise.resolve({ engagementId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    });
    expect(res.status).toBe(404);
    expect(parseUpload).not.toHaveBeenCalled();
  });
});
