import { describe, test, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/reviewer/auth", () => ({
  requireFirmAuth: vi.fn(),
  authErrorResponse: vi.fn((e: unknown) => {
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }),
}));

vi.mock("@/lib/cash-app/review-queue", () => ({
  resolveReviewItem: vi.fn(),
}));

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({ single: mockSingle }),
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

import { requireFirmAuth } from "@/lib/reviewer/auth";
import { resolveReviewItem } from "@/lib/cash-app/review-queue";

function makeRequest(body: unknown) {
  return new NextRequest("https://example.com/api/ar/cash-app/review-items/ri-1/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "ri-1" });

describe("POST /api/ar/cash-app/review-items/:id/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireFirmAuth).mockResolvedValue({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: ["f1"],
      isServiceRoleCaller: false,
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "ri-1",
        firm_id: "f1",
        company_id: "c1",
        payment_id: "pay-1",
        top_candidates: [],
      },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: { payer_name_raw: "ACME" }, error: null });
  });

  test("returns 401 when session guard throws", async () => {
    vi.mocked(requireFirmAuth).mockRejectedValue(new Response(null, { status: 401 }));
    const res = await POST(makeRequest({ action: "reject", reason: "test" }), { params });
    expect(res.status).toBe(401);
  });

  test("returns 400 for a missing action field", async () => {
    const res = await POST(makeRequest({}), { params });
    expect(res.status).toBe(400);
  });

  test("returns 400 for an unknown action", async () => {
    const res = await POST(makeRequest({ action: "teleport" }), { params });
    expect(res.status).toBe(400);
  });

  test("returns 400 for accept missing fields", async () => {
    const res = await POST(makeRequest({ action: "accept" }), { params });
    expect(res.status).toBe(400);
  });

  test("returns 404 when the review item is not found for this tenant", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeRequest({ action: "reject", reason: "x" }), { params });
    expect(res.status).toBe(404);
  });

  test("happy path accept calls resolveReviewItem and returns 200", async () => {
    vi.mocked(resolveReviewItem).mockResolvedValue({
      reviewItemId: "ri-1",
      resolvedAction: "accept",
      contributedToGlobalPatterns: false,
    });
    const res = await POST(
      makeRequest({ action: "accept", invoiceId: "inv-1", matchedAmount: 500 }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(resolveReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({ reviewItemId: "ri-1", actorUserId: "u1" }),
    );
  });

  test("split validates each allocation entry shape", async () => {
    const res = await POST(
      makeRequest({ action: "split", splitAllocations: [{ invoiceId: "inv-1" }] }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  test("returns 409 when resolveReviewItem reports an already-resolved item", async () => {
    vi.mocked(resolveReviewItem).mockRejectedValue(
      new Error("Review item ri-1 is already resolved — cannot resolve twice"),
    );
    const res = await POST(makeRequest({ action: "reject", reason: "x" }), { params });
    expect(res.status).toBe(409);
  });

  test("returns 500 for unexpected resolveReviewItem errors", async () => {
    vi.mocked(resolveReviewItem).mockRejectedValue(new Error("unexpected db failure"));
    const res = await POST(makeRequest({ action: "reject", reason: "x" }), { params });
    expect(res.status).toBe(500);
  });

  test("write_off requires amount and glAccountId", async () => {
    const res = await POST(makeRequest({ action: "write_off", amount: 12.5 }), { params });
    expect(res.status).toBe(400);
  });

  test("on_account requires customerId", async () => {
    const res = await POST(makeRequest({ action: "on_account" }), { params });
    expect(res.status).toBe(400);
  });
});
