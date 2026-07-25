// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReconFace } from "../ReconFace";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";

vi.stubGlobal("fetch", vi.fn());

const twoSidedPayload: WorkpaperPayload = {
  face: {
    mode: "two_sided",
    leftLabel: "AP Subledger",
    leftAmountCents: 10000,
    rightLabel: "GL AP Account",
    rightAmountCents: 10000,
    varianceCents: 0,
    toleranceCents: 100,
    tieStatus: "ties",
    sections: [
      { label: "Vendors", amountCents: 10000, backupTabName: "Vendor Rollup" },
    ],
    engagementName: "Pilot Client",
    engagementId: "eng-1",
    periodEnd: "2026-06-30",
    tieOutKind: "ap_aging",
    runId: "run-1",
    generatedAt: "2026-07-24T12:00:00Z",
  },
  backupTabs: [
    {
      tabName: "Vendor Rollup",
      columns: [
        { key: "vendor_name", label: "Vendor Name", format: "text" },
        { key: "subledger_total", label: "Subledger Total", format: "currency" },
      ],
      rows: [{ vendor_name: "Acme", subledger_total: 10000 }],
    },
  ],
  sourceData: {
    qboRealmId: "realm-1",
    qboConnectionId: "",
    apiResponseJson: { kind: "ap_aging" },
    fetchedAt: "2026-07-24T12:00:00Z",
  },
};

beforeEach(() => {
  vi.mocked(fetch).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ReconFace", () => {
  it("renders skeleton while loading", () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    render(<ReconFace runId="run-1" variant="page" />);
    expect(screen.getByTestId("recon-face-skeleton")).toBeInTheDocument();
  });

  it("renders payload on success", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        payload: twoSidedPayload,
        downloads: { xlsx: "https://x.xlsx", pdf: "https://x.pdf" },
      }),
    } as Response);

    render(<ReconFace runId="run-1" variant="page" />);
    await waitFor(() =>
      expect(screen.getByTestId("recon-face-page")).toBeInTheDocument(),
    );
    expect(screen.getByText("Pilot Client")).toBeInTheDocument();
    expect(screen.getByText("Download XLSX")).toBeInTheDocument();
    expect(screen.getByText("Vendor Rollup")).toBeInTheDocument();
  });

  it("renders error state on failure", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "run_not_found" }),
    } as Response);

    render(<ReconFace runId="run-missing" variant="inline" />);
    await waitFor(() =>
      expect(screen.getByTestId("recon-face-error")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Run not found or has been deleted/i),
    ).toBeInTheDocument();
  });

  it("renders 501 empty-state message", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 501,
      json: async () => ({
        error: "emitter_not_yet_shipped",
        kind: "bank_recon",
      }),
    } as Response);

    render(<ReconFace runId="run-1" variant="page" />);
    await waitFor(() =>
      expect(screen.getByTestId("recon-face-error")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/does not yet have a workpaper/i),
    ).toBeInTheDocument();
  });
});
