/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import PendingApprovalsCard, {
  waitForSettlingAuthToken,
} from "@/components/dashboard/PendingApprovalsCard";

describe("waitForSettlingAuthToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns token once it appears during settle window", async () => {
    setTimeout(() => {
      window.localStorage.setItem("supabase_access_token", "tok.abc.def");
    }, 40);
    const token = await waitForSettlingAuthToken({ attempts: 8, delayMs: 20 });
    expect(token).toBe("tok.abc.def");
  });

  it("returns empty when cancelled mid-wait", async () => {
    let cancelled = false;
    setTimeout(() => {
      cancelled = true;
    }, 15);
    const token = await waitForSettlingAuthToken({
      attempts: 10,
      delayMs: 20,
      isCancelled: () => cancelled,
    });
    expect(token).toBe("");
  });
});

describe("PendingApprovalsCard settle behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("waits for settling token then fetches successfully (no 401 flash)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = String((init?.headers as Record<string, string>)?.Authorization || "");
      if (!auth.includes("Bearer settled.tok.en")) {
        return { ok: false, status: 401, json: async () => ({ error: "auth" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "je-1",
              materiality_bucket: "low",
              je_draft_total_debit_cents: 10000,
              rule_reason_code: "TEST_RULE",
              created_at: new Date().toISOString(),
              requires_mfa_step_up: false,
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PendingApprovalsCard />);
    expect(screen.getByText(/Loading approvals/i)).toBeTruthy();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
      window.localStorage.setItem("supabase_access_token", "settled.tok.en");
    });

    await waitFor(
      () => {
        expect(screen.getByText(/Pending JE Approvals/i)).toBeTruthy();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByText(/Failed to load approvals/i)).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("stays quiet (empty) for unauthenticated 401 after settle with no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: "auth" }),
      })),
    );

    const { container } = render(<PendingApprovalsCard />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading approvals/i)).toBeNull();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByText(/Failed to load approvals/i)).toBeNull();
    expect(container.textContent?.trim() || "").toBe("");
  });

  it("surfaces http_401 when an established token is rejected", async () => {
    window.localStorage.setItem("supabase_access_token", "stale.tok.en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: "auth" }),
      })),
    );

    render(<PendingApprovalsCard />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load approvals: http_401/i)).toBeTruthy();
    });
  });
});
