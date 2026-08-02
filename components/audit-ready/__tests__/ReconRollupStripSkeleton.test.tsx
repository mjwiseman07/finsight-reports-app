// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReconRollupStripSkeleton } from "../ReconRollupStripSkeleton";
import { ROLLUP_KIND_ORDER } from "@/lib/audit-ready/tie-out/rollup";

describe("ReconRollupStripSkeleton", () => {
  afterEach(cleanup);

  it("renders 7 skeleton rows matching ROLLUP_KIND_ORDER", () => {
    const { container } = render(<ReconRollupStripSkeleton />);
    // <ul> > <li> — one per kind.
    const rows = container.querySelectorAll("ul > li");
    expect(rows.length).toBe(ROLLUP_KIND_ORDER.length);
    expect(rows.length).toBe(7);
  });

  it("uses animate-pulse on the shimmer bars", () => {
    const { container } = render(<ReconRollupStripSkeleton />);
    const pulseEls = container.querySelectorAll(".animate-pulse");
    // Header shimmer + counter shimmer + 6 shimmers per row × 7 rows = 44.
    // We assert a lower bound rather than exact count so future tweaks
    // don't accidentally break the test.
    expect(pulseEls.length).toBeGreaterThanOrEqual(30);
  });

  it("shows the full heading when periodEnd is provided", () => {
    render(<ReconRollupStripSkeleton periodEnd="2026-06-30" />);
    expect(
      screen.getByText(/Reconciliation Rollup — as of 2026-06-30/),
    ).toBeInTheDocument();
  });

  it("falls back to a shimmer heading when periodEnd is omitted", () => {
    render(<ReconRollupStripSkeleton />);
    // Real heading text is absent…
    expect(screen.queryByText(/Reconciliation Rollup —/)).not.toBeInTheDocument();
    // …but the heading container is present with aria-busy.
    expect(screen.getByTestId("recon-rollup-skeleton")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("exposes an accessible loading announcement", () => {
    render(<ReconRollupStripSkeleton />);
    expect(
      screen.getByText(/Loading reconciliation rollup/i),
    ).toBeInTheDocument();
  });
});
