import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import ReviewerLayout from "../layout";
import { ReviewerAuthError } from "@/lib/reviewer/auth";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/reviewer/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reviewer/auth")>(
    "@/lib/reviewer/auth",
  );
  return {
    ...actual,
    requireFirmAuthServer: vi.fn(),
  };
});

vi.mock("../_components/ReviewerShellClient", () => ({
  ReviewerShellClient: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ReviewerLayout server auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to sign-in with next=/dashboard", async () => {
    const { requireFirmAuthServer } = await import("@/lib/reviewer/auth");
    vi.mocked(requireFirmAuthServer).mockRejectedValueOnce(
      new ReviewerAuthError("missing_bearer_token", 401),
    );
    await expect(
      ReviewerLayout({ children: null as unknown as React.ReactNode }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/signin?next=/dashboard");
  });

  it("redirects authenticated but non-entitled users to /dashboard", async () => {
    const { requireFirmAuthServer } = await import("@/lib/reviewer/auth");
    vi.mocked(requireFirmAuthServer).mockRejectedValueOnce(
      new ReviewerAuthError("forbidden", 403),
    );
    await expect(
      ReviewerLayout({ children: null as unknown as React.ReactNode }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
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
