import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const leadMaybeSingle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: (...args: unknown[]) => leadMaybeSingle(...args),
        }),
      }),
    }),
  },
}));

import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "@/lib/integrations/accounting/resolve-request-principal";

beforeEach(() => {
  getUser.mockReset();
  leadMaybeSingle.mockReset();
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

describe("resolveAccountingRequestPrincipal", () => {
  it("accepts bearer user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const result = await resolveAccountingRequestPrincipal(
      request({ auth: "Bearer good-token" }),
    );
    expect(isAccountingPrincipalDenial(result)).toBe(false);
    if (!isAccountingPrincipalDenial(result)) {
      expect(result).toEqual({ kind: "user", userId: "user-1" });
    }
    expect(leadMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated caller", async () => {
    const result = await resolveAccountingRequestPrincipal(request({}));
    expect(result).toEqual({
      status: 401,
      body: { error: "Missing Authorization bearer token or lead session" },
    });
  });

  it("rejects body leadId without cookie (no identity substitution)", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({ body: { leadId: "lead-victim" } }),
    );
    expect(result).toMatchObject({ status: 401 });
    expect(leadMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects mismatched claimed leadId vs cookie", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({
        cookie: "free_review_lead_id=lead-real",
        body: { leadId: "lead-other" },
      }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
    expect(leadMaybeSingle).not.toHaveBeenCalled();
  });

  it("accepts cookie-proven lead that exists", async () => {
    leadMaybeSingle.mockResolvedValue({ data: { id: "lead-real" }, error: null });
    const result = await resolveAccountingRequestPrincipal(
      request({
        cookie: "free_review_lead_id=lead-real",
        body: { leadId: "lead-real" },
      }),
    );
    expect(result).toEqual({ kind: "lead", userId: "lead-real", leadId: "lead-real" });
  });

  it("rejects cookie lead that is not in free_review_leads", async () => {
    leadMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await resolveAccountingRequestPrincipal(
      request({ cookie: "free_review_lead_id=lead-missing" }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });

  it("rejects query leadId substitution without matching cookie", async () => {
    const result = await resolveAccountingRequestPrincipal(
      request({
        url: "http://localhost/api/accounting/report-availability?leadId=lead-victim",
      }),
    );
    expect(result).toMatchObject({ status: 401 });
  });
});
