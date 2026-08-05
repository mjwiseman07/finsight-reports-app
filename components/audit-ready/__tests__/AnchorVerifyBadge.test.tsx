// @vitest-environment jsdom
/**
 * Phase MEM_LIFECYCLE Block 9.2 — AnchorVerifyBadge tests.
 *
 * Covers the accessibility contract the badge shipped to prove:
 *   - role="status" in idle/verifying/verified/not-anchored
 *   - role="alert" ONLY when signature verification actually fails
 *   - aria-busy while verifying
 *   - Icon aria-hidden
 *   - "for auditors" toggle expands the tier-3 detail panel
 *   - Toggle does NOT propagate a click that would open the outer row
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnchorVerifyBadge } from "../AnchorVerifyBadge";
import { _clearAnchorVerifyCacheForTests } from "@/lib/pilot-lifecycle/anchor-verify-queue";

vi.mock("@/lib/pilot-lifecycle/anchor-verify-queue", async () => {
  const mod = await vi.importActual<typeof import("@/lib/pilot-lifecycle/anchor-verify-queue")>(
    "@/lib/pilot-lifecycle/anchor-verify-queue",
  );
  return {
    ...mod,
    getAnchorVerification: vi.fn(),
  };
});

import { getAnchorVerification } from "@/lib/pilot-lifecycle/anchor-verify-queue";

const mkReport = (overallOk = true) => ({
  chain_seq: 7,
  event_id: "evt-7",
  batch_id: 1,
  merkle_ok: overallOk,
  merkle_expected_root_hex: "aa".repeat(32),
  merkle_actual_root_hex: overallOk ? "aa".repeat(32) : "bb".repeat(32),
  tsrs: [
    {
      tsa_name: "digicert",
      tsa_url: "http://timestamp.digicert.com",
      genTime: "2026-08-04T22:10:00Z",
      messageImprintMatches: overallOk,
      cmsSignatureOk: overallOk,
      chainOk: overallOk,
      trustPinMatched: overallOk,
      trustPinFilename: overallOk ? "digicert-trusted-root-g4-selfsigned.pem" : null,
      signerCertFingerprintHex: "cafe" + "0".repeat(60),
      ekuOk: overallOk,
      validityAsOfGenTime: {
        overallOk: overallOk,
        perCert: [],
      },
      algorithm: "sha256WithRSAEncryption",
      cmsNotes: overallOk ? [] : ["signedAttrs digest mismatch"],
    },
  ],
  overallOk,
  notes: [],
  version: "9.1" as const,
});

describe("AnchorVerifyBadge", () => {
  beforeEach(() => {
    _clearAnchorVerifyCacheForTests();
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("renders idle state when active=false", () => {
    render(<AnchorVerifyBadge chainSeq={7} active={false} />);
    const region = screen.getByRole("status");
    expect(region).toBeTruthy();
    expect(screen.getByText(/not checked/i)).toBeTruthy();
  });

  it("transitions to verifying then verified when active=true", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "ok",
      report: mkReport(true),
    });

    render(<AnchorVerifyBadge chainSeq={7} active={true} />);

    // The verifying state's role="status" region has aria-busy="true".
    await waitFor(() => {
      const region = screen.getByRole("status");
      expect(region.getAttribute("aria-busy")).toBe("true");
    });

    // Wait for verify to resolve.
    await waitFor(() => {
      expect(screen.getByText(/^anchored$/i)).toBeTruthy();
    });

    // After resolution, aria-busy is cleared and container is still role="status".
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-busy")).not.toBe("true");
  });

  it("uses role='alert' when signature verification fails", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "ok",
      report: mkReport(false),
    });

    render(<AnchorVerifyBadge chainSeq={7} active={true} />);

    await waitFor(() => {
      // Tamper state — role should have switched to alert, NOT status.
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText(/verification failed/i)).toBeTruthy();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("uses role='alert' on error (fetch or verify threw)", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "error",
      message: "boom",
    });

    render(<AnchorVerifyBadge chainSeq={7} active={true} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText(/check failed/i)).toBeTruthy();
    });
  });

  it("shows 'not anchored' with role='status' and no expander", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "not-anchored",
      reason: "no anchor covers this chain_seq",
    });

    render(<AnchorVerifyBadge chainSeq={7} active={true} />);

    await waitFor(() => {
      expect(screen.getByText(/not anchored/i)).toBeTruthy();
    });
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /for auditors/i })).toBeNull();
  });

  it("expands the for-auditors panel and does not propagate the click", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "ok",
      report: mkReport(true),
    });

    const outerClick = vi.fn();

    render(
      <div onClick={outerClick}>
        <AnchorVerifyBadge chainSeq={7} active={true} />
      </div>,
    );

    await waitFor(() => screen.getByText(/^anchored$/i));

    const toggle = await screen.findByRole("button", { name: /for auditors/i });
    await act(async () => {
      await userEvent.click(toggle);
    });

    expect(outerClick).not.toHaveBeenCalled();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/Merkle inclusion/i)).toBeTruthy();
    expect(screen.getByText(/digicert-trusted-root-g4-selfsigned\.pem/)).toBeTruthy();
  });

  it("all icons are aria-hidden", async () => {
    (getAnchorVerification as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "ok",
      report: mkReport(true),
    });

    const { container } = render(<AnchorVerifyBadge chainSeq={7} active={true} />);
    await waitFor(() => screen.getByText(/^anchored$/i));

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of Array.from(svgs)) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
