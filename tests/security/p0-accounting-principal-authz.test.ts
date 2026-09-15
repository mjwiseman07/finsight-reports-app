import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const resolveSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
  },
}));

vi.mock("@/lib/free-review/lead-session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/free-review/lead-session")>(
    "@/lib/free-review/lead-session",
  );
  return {
    ...actual,
    resolveLeadSessionFromToken: (...args: unknown[]) => resolveSession(...args),
    readLeadSessionTokenFromRequest: (request: Request) => {
      const header = request.headers.get("cookie") || "";
      const match = header.match(/(?:^|;\s*)free_review_lead_session=([^;]*)/);
      return match?.[1] ? decodeURIComponent(match[1]) : "";
    },
    readLegacyLeadIdCookie: (request: Request) => {
      const header = request.headers.get("cookie") || "";
      const match = header.match(/(?:^|;\s*)free_review_lead_id=([^;]*)/);
      return match?.[1] ? decodeURIComponent(match[1]) : "";
    },
  };
});

import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "@/lib/integrations/accounting/resolve-request-principal";

beforeEach(() => {
  getUser.mockReset();
  resolveSession.mockReset();
});

function request(init: { auth?: string; cookie?: string; url?: string; body?: Record<string, unknown> }) {
  const headers = new Headers();
  if (init.auth) headers.set("authorization", init.auth);
  if (init.cookie) headers.set("cookie", init.cookie);
  return {
    request: new Request(init.url || "http://localhost/api/accounting/active-context", {
      method: "POST",
      headers,
    }),
    body: init.body,
  };
}

describe("resolveAccountingRequestPrincipal (shared resolver neighbors)", () => {
  it("accepts bearer user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const result = await resolveAccountingRequestPrincipal(request({ auth: "Bearer good-token" }));
    expect(isAccountingPrincipalDenial(result)).toBe(false);
    if (!isAccountingPrincipalDenial(result)) {
      expect(result).toEqual({ kind: "user", userId: "user-1" });
    }
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated caller", async () => {
    const result = await resolveAccountingRequestPrincipal(request({}));
    expect(result).toEqual({
      status: 401,
      body: { error: "Missing Authorization bearer token or lead session" },
    });
  });

  it("rejects body leadId without session cookie", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({ body: { leadId: "lead-victim" } }),
    );
    expect(result).toMatchObject({ status: 401 });
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("rejects legacy raw lead id cookie", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({ cookie: "free_review_lead_id=11111111-1111-4111-8111-111111111111" }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });

  it("accepts opaque session cookie via shared resolver", async () => {
    resolveSession.mockResolvedValue({
      sessionId: "sess-1",
      leadId: "lead-real",
      leadStatus: "lead_captured",
    });
    const result = await resolveAccountingRequestPrincipal(
      request({ cookie: "free_review_lead_session=opaque-token" }),
    );
    expect(result).toEqual({
      kind: "lead",
      userId: "lead-real",
      leadId: "lead-real",
      sessionId: "sess-1",
    });
  });

  it("rejects query leadId substitution without session", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({
        url: "http://localhost/api/accounting/report-availability?leadId=lead-victim",
      }),
    );
    expect(result).toMatchObject({ status: 401 });
  });
});
