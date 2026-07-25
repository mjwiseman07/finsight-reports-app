// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReconFaceBody } from "../ReconFaceBody";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";

const base: Omit<
  ReconFaceSpec,
  | "mode"
  | "leftLabel"
  | "leftAmountCents"
  | "rightLabel"
  | "rightAmountCents"
  | "varianceCents"
  | "tieStatus"
> = {
  toleranceCents: 100,
  sections: [],
  engagementName: "Pilot",
  engagementId: "eng-1",
  periodEnd: "2026-06-30",
  tieOutKind: "ap_aging",
  runId: "run-1",
  generatedAt: "2026-07-24T12:00:00Z",
};

afterEach(() => cleanup());

describe("ReconFaceBody", () => {
  it("two_sided renders variance row + tie badge", () => {
    const face: ReconFaceSpec = {
      ...base,
      mode: "two_sided",
      leftLabel: "AP Subledger",
      leftAmountCents: 10000,
      rightLabel: "GL AP Account",
      rightAmountCents: 9000,
      varianceCents: 1000,
      tieStatus: "kickout",
    };
    render(<ReconFaceBody face={face} />);
    expect(screen.getByText(/Per AP Subledger/)).toBeInTheDocument();
    expect(screen.getByText(/Per GL AP Account/)).toBeInTheDocument();
    expect(screen.getByText("Variance")).toBeInTheDocument();
    expect(screen.getByText("KICKOUT")).toBeInTheDocument();
  });

  it("report_only renders single-line + basis chip + note", () => {
    const face: ReconFaceSpec = {
      ...base,
      mode: "report_only",
      tieOutKind: "grni",
      leftLabel: "Open Unbilled Bills",
      leftAmountCents: 560267,
      rightLabel: null,
      rightAmountCents: null,
      varianceCents: null,
      tieStatus: "ties",
    };
    render(<ReconFaceBody face={face} />);
    expect(screen.getByText(/Per Open Unbilled Bills/)).toBeInTheDocument();
    expect(screen.getByText("Basis: REPORT")).toBeInTheDocument();
    expect(screen.getByText(/Report-only view/i)).toBeInTheDocument();
    expect(screen.queryByText("Variance")).not.toBeInTheDocument();
    expect(screen.queryByText("KICKOUT")).not.toBeInTheDocument();
  });
});
