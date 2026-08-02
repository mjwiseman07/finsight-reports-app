// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock the rollup fetch so we can control what rows come back.
const mockGetRollup = vi.fn();
vi.mock("@/lib/audit-ready/tie-out/rollup", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/audit-ready/tie-out/rollup")
  >("@/lib/audit-ready/tie-out/rollup");
  return {
    ...actual,
    getReconRollupByPeriodEnd: (...args: unknown[]) => mockGetRollup(...args),
  };
});

// Mock next/navigation because <ReconRollupStrip> uses useOpenRunUrl.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/audit-ready/eng-1/tie-out-summary",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../recon-face/ReconFace", () => ({
  ReconFace: () => <div data-testid="recon-face-mock">ReconFace</div>,
}));

import { ReconRollupSection } from "../ReconRollupSection";

describe("ReconRollupSection", () => {
  beforeEach(() => {
    mockGetRollup.mockReset();
  });
  afterEach(cleanup);

  it("renders the empty state when zero rows come back", async () => {
    mockGetRollup.mockResolvedValue([]);
    const ui = await ReconRollupSection({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
      initialOpenRunId: null,
    });
    render(ui);
    expect(screen.getByTestId("recon-rollup-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/No tie-out runs recorded for 2026-06-30/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Trigger a classify or resolver run/),
    ).toBeInTheDocument();
    // The strip's counter matches the empty-state counter to avoid confusion.
    expect(screen.getByText("0 of 7 kinds run")).toBeInTheDocument();
  });

  it("renders the strip when rows come back", async () => {
    mockGetRollup.mockResolvedValue([
      {
        kind: "bs_recon_summary",
        runId: "run-1",
        runStatus: "completed",
        totalsStatus: "tie",
        varianceCents: 0,
        subledgerCents: 100000,
        glCents: 100000,
        completedAt: "2026-07-01T12:00:00Z",
        artifactId: "art-1",
      },
    ]);
    const ui = await ReconRollupSection({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
      initialOpenRunId: null,
    });
    render(ui);
    expect(screen.getByText("Balance Sheet Summary")).toBeInTheDocument();
    expect(screen.getByText("1 of 7 kinds run")).toBeInTheDocument();
    expect(screen.queryByTestId("recon-rollup-empty")).not.toBeInTheDocument();
  });

  it("passes missingKinds for the partial case", async () => {
    mockGetRollup.mockResolvedValue([
      {
        kind: "bs_recon_summary",
        runId: "run-1",
        runStatus: "completed",
        totalsStatus: "tie",
        varianceCents: 0,
        subledgerCents: 100000,
        glCents: 100000,
        completedAt: "2026-07-01T12:00:00Z",
        artifactId: "art-1",
      },
    ]);
    const ui = await ReconRollupSection({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
      initialOpenRunId: null,
    });
    render(ui);
    const missing = screen.getByTestId("recon-rollup-missing-kinds");
    expect(missing).toBeInTheDocument();
    // Should list the other 6 kinds by human-readable label.
    expect(missing.textContent).toContain("Balance Sheet Accounts");
    expect(missing.textContent).toContain("AR Aging");
    expect(missing.textContent).toContain("AP Aging");
    expect(missing.textContent).toContain("Inventory");
    expect(missing.textContent).toContain("GRNI");
    expect(missing.textContent).toContain("Fixed Asset Rollforward");
  });

  it("hides the missing-kinds diagnostic when all 7 kinds are present", async () => {
    const baseRow = {
      runId: "run-x",
      runStatus: "completed" as const,
      totalsStatus: "tie" as const,
      varianceCents: 0,
      subledgerCents: 100000,
      glCents: 100000,
      completedAt: "2026-07-01T12:00:00Z",
      artifactId: null,
    };
    mockGetRollup.mockResolvedValue([
      { ...baseRow, kind: "bs_recon_summary", runId: "r1" },
      { ...baseRow, kind: "bs_account_recon", runId: "r2" },
      { ...baseRow, kind: "ar_aging", runId: "r3" },
      { ...baseRow, kind: "ap_aging", runId: "r4" },
      { ...baseRow, kind: "inventory", runId: "r5" },
      { ...baseRow, kind: "grni", runId: "r6" },
      { ...baseRow, kind: "fixed_asset_rollforward", runId: "r7" },
    ]);
    const ui = await ReconRollupSection({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
      initialOpenRunId: null,
    });
    render(ui);
    expect(screen.getByText("7 of 7 kinds run")).toBeInTheDocument();
    expect(
      screen.queryByTestId("recon-rollup-missing-kinds"),
    ).not.toBeInTheDocument();
  });
});
