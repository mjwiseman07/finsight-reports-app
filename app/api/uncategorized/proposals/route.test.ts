// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

const mockSupabaseAdmin = {
  from: vi.fn(),
};

const mockResolveFirmAccess = vi.fn();
const mockListProposals = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock("@/lib/firm-security.js", () => ({
  resolveFirmAccess: mockResolveFirmAccess,
}));

vi.mock("@/lib/learning/proposal-service", () => ({
  listProposals: mockListProposals,
}));

const { GET } = await import("./route");

function makeReq(url: string) {
  return new Request(url, { headers: { authorization: "Bearer test" } });
}

describe("GET /api/uncategorized/proposals", () => {
  beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
    mockResolveFirmAccess.mockReset();
    mockListProposals.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns 400 when firm_client_id missing", async () => {
    const res = await GET(makeReq("http://x/api/uncategorized/proposals"));
    expect(res.status).toBe(400);
  });

  test("Phase MC-2d.2: returns home_currency from accounting_connections", async () => {
    mockResolveFirmAccess.mockResolvedValue({
      userId: "u1",
      client: { id: "c1", firm_id: "f1", name: "Test", owner_user_id: "owner-1" },
    });
    mockListProposals.mockResolvedValue([]);
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { home_currency: "EUR" }, error: null }),
        }),
      }),
    });

    const res = await GET(makeReq("http://x/api/uncategorized/proposals?firm_client_id=c1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.home_currency).toBe("EUR");
    expect(body.proposals).toEqual([]);
  });

  test("Phase MC-2d.2: home_currency undefined when lookup fails, does NOT 500", async () => {
    mockResolveFirmAccess.mockResolvedValue({
      userId: "u1",
      client: { id: "c1", firm_id: "f1", name: "Test", owner_user_id: "owner-1" },
    });
    mockListProposals.mockResolvedValue([{ proposal_id: "p-1" }]);
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "network" } }),
        }),
      }),
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await GET(makeReq("http://x/api/uncategorized/proposals?firm_client_id=c1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.home_currency).toBeUndefined();
    expect(body.proposals).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("propagates resolveFirmAccess denials", async () => {
    mockResolveFirmAccess.mockResolvedValue({
      response: NextResponse.json({ error: "denied" }, { status: 403 }),
    });
    const res = await GET(makeReq("http://x/api/uncategorized/proposals?firm_client_id=c1"));
    expect(res.status).toBe(403);
  });
});
