import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import ReviewerLayout from "../layout";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/reviewer/auth", () => ({
  requireFirmAuthServer: vi.fn(),
}));

vi.mock("../_components/ReviewerShellClient", () => ({
  ReviewerShellClient: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ReviewerLayout server auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /signin when no session", async () => {
    const { requireFirmAuthServer } = await import("@/lib/reviewer/auth");
    vi.mocked(requireFirmAuthServer).mockRejectedValueOnce(new Error("unauthorized"));
    await expect(
      ReviewerLayout({ children: null as unknown as React.ReactNode }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/signin?next=/reviewer");
  });

  it("renders children when authenticated", async () => {
    const { requireFirmAuthServer } = await import("@/lib/reviewer/auth");
    vi.mocked(requireFirmAuthServer).mockResolvedValueOnce({
      userId: "u1",
      firmIds: ["f1"],
      writerFirmIds: [],
      isServiceRoleCaller: false,
    });
    const result = await ReviewerLayout({
      children: "children-here" as unknown as React.ReactNode,
    });
    expect(result).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
