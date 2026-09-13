import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeReviewerMockDb, seedClient, seedFirmUser, bearer } from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const resolveToken = vi.hoisted(() => vi.fn());
const qboFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({
  resolveQBOTokenForFirmClient: (...args: unknown[]) => resolveToken(...args),
}));
vi.mock("@/lib/qbo/api-fetch.js", () => ({
  qboApiFetch: (...args: unknown[]) => qboFetch(...args),
}));
vi.mock("@/lib/support/api-error-wrapper", () => ({
  withAutoFile: (fn: (req: Request) => Promise<Response>) => fn,
}));

import { GET as getQboAccounts } from "@/app/api/reviewer/qbo-accounts/route";
import { assertFirmClientAccess, ReviewerAuthError } from "@/lib/reviewer/auth";

beforeEach(() => {
  mock.__reset();
  resolveToken.mockReset();
  qboFetch.mockReset();
});

describe("assertFirmClientAccess", () => {
  it("allows firm client owned by caller's firm", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedClient(mock, "fc1", "f1");
    const result = await assertFirmClientAccess({ firmClientId: "fc1", firmIds: ["f1"] });
    expect(result).toEqual({ firmClientId: "fc1", firmId: "f1" });
  });

  it("denies cross-firm firmClientId with generic not_found", async () => {
    seedClient(mock, "fc-other", "f2");
    await expect(
      assertFirmClientAccess({ firmClientId: "fc-other", firmIds: ["f1"] }),
    ).rejects.toMatchObject({ message: "not_found", status: 404 } satisfies Partial<ReviewerAuthError>);
  });

  it("denies unknown firmClientId with same not_found (no existence oracle)", async () => {
    await expect(
      assertFirmClientAccess({ firmClientId: "missing", firmIds: ["f1"] }),
    ).rejects.toMatchObject({ message: "not_found", status: 404 });
  });
});

describe("GET /api/reviewer/qbo-accounts", () => {
  it("requires authentication", async () => {
    const req = new NextRequest("http://localhost/api/reviewer/qbo-accounts?firmClientId=fc1");
    const res = await getQboAccounts(req);
    expect(res.status).toBe(401);
    expect(resolveToken).not.toHaveBeenCalled();
  });

  it("allows owner firm member and resolves QBO only after authz", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedClient(mock, "fc1", "f1");
    resolveToken.mockResolvedValue({ accessToken: "at", realmId: "realm1" });
    qboFetch.mockResolvedValue({
      ok: true,
      json: { QueryResponse: { Account: [{ Id: "1", Name: "Cash" }] } },
    });

    const req = new NextRequest(
      "http://localhost/api/reviewer/qbo-accounts?firmClientId=fc1",
      bearer(),
    );
    const res = await getQboAccounts(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toEqual([{ id: "1", name: "Cash" }]);
    expect(resolveToken).toHaveBeenCalledWith("fc1");
  });

  it("denies wrong-firm firmClientId before token resolve", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedClient(mock, "fc-other", "f2");
    const req = new NextRequest(
      "http://localhost/api/reviewer/qbo-accounts?firmClientId=fc-other",
      bearer(),
    );
    const res = await getQboAccounts(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(resolveToken).not.toHaveBeenCalled();
    expect(qboFetch).not.toHaveBeenCalled();
  });

  it("does not disclose existence for unknown firmClientId", async () => {
    seedFirmUser(mock, "u1", "f1");
    const req = new NextRequest(
      "http://localhost/api/reviewer/qbo-accounts?firmClientId=does-not-exist",
      bearer(),
    );
    const res = await getQboAccounts(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(resolveToken).not.toHaveBeenCalled();
  });
});
