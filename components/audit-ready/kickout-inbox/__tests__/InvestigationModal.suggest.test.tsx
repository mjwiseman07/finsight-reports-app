// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InvestigationModal } from "../../InvestigationModal";
import type { KickoutRow } from "@/lib/audit-ready/kickouts/list-kickouts";

const fetchMock = vi.fn();

const row: KickoutRow = {
  id: "bs:line-1",
  source_type: "bs_summary_line",
  source_id: "line-1",
  engagement_id: "eng-1",
  engagement_name: "Pilot engagement",
  account_or_kind: "Checking",
  account_type: "Bank",
  period_end: "2026-06-30",
  variance_cents: 5000,
  variance_pct: 1,
  age_bucket: "new_this_close",
  latest_investigation: null,
  qbo_account_id: "35",
  tie_out_kind: null,
  similar_count: 1,
  bs_line_id: "line-1",
  pbc_run_id: null,
  parent_summary_run_id: "summary-1",
  subledger_source_url: null,
};

const legacySuggestion = {
  investigationId: "inv-legacy",
  investigatedAt: "2026-07-20T00:00:00Z",
  investigatedBy: "user-1",
  note: "Legacy timing note",
  resolutionCode: null,
  resolutionStatus: "resolved",
  matchKey: "35",
};

const codedSuggestion = {
  ...legacySuggestion,
  investigationId: "inv-coded",
  note: "Clears next month",
  resolutionCode: "timing",
};

function renderModal() {
  return render(
    <InvestigationModal
      row={row}
      onClose={vi.fn()}
      onSuccess={vi.fn()}
    />,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("InvestigationModal suggestions", () => {
  it("renders similar prior resolutions including a legacy null code", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [legacySuggestion] }),
    });
    renderModal();

    expect(
      await screen.findByText(/Similar prior resolutions on this account/),
    ).toBeInTheDocument();
    expect(screen.getByText("Legacy timing note", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Jul 20, 2026 — —/)).toBeInTheDocument();
  });

  it("hides the suggestion section when there are no matches", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    renderModal();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(/Similar prior resolutions/),
    ).not.toBeInTheDocument();
  });

  it("copies a prior note and resolution code", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [codedSuggestion] }),
    });
    renderModal();

    fireEvent.click(await screen.findByText("Copy to my resolution"));
    expect(screen.getByRole("textbox")).toHaveValue("Clears next month");
    expect(screen.getByLabelText(/Resolution disposition/)).toHaveValue(
      "timing",
    );
  });

  it("fires copy_clicked event when Copy is clicked", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [codedSuggestion] }),
    });
    renderModal();

    fireEvent.click(await screen.findByText("Copy to my resolution"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/audit-ready/memory/events",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            event_type: "copy_clicked",
            engagement_id: "eng-1",
            payload: {
              copied_investigation_id: "inv-coded",
              copied_resolution_code: "timing",
              kickout_source_type: "bs_summary_line",
              kickout_source_id: "line-1",
            },
          }),
        }),
      ),
    );
  });

  it("disables Save for Resolved without a resolution code", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    renderModal();

    fireEvent.change(screen.getByLabelText("Resolution status"), {
      target: { value: "resolved" },
    });
    expect(
      screen.getByRole("button", { name: "Save investigation" }),
    ).toBeDisabled();
  });

  it("sends resolution_code and null copied_from when saving without copy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ investigation: { id: "inv-new" } }),
      });
    renderModal();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Resolved as immaterial" },
    });
    fireEvent.change(screen.getByLabelText(/Resolution disposition/), {
      target: { value: "immaterial" },
    });
    fireEvent.change(screen.getByLabelText("Resolution status"), {
      target: { value: "resolved" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save investigation" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({
        resolution_status: "resolved",
        resolution_code: "immaterial",
        copied_from_investigation_id: null,
      }),
    );
  });

  it("includes copied_from_investigation_id on Save after copy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [codedSuggestion] }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
    renderModal();

    fireEvent.click(await screen.findByText("Copy to my resolution"));
    fireEvent.change(screen.getByLabelText("Resolution status"), {
      target: { value: "resolved" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save investigation" }),
    );

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(
        ([url]) =>
          typeof url === "string" &&
          url.includes("/api/audit-ready/kickouts/investigations"),
      );
      expect(saveCall).toBeTruthy();
      const init = saveCall![1] as RequestInit;
      expect(JSON.parse(String(init.body))).toEqual(
        expect.objectContaining({
          copied_from_investigation_id: "inv-coded",
          resolution_code: "timing",
        }),
      );
    });
  });
});
