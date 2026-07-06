// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CashAppReviewQueuePage from "./page";

vi.stubGlobal("fetch", vi.fn());

describe("CashAppReviewQueuePage", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.stubGlobal("localStorage", {
      getItem: () => "token",
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("shows empty state when there are no pending items", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], nextCursor: null }),
    } as Response);
    render(<CashAppReviewQueuePage />);
    await waitFor(() =>
      expect(screen.getByText(/no items are waiting for review/i)).toBeInTheDocument(),
    );
  });

  test("renders a list item per pending review item", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "ri-1",
            payment_id: "pay-1",
            firm_id: "f1",
            company_id: "c1",
            top_candidates: [],
            status: "pending",
            resolved_action: null,
            resolved_by: null,
            resolved_at: null,
            write_off_amount: null,
            write_off_gl_account_id: null,
            on_account_customer_id: null,
            split_allocations: null,
            created_at: "2026-07-01T00:00:00Z",
            updated_at: "2026-07-01T00:00:00Z",
            ar_cash_app_match_scores: [
              {
                aggregate_feature_score: 0.6,
                llm_tier_used: "primary",
                llm_confidence: 0.6,
                llm_reasoning_excerpt: "ambiguous",
                escalated_to_toptier: false,
                final_confidence: 0.6,
                verdict: "route_to_review",
              },
            ],
          },
        ],
        nextCursor: null,
      }),
    } as Response);
    render(<CashAppReviewQueuePage />);
    await waitFor(() => expect(screen.getByText(/payment pay-1/i)).toBeInTheDocument());
  });

  test("shows a retry button on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    render(<CashAppReviewQueuePage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
