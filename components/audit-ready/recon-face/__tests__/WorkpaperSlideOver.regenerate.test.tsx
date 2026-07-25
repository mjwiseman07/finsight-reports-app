// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WorkpaperSlideOver } from "../WorkpaperSlideOver";

vi.mock("../ReconFace", () => ({
  ReconFace: ({ runId }: { runId: string }) => (
    <div data-testid="mock-recon-face">face:{runId}</div>
  ),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  vi.stubGlobal("alert", vi.fn());
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});

describe("WorkpaperSlideOver regenerate", () => {
  it("POSTs regenerate and calls onRegenerated with new_run_id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ new_run_id: "run-2" }),
    });
    const onRegenerated = vi.fn();
    render(
      <WorkpaperSlideOver
        runId="run-1"
        onClose={vi.fn()}
        onRegenerated={onRegenerated}
      />,
    );

    fireEvent.click(screen.getByTestId("workpaper-regenerate"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/audit-ready/runs/run-1/regenerate",
        { method: "POST" },
      );
      expect(onRegenerated).toHaveBeenCalledWith("run-2");
    });
  });

  it("does not fetch when confirm is cancelled", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<WorkpaperSlideOver runId="run-1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("workpaper-regenerate"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("alerts on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "resolver_failed" }),
    });
    render(<WorkpaperSlideOver runId="run-1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("workpaper-regenerate"));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("resolver_failed");
    });
  });
});
