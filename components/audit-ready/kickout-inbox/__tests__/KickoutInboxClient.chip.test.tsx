// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { KickoutRow } from "@/lib/audit-ready/kickouts/list-kickouts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../../AccountDrilldown", () => ({
  AccountDrilldown: () => null,
}));
vi.mock("../../InvestigationModal", () => ({
  InvestigationModal: () => null,
}));
vi.mock("../../recon-face/WorkpaperSlideOver", () => ({
  WorkpaperSlideOver: () => null,
}));
vi.mock("../../recon-face/ReconFace", () => ({
  ReconFace: () => null,
}));

import { KickoutInboxClient } from "../../KickoutInboxClient";

const baseRow: KickoutRow = {
  id: "pbc:run-1",
  source_type: "pbc_run",
  source_id: "run-1",
  engagement_id: "eng-1",
  engagement_name: "Pilot engagement",
  account_or_kind: "AP aging",
  account_type: null,
  period_end: "2026-06-30",
  variance_cents: 25000,
  variance_pct: null,
  age_bucket: "new_this_close",
  latest_investigation: null,
  qbo_account_id: null,
  tie_out_kind: "ap_aging",
  similar_count: 0,
  bs_line_id: null,
  pbc_run_id: "run-1",
  parent_summary_run_id: null,
  subledger_source_url: null,
};

afterEach(cleanup);

describe("KickoutInboxClient prior-resolution chip", () => {
  it("renders the chip when similar_count is positive", () => {
    render(<KickoutInboxClient initialRows={[{ ...baseRow, similar_count: 2 }]} />);
    const chip = screen.getByText("🧠 2 prior");
    expect(chip).toHaveClass(
      "bg-[#C9A961]/10",
      "text-[#C9A961]",
      "border-[#C9A961]/30",
    );
  });

  it("does not render the chip when similar_count is zero", () => {
    render(<KickoutInboxClient initialRows={[baseRow]} />);
    expect(screen.queryByText(/prior/)).not.toBeInTheDocument();
  });

  it("does not render the chip when a legacy row has a null count", () => {
    render(
      <KickoutInboxClient
        initialRows={[
          { ...baseRow, similar_count: null as unknown as number },
        ]}
      />,
    );
    expect(screen.queryByText(/prior/)).not.toBeInTheDocument();
  });
});
