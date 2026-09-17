import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ReviewerAuthError } from "@/lib/reviewer/auth";

const requireFirmAuth = vi.fn();
const assertFirmClientAccess = vi.fn();
const from = vi.fn();

vi.mock("@/lib/reviewer/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reviewer/auth")>("@/lib/reviewer/auth");
  return {
    ...actual,
    requireFirmAuth: (...args: unknown[]) => requireFirmAuth(...args),
    assertFirmClientAccess: (...args: unknown[]) => assertFirmClientAccess(...args),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (...args: unknown[]) => from(...args) }),
}));

import { GET } from "@/app/api/reviewer/month-end-packages/route";

function request(firmClientId?: string) {
  const url = new URL("https://example.test/api/reviewer/month-end-packages");
  if (firmClientId) url.searchParams.set("firmClientId", firmClientId);
  return new NextRequest(url);
}

describe("month-end reviewer packages route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFirmAuth.mockResolvedValue({
      userId: "u1",
      firmIds: ["firm-1"],
      writerFirmIds: ["firm-1"],
      isServiceRoleCaller: false,
    });
    assertFirmClientAccess.mockResolvedValue({ firmClientId: "fc-1", firmId: "firm-1" });
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [{ id: "pkg-1" }], error: null }),
          }),
        }),
      }),
    });
  });

  it("requires RA Pro reviewer auth before querying packages", async () => {
    requireFirmAuth.mockRejectedValue(new ReviewerAuthError("forbidden", 403));
    const res = await GET(request("fc-1"));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("requires firm-client membership for the requested client", async () => {
    assertFirmClientAccess.mockRejectedValue(new ReviewerAuthError("forbidden", 403));
    const res = await GET(request("fc-other"));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns packages when entitlement and firm-client access pass", async () => {
    const res = await GET(request("fc-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ packages: [{ id: "pkg-1" }] });
    expect(requireFirmAuth).toHaveBeenCalled();
    expect(assertFirmClientAccess).toHaveBeenCalledWith({
      firmClientId: "fc-1",
      firmIds: ["firm-1"],
    });
  });
});
