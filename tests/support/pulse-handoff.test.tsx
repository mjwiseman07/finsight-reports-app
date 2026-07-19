// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { GlobalPulseLauncher } from "../../components/GlobalPulseLauncher";

vi.mock("../../lib/pulse-predict", () => ({
  answerPulseCfoQuestion: () => "This is a mocked Pulse answer with details about cash flow.",
  pulseAiCoreQuestions: ["Q1", "Q2", "Q3", "Q4"],
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: { getItem: () => "", setItem: () => {}, removeItem: () => {} },
    writable: true,
    configurable: true,
  });
});

describe("GlobalPulseLauncher — per-message actions", () => {
  it("greeting message does NOT show action row", () => {
    render(<GlobalPulseLauncher />);
    fireEvent.click(screen.getByText("Pulse"));
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    expect(screen.queryByText("Report")).not.toBeInTheDocument();
  });

  it("assistant reply shows Copy and Report buttons", async () => {
    render(<GlobalPulseLauncher />);
    fireEvent.click(screen.getByText("Pulse"));
    const input = screen.getByPlaceholderText("Ask Pulse...");
    fireEvent.change(input, { target: { value: "What is my cash runway?" } });
    fireEvent.click(screen.getByText("Ask"));

    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());
    expect(screen.getByText("Report")).toBeInTheDocument();
  });

  it("Report link carries pulse_handoff context and encoded prefill params", async () => {
    render(<GlobalPulseLauncher />);
    fireEvent.click(screen.getByText("Pulse"));
    fireEvent.change(screen.getByPlaceholderText("Ask Pulse..."), {
      target: { value: "What is my cash runway?" },
    });
    fireEvent.click(screen.getByText("Ask"));

    const link = await screen.findByText("Report");
    const href = (link as HTMLAnchorElement).getAttribute("href") || "";
    expect(href).toContain("context=pulse_handoff");
    expect(href).toContain("prefill_question=");
    expect(href).toContain("prefill_answer=");
    const params = new URLSearchParams(href.split("?")[1] || "");
    expect(params.get("prefill_question")).toBe("What is my cash runway?");
  });

  it("Copy button uses clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<GlobalPulseLauncher />);
    fireEvent.click(screen.getByText("Pulse"));
    fireEvent.change(screen.getByPlaceholderText("Ask Pulse..."), {
      target: { value: "test question" },
    });
    fireEvent.click(screen.getByText("Ask"));

    const copyBtn = await screen.findByText("Copy");
    fireEvent.click(copyBtn);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });

  it("advisacor:open-pulse event opens the launcher", async () => {
    render(<GlobalPulseLauncher />);
    // Panel not yet open
    expect(screen.queryByPlaceholderText("Ask Pulse...")).not.toBeInTheDocument();
    document.dispatchEvent(new CustomEvent("advisacor:open-pulse"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Ask Pulse...")).toBeInTheDocument(),
    );
  });
});
