import { describe, test, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/reviewer/auth", () => ({
  requireFirmAuth: vi.fn(),
  authErrorResponse: vi.fn((e: unknown) => {
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { requireFirmAuth } from "@/lib/reviewer/auth";

function makeChain(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["select", "eq", "in", "order", "limit", "gt"].forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  (chain as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    resolve(finalResult);
  return chain;
}

describe("GET /api/ar/cash-app/review-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when session guard throws", async () => {
    vi.mocked(requireFirmAuth).mockRejectedValue(new Response(null, { status: 401 }));
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("defaults to status=pending and limit=25", async () => {
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  test("rejects an invalid status by silently falling back to pending", async () => {
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items?status=bogus");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  test("clamps limit to 100 max", async () => {
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items?limit=9999");
    await GET(req);
    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  test("sets nextCursor to the last item id when a full page is returned", async () => {
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: `ri-${i}` }));
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items?limit=25");
    const res = await GET(req);
    const body = await res.json();
    expect(body.nextCursor).toBe("ri-24");
  });

  test("returns 500 when the query errors", async () => {
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "db down" } }));
    const req = new NextRequest("https://example.com/api/ar/cash-app/review-items");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
