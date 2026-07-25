// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WorkpaperSlideOver } from "../WorkpaperSlideOver";

vi.mock("../ReconFace", () => ({
  ReconFace: ({ runId }: { runId: string }) => (
    <div data-testid="mock-recon-face">face:{runId}</div>
  ),
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("WorkpaperSlideOver", () => {
  it("returns null when runId is null", () => {
    const { container } = render(
      <WorkpaperSlideOver runId={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("Escape key closes", () => {
    const onClose = vi.fn();
    render(<WorkpaperSlideOver runId="run-1" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("backdrop click closes", () => {
    const onClose = vi.fn();
    render(<WorkpaperSlideOver runId="run-1" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("workpaper-slide-over-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders ReconFace for a runId", () => {
    render(<WorkpaperSlideOver runId="run-abc" onClose={vi.fn()} />);
    expect(screen.getByTestId("mock-recon-face")).toHaveTextContent(
      "face:run-abc",
    );
  });
});
