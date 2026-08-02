// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReconRollupStrip } from "../ReconRollupStrip";
import type { ReconRollupRow } from "@/lib/audit-ready/tie-out/rollup";

const mockReplace = vi.fn();
let mockSearchParamsSource = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/audit-ready/eng-1/tie-out-summary",
  useSearchParams: () => mockSearchParamsSource,
}));

vi.mock("../recon-face/ReconFace", () => ({
  ReconFace: () => <div data-testid="recon-face-mock">ReconFace</div>,
}));

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
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParamsSource = new URLSearchParams();
  });
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

  it("seeds the slide-over open when initialOpenRunId is provided", () => {
    // Mirror a real deep-link: URL already carries open_run so the hook
    // effect does not clear the server-seeded value.
    mockSearchParamsSource = new URLSearchParams({ open_run: "seed-run-1" });
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ runStatus: "completed", runId: "seed-run-1" })]}
        initialOpenRunId="seed-run-1"
      />,
    );
    expect(
      screen.getByTestId("workpaper-slide-over"),
    ).toBeInTheDocument();
  });

  it("writes ?open_run to the URL when Open workpaper is clicked", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ runStatus: "completed", runId: "click-run-1" })]}
      />,
    );
    const btn = screen.getByRole("button", { name: /Open workpaper/i });
    fireEvent.click(btn);
    expect(mockReplace).toHaveBeenCalled();
    const [url] = mockReplace.mock.calls.at(-1)!;
    expect(url).toContain("open_run=click-run-1");
  });

  it("clears ?open_run when the slide-over is closed", () => {
    mockSearchParamsSource = new URLSearchParams({ open_run: "closer-run" });
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ runStatus: "completed", runId: "closer-run" })]}
        initialOpenRunId="closer-run"
      />,
    );
    // The Close button lives inside WorkpaperSlideOver.
    const closeBtn = screen.getByRole("button", { name: /^Close$/i });
    fireEvent.click(closeBtn);
    expect(mockReplace).toHaveBeenCalled();
    const [url] = mockReplace.mock.calls.at(-1)!;
    expect(url).not.toContain("open_run=");
  });

  it("renders the missing-kinds diagnostic when non-empty", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ kind: "bs_recon_summary", runId: "r1" })]}
        missingKinds={["ap_aging", "ar_aging"]}
      />,
    );
    const line = screen.getByTestId("recon-rollup-missing-kinds");
    expect(line).toBeInTheDocument();
    expect(line.textContent).toContain("AP Aging");
    expect(line.textContent).toContain("AR Aging");
    expect(line.textContent).toContain("Not yet run");
  });

  it("hides the missing-kinds diagnostic when the prop is empty", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ kind: "bs_recon_summary", runId: "r1" })]}
        missingKinds={[]}
      />,
    );
    expect(
      screen.queryByTestId("recon-rollup-missing-kinds"),
    ).not.toBeInTheDocument();
  });

  it("hides the missing-kinds diagnostic when the prop is omitted", () => {
    render(
      <ReconRollupStrip
        engagementId="eng-1"
        periodEnd="2026-06-30"
        rows={[makeRow({ kind: "bs_recon_summary", runId: "r1" })]}
      />,
    );
    expect(
      screen.queryByTestId("recon-rollup-missing-kinds"),
    ).not.toBeInTheDocument();
  });
});
