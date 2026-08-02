// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReconRollupStrip } from "../ReconRollupStrip";
import type { ReconRollupRow } from "@/lib/audit-ready/tie-out/rollup";

function makeRow(overrides: Partial<ReconRollupRow>): ReconRollupRow {
  return {
    kind: "bs_recon_summary",
    runId: "run-1",
    runStatus: "completed",
    totalsStatus: "tie",
    varianceCents: 0,
    subledgerCents: 100000,
    glCents: 100000,
    completedAt: "2026-07-01T12:00:00Z",
    artifactId: "art-1",
    ...overrides,
  };
}

describe("ReconRollupStrip", () => {
  afterEach(cleanup);

  it("renders the heading with the period end", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({})]}
      />,
    );
    expect(
      screen.getByText(/Reconciliation Rollup — as of 2026-06-30/),
    ).toBeInTheDocument();
  });

  it("shows the correct 'N of 7 kinds run' counter", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[
          makeRow({ kind: "bs_recon_summary", runId: "r1" }),
          makeRow({ kind: "ap_aging", runId: "r2" }),
          makeRow({ kind: "ar_aging", runId: "r3" }),
        ]}
      />,
    );
    expect(screen.getByText("3 of 7 kinds run")).toBeInTheDocument();
  });

  it("renders one row per input row, in the order provided", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[
          makeRow({ kind: "bs_recon_summary", runId: "r1" }),
          makeRow({ kind: "ar_aging", runId: "r2", totalsStatus: "kickout" }),
        ]}
      />,
    );
    expect(screen.getByText("Balance Sheet Summary")).toBeInTheDocument();
    expect(screen.getByText("AR Aging")).toBeInTheDocument();
  });

  it("formats variance as USD cents", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ varianceCents: 12345 })]}
      />,
    );
    expect(screen.getByText("$123.45")).toBeInTheDocument();
  });

  it("shows Tied pill for bs_recon_summary with totals_status=tie", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[
          makeRow({ kind: "bs_recon_summary", totalsStatus: "tie" }),
        ]}
      />,
    );
    expect(screen.getByText("Tied")).toBeInTheDocument();
  });

  it("shows Needs review pill for bs_recon_summary with totals_status=review", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[
          makeRow({ kind: "bs_recon_summary", totalsStatus: "review" }),
        ]}
      />,
    );
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("disables Open workpaper button for non-completed runs", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ runStatus: "pending" })]}
      />,
    );
    const btn = screen.getByRole("button", { name: /Open workpaper/i });
    expect(btn).toBeDisabled();
  });

  it("enables Open workpaper button for completed runs", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ runStatus: "completed" })]}
      />,
    );
    const btn = screen.getByRole("button", { name: /Open workpaper/i });
    expect(btn).not.toBeDisabled();
  });

  it("renders an empty ul (no rows) without crashing", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[]}
      />,
    );
    expect(screen.getByText("0 of 7 kinds run")).toBeInTheDocument();
  });
});
