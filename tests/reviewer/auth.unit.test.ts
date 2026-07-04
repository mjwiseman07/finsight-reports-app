import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireFirmAuth,
  requireClientAuth,
  ReviewerAuthError,
  authErrorResponse,
} from "@/lib/reviewer/auth";
import { makeReviewerMockDb, seedFirmUser } from "./_mock-service";

const mock = makeReviewerMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

beforeEach(() => mock.__reset());

function req(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request("http://localhost/api", { headers });
}

describe("requireFirmAuth", () => {
  it("401 missing bearer", async () => {
    await expect(requireFirmAuth(req())).rejects.toMatchObject({ message: "missing_bearer_token", status: 401 });
  });

  it("401 malformed bearer", async () => {
    await expect(
      requireFirmAuth(new Request("http://x", { headers: { authorization: "Basic x" } })),
    ).rejects.toMatchObject({ message: "missing_bearer_token", status: 401 });
  });

  it("401 invalid token", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    await expect(requireFirmAuth(req("bad"))).rejects.toMatchObject({ message: "invalid_token", status: 401 });
  });

  it("403 no firm membership", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await expect(requireFirmAuth(req("t"))).rejects.toMatchObject({ message: "no_firm_membership", status: 403 });
  });

  it("returns only active memberships", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mock.__seed("firm_memberships", [
      { firm_id: "f1", user_id: "u1", role: "firm_admin", status: "active" },
      { firm_id: "f2", user_id: "u1", role: "bookkeeper", status: "revoked" },
    ]);
    const ctx = await requireFirmAuth(req("t"));
    expect(ctx.firmIds).toEqual(["f1"]);
  });

  it("firm_admin is writer", async () => {
    seedFirmUser(mock, "u1", "f1", "firm_admin");
    const ctx = await requireFirmAuth(req("t"));
    expect(ctx.writerFirmIds).toEqual(["f1"]);
    expect(ctx.firmIds).toEqual(["f1"]);
  });

  it("readonly is reader only", async () => {
    seedFirmUser(mock, "u1", "f1", "bookkeeper");
    const ctx = await requireFirmAuth(req("t"));
    expect(ctx.writerFirmIds).toEqual([]);
    expect(ctx.firmIds).toEqual(["f1"]);
  });
});

describe("requireClientAuth", () => {
  it("403 no client attachment", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    await expect(requireClientAuth(req("t"))).rejects.toMatchObject({ message: "no_client_attachment", status: 403 });
  });

  it("returns active firmClientIds", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    mock.__seed("firm_client_users", [
      { firm_client_id: "fc1", user_id: "c1", status: "active" },
      { firm_client_id: "fc2", user_id: "c1", status: "revoked" },
    ]);
    const ctx = await requireClientAuth(req("t"));
    expect(ctx.firmClientIds).toEqual(["fc1"]);
  });

  it("requireClientAuth 401 invalid token", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "x" } });
    await expect(requireClientAuth(req("bad"))).rejects.toMatchObject({ message: "invalid_token", status: 401 });
  });
});

describe("authErrorResponse", () => {
  it("maps ReviewerAuthError", () => {
    const res = authErrorResponse(new ReviewerAuthError("nope", 403));
    expect(res.status).toBe(403);
  });

  it("maps unknown to 500", async () => {
    const res = authErrorResponse(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("internal_error");
  });
});
