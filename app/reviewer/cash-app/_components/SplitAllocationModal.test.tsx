// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { SplitAllocationModal } from "./SplitAllocationModal";
import type { TopCandidateSummary } from "@/lib/cash-app/review-queue-types";

const candidates: TopCandidateSummary[] = [
  {
    invoiceId: "inv-1",
    invoiceNumber: "INV-001",
    customerId: "cust-1",
    customerName: "Acme Co",
    invoiceAmount: 600,
    invoiceDueDate: "2026-06-01",
    fuzzyPayerNameScore: 0.9,
    amountToleranceScore: 1,
    dateProximityScore: 1,
    historicalPayerBehaviorScore: 0.6,
    globalPatternScore: 0,
    aggregateFeatureScore: 0.85,
  },
  {
    invoiceId: "inv-2",
    invoiceNumber: "INV-002",
    customerId: "cust-1",
    customerName: "Acme Co",
    invoiceAmount: 400,
    invoiceDueDate: "2026-06-15",
    fuzzyPayerNameScore: 0.9,
    amountToleranceScore: 1,
    dateProximityScore: 1,
    historicalPayerBehaviorScore: 0.6,
    globalPatternScore: 0,
    aggregateFeatureScore: 0.85,
  },
];

vi.stubGlobal("fetch", vi.fn());

describe("SplitAllocationModal", () => {
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

  test("renders one labeled input per candidate", () => {
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/INV-001/)).toBeInTheDocument();
    expect(screen.getByLabelText(/INV-002/)).toBeInTheDocument();
  });

  test("disables confirm button when running total does not match", () => {
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/INV-001/), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText(/INV-002/), { target: { value: "300" } });
    expect(screen.getByRole("button", { name: /confirm split/i })).toBeDisabled();
  });

  test("enables confirm button when running total matches within tolerance", () => {
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/INV-001/), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText(/INV-002/), { target: { value: "400" } });
    expect(screen.getByRole("button", { name: /confirm split/i })).not.toBeDisabled();
  });

  test("submits the split and calls onResolved on success", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: {} }),
    } as Response);
    const onResolved = vi.fn();
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={vi.fn()}
        onResolved={onResolved}
      />,
    );
    fireEvent.change(screen.getByLabelText(/INV-001/), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText(/INV-002/), { target: { value: "400" } });
    await userEvent.click(screen.getByRole("button", { name: /confirm split/i }));
    expect(onResolved).toHaveBeenCalled();
  });

  test("Escape key closes the dialog", () => {
    const onClose = vi.fn();
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={onClose}
        onResolved={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("dialog has an accessible name via aria-labelledby", () => {
    render(
      <SplitAllocationModal
        reviewItemId="ri-1"
        candidates={candidates}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: /split payment across invoices/i }),
    ).toBeInTheDocument();
  });
});
