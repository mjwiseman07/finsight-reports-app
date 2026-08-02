// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  TieOutStatePill,
  BsStatusPill,
  RunStatusPill,
  __TEST_ONLY__,
} from "../status-pills";

afterEach(() => {
  cleanup();
});

describe("status-pills", () => {
  describe("TieOutStatePill", () => {
    it("renders every shipped tie-out state with its correct classes", () => {
      const states = Object.keys(__TEST_ONLY__.TIE_OUT_STATE_STYLES);
      expect(states.length).toBe(10); // 4 from TIEOUT-1 + 6 from TIEOUT-2
      for (const state of states) {
        const { unmount } = render(<TieOutStatePill state={state} />);
        const pill = screen.getByText(state.replace(/_/g, " "));
        const expected = __TEST_ONLY__.TIE_OUT_STATE_STYLES[
          state as keyof typeof __TEST_ONLY__.TIE_OUT_STATE_STYLES
        ];
        for (const cls of expected.split(" ")) {
          expect(pill).toHaveClass(cls);
        }
        for (const cls of __TEST_ONLY__.PILL_BASE.split(" ")) {
          expect(pill).toHaveClass(cls);
        }
        unmount();
      }
    });

    it("falls back to slate for unknown states", () => {
      render(<TieOutStatePill state="not_a_real_state" />);
      const pill = screen.getByText("not a real state");
      for (const cls of __TEST_ONLY__.FALLBACK.split(" ")) {
        expect(pill).toHaveClass(cls);
      }
    });

    it("underscores in state values become spaces in the default label", () => {
      render(<TieOutStatePill state="ready_to_run" />);
      expect(screen.getByText("ready to run")).toBeInTheDocument();
    });

    it("respects a custom child label when provided", () => {
      render(<TieOutStatePill state="tied_out">Custom Label</TieOutStatePill>);
      expect(screen.getByText("Custom Label")).toBeInTheDocument();
      expect(screen.queryByText("tied out")).not.toBeInTheDocument();
    });
  });

  describe("BsStatusPill", () => {
    it.each([
      ["tie", "Tied"],
      ["out_of_balance", "Needs review"],
      ["missing", "Missing"],
    ])("renders %s as %s", (status, label) => {
      render(<BsStatusPill status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("treats unknown status as missing", () => {
      render(<BsStatusPill status="whatever" />);
      expect(screen.getByText("Missing")).toBeInTheDocument();
    });
  });

  describe("RunStatusPill", () => {
    it.each([
      ["passed", "Passed"],
      ["failed", "Failed"],
      ["not_run", "Not run"],
      ["superseded", "Superseded"],
    ])("renders %s as %s", (status, label) => {
      render(<RunStatusPill status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("treats unknown status as not_run", () => {
      render(<RunStatusPill status="mystery" />);
      expect(screen.getByText("Not run")).toBeInTheDocument();
    });
  });
});
