"use client";

/**
 * Phase MEM_LIFECYCLE Block 9.2 — anchor verification badge.
 *
 * THREE-TIER PROGRESSIVE DISCLOSURE (per Block_9_2_UX_Research.md §Q3 synthesis):
 *
 *   Tier 1 — glanceable badge: icon + one word. Always visible. WCAG 1.4.1
 *            compliant (icon shape carries the state, not just color).
 *
 *   Tier 2 — hover/focus tooltip: 1-2 sentences of plain language explaining
 *            what was checked and when. This is the tier Distler et al. (2022,
 *            N=2180) empirically found most predictive of both perceived
 *            security and correct understanding for non-expert users.
 *
 *   Tier 3 — expandable "auditor detail" section: full cryptographic proof
 *            material (signer cert fingerprint, TSA URL, algorithm, per-cert
 *            validity table, raw VerifyReport JSON for copy). This is the
 *            "for auditors" tier that GitHub's commit-verification API surface
 *            and the W3C VC 2.0 wallet detail-screen pattern both demonstrate.
 *
 * ACCESSIBILITY (per Block_9_2_UX_Research.md §Q2):
 *   - Verifying/verified/not-anchored states use role="status" (implicit
 *     aria-live="polite", implicit aria-atomic="true").
 *   - Tamper-detected/failed state uses role="alert" (assertive) because a
 *     genuine verification failure IS the "important and time-sensitive"
 *     case aria-live=assertive is defined for.
 *   - Icons carry aria-hidden="true" because their meaning is duplicated in
 *     the text label — screen readers should not double-read them.
 *   - The badge does not receive focus on state change (per role="status"
 *     spec: "do not give focus to the status when its content updates").
 *   - Tier-3 expansion is triggered by a native <button> so keyboard users
 *     get it for free with Space/Enter.
 *
 * NARROW CLAIM ONLY (per Chrome lock-icon lesson, Block_9_2_UX_Research.md §2.5):
 *   The tier-1 word MUST be narrow — "Anchored" or "Timestamped", never
 *   "Trusted" or "Safe" or "Verified as correct." Chrome's own 11%-correct-
 *   understanding study proved users over-read a trust glyph. Our tier-2
 *   text and tier-3 panel expand into the actual specifics.
 *
 * STYLE:
 *   Uses existing dark-theme AR colors ONLY. No marketing-scope brand tokens
 *   on AR internal surfaces. Reuses [#C9A961] / emerald / red / amber
 *   utility classes already in the AR codebase.
 */

import { useEffect, useMemo, useState, type JSX } from "react";
import { getAnchorVerification, type QueueResult } from "@/lib/pilot-lifecycle/anchor-verify-queue";
import type { VerifyReport } from "@/lib/pilot-lifecycle/anchor-verifier";

// ---------------------------------------------------------------------------
// Icon components (inline SVG, aria-hidden, WCAG 1.4.1-compliant shapes).
// Different states get DIFFERENT SHAPES, not just different colors.
// ---------------------------------------------------------------------------

function ShieldCheckIcon({ className }: { className?: string }) {
  // Shield-check = "cryptographically anchored" (verified).
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 2 3 4v6c0 4 3 7 7 8 4-1 7-4 7-8V4l-7-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m7 10 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldSpinnerIcon({ className }: { className?: string }) {
  // Shield with animated dashed circle = "verifying" — same shield family,
  // different fill state.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 2 3 4v6c0 4 3 7 7 8 4-1 7-4 7-8V4l-7-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <circle
        cx="10"
        cy="10"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        className="anchor-badge-spin"
      />
    </svg>
  );
}

function ShieldBrokenIcon({ className }: { className?: string }) {
  // Shield with X — different shape from check, so distinguishable in grayscale.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 2 3 4v6c0 4 3 7 7 8 4-1 7-4 7-8V4l-7-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m7 7 6 6M13 7l-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashIcon({ className }: { className?: string }) {
  // Empty circle with dash = "not applicable / not yet anchored" — third
  // distinct shape (circle vs shield), so all four states are shape-distinct.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component.
// ---------------------------------------------------------------------------

type Props = {
  chainSeq: number;
  /**
   * When true, the badge kicks off verification on mount. When false, it
   * waits (used together with IntersectionObserver in the parent row).
   */
  active: boolean;
  /**
   * When true, the tier-3 auditor detail panel starts expanded. Used by the
   * evidence drawer where the row is already fully open. Default false.
   */
  detailInitiallyOpen?: boolean;
};

type BadgeState =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "verified"; report: VerifyReport }
  | { kind: "tamper"; report: VerifyReport } // signature or Merkle failure
  | { kind: "not-anchored"; reason: string }
  | { kind: "error"; message: string };

export function AnchorVerifyBadge({
  chainSeq,
  active,
  detailInitiallyOpen = false,
}: Props) {
  const [state, setState] = useState<BadgeState>({ kind: "idle" });
  const [detailOpen, setDetailOpen] = useState(detailInitiallyOpen);

  useEffect(() => {
    if (!active) return;
    if (state.kind !== "idle") return;

    let cancelled = false;

    // Kick verify in an async IIFE so setState is not synchronous inside the
    // effect body (react-hooks/set-state-in-effect). The first tick still lands
    // "verifying" before the queue promise settles under normal timing.
    void (async () => {
      setState({ kind: "verifying" });
      const result: QueueResult = await getAnchorVerification(chainSeq);
      if (cancelled) return;
      if (result.status === "not-anchored") {
        setState({ kind: "not-anchored", reason: result.reason });
        return;
      }
      if (result.status === "error") {
        setState({ kind: "error", message: result.message });
        return;
      }
      // result.status === "ok"
      if (result.report.overallOk) {
        setState({ kind: "verified", report: result.report });
      } else {
        setState({ kind: "tamper", report: result.report });
      }
    })();

    return () => {
      cancelled = true;
    };
    // state.kind intentionally omitted from deps — we set it internally and
    // do NOT want to re-trigger verification when we transition idle→verifying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, chainSeq]);

  const presentation = useMemo(() => renderPresentation(state), [state]);

  // Only tamper failures use role="alert" (assertive interruption).
  const containerRole =
    state.kind === "tamper" || state.kind === "error" ? "alert" : "status";

  // Aria-busy on the verifying state so ATs don't announce a half-baked state.
  const ariaBusy = state.kind === "verifying" ? true : undefined;

  return (
    <div
      className="inline-flex flex-col items-start"
      // Container is a stable node; we mutate text INSIDE it rather than
      // unmounting/remounting per Block_9_2_UX_Research.md §Q2 guidance.
      role={containerRole}
      aria-busy={ariaBusy}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${presentation.pillClasses}`}
        title={presentation.tooltip}
      >
        <presentation.Icon className="h-3.5 w-3.5" />
        <span className="badge-text">{presentation.label}</span>
      </span>
      {presentation.canExpand ? (
        <button
          type="button"
          className="mt-1 text-[10px] font-mono text-[#A29E93] underline decoration-dotted underline-offset-2 hover:text-[#C9A961]"
          aria-expanded={detailOpen}
          aria-controls={`anchor-detail-${chainSeq}`}
          onClick={(e) => {
            e.stopPropagation(); // don't trigger the row's onOpen
            setDetailOpen((v) => !v);
          }}
        >
          {detailOpen ? "hide details" : "for auditors"}
        </button>
      ) : null}
      {detailOpen && presentation.detail ? (
        <div
          id={`anchor-detail-${chainSeq}`}
          className="mt-2 w-full max-w-lg rounded-md border border-[#C9A961]/30 bg-[#1A1A1C] p-3 text-[11px] text-[#A29E93]"
          // Detail panel is polite — expanding it shouldn't interrupt.
          role="region"
          aria-label={`Anchor verification details for event ${chainSeq}`}
        >
          {presentation.detail}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentation logic — one function per state, so a11y attributes, iconography,
// and copy are all obviously tied to the state that produces them.
// ---------------------------------------------------------------------------

type Presentation = {
  label: string;
  tooltip: string; // tier-2 plain-language claim (also read by screen readers via title)
  pillClasses: string;
  Icon: (p: { className?: string }) => JSX.Element;
  canExpand: boolean;
  detail?: JSX.Element;
};

function renderPresentation(state: BadgeState): Presentation {
  switch (state.kind) {
    case "idle":
      return {
        label: "not checked",
        tooltip: "Anchor verification has not yet been requested for this row.",
        pillClasses:
          "border-[#C9A961]/20 bg-transparent text-[#A29E93]",
        Icon: DashIcon,
        canExpand: false,
      };
    case "verifying":
      return {
        label: "verifying…",
        tooltip:
          "Verifying this record's cryptographic timestamp signature in your browser. This runs entirely on your device — the server is not consulted for the trust decision.",
        pillClasses:
          "border-[#C9A961]/40 bg-transparent text-[#C9A961]",
        Icon: ShieldSpinnerIcon,
        canExpand: false,
      };
    case "not-anchored":
      return {
        label: "not anchored",
        tooltip:
          "This event has not yet been included in a batch timestamp. New events are batched and anchored to public timestamp authorities on a recurring schedule.",
        pillClasses:
          "border-[#C9A961]/25 bg-transparent text-[#A29E93]",
        Icon: DashIcon,
        canExpand: false,
      };
    case "verified": {
      const genTime = state.report.tsrs[0]?.genTime ?? "unknown";
      return {
        label: "anchored",
        tooltip: `This record's digital fingerprint was signed by a public timestamp authority at ${formatGenTime(genTime)}. It has not been altered since. This proof was verified in your browser, not by the server.`,
        pillClasses:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        Icon: ShieldCheckIcon,
        canExpand: true,
        detail: <AuditorDetail report={state.report} />,
      };
    }
    case "tamper":
      return {
        label: "verification failed",
        tooltip:
          "The cryptographic proof for this record did NOT verify against the bundled trusted roots. Do not treat this record as authenticated. Details below.",
        pillClasses:
          "border-red-500/60 bg-red-500/15 text-red-300",
        Icon: ShieldBrokenIcon,
        canExpand: true,
        detail: <AuditorDetail report={state.report} />,
      };
    case "error":
      return {
        label: "check failed",
        tooltip: `Could not complete verification: ${state.message}`,
        pillClasses:
          "border-amber-500/50 bg-amber-500/10 text-amber-300",
        Icon: ShieldBrokenIcon,
        canExpand: false,
      };
  }
}

function formatGenTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Tier-3 detail panel — "for auditors."
// Shows narrow, primary claims only; NO editorial language.
// ---------------------------------------------------------------------------

function AuditorDetail({ report }: { report: VerifyReport }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[#C9A961]">
          Merkle inclusion
        </div>
        <div className="mt-1 font-mono text-[10px] leading-snug break-all">
          expected root: {report.merkle_expected_root_hex}
          <br />
          actual root:{"   "}{report.merkle_actual_root_hex}
          <br />
          match: {report.merkle_ok ? "YES" : "NO"}
        </div>
      </div>

      {report.tsrs.map((tsr, i) => (
        <div key={i} className="border-t border-[#C9A961]/15 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-[#C9A961]">
            TSA #{i + 1}: {tsr.tsa_name}
          </div>
          <dl className="mt-1 grid grid-cols-[8rem_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px] leading-snug break-all">
            <dt>URL</dt>
            <dd>{tsr.tsa_url}</dd>
            <dt>genTime</dt>
            <dd>{tsr.genTime}</dd>
            <dt>algorithm</dt>
            <dd>{tsr.algorithm ?? "—"}</dd>
            <dt>msg imprint</dt>
            <dd>{tsr.messageImprintMatches ? "matches" : "MISMATCH"}</dd>
            <dt>CMS signature</dt>
            <dd>{tsr.cmsSignatureOk ? "valid" : "INVALID"}</dd>
            <dt>chain to root</dt>
            <dd>{tsr.chainOk ? "walks to trusted root" : "does not reach trusted root"}</dd>
            <dt>trust pin</dt>
            <dd>
              {tsr.trustPinMatched
                ? `${tsr.trustPinFilename ?? "matched"}`
                : "NOT PINNED"}
            </dd>
            <dt>signer cert</dt>
            <dd>{tsr.signerCertFingerprintHex ?? "—"}</dd>
            <dt>EKU (RFC 3161 §2.3)</dt>
            <dd>{tsr.ekuOk ? "id-kp-timeStamping present" : "missing/wrong"}</dd>
            <dt>validity @ genTime</dt>
            <dd>
              {tsr.validityAsOfGenTime.overallOk
                ? "all certs valid at signing time"
                : "one or more certs not valid at signing time"}
            </dd>
          </dl>
          {tsr.cmsNotes.length > 0 ? (
            <details className="mt-1 text-[10px]">
              <summary className="cursor-pointer text-[#A29E93]">
                CMS verifier notes ({tsr.cmsNotes.length})
              </summary>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {tsr.cmsNotes.map((n, j) => (
                  <li key={j} className="break-all">{n}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ))}

      {report.notes.length > 0 ? (
        <div className="border-t border-[#C9A961]/15 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-[#C9A961]">
            Report notes
          </div>
          <ul className="mt-1 ml-4 list-disc font-mono text-[10px]">
            {report.notes.map((n, i) => (
              <li key={i} className="break-all">{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-[#C9A961]/15 pt-2">
        <div className="text-[10px] uppercase tracking-wide text-[#C9A961]">
          Verifier version
        </div>
        <div className="mt-1 font-mono text-[10px]">
          browser verifier {report.version} · overallOk={String(report.overallOk)}
        </div>
      </div>
    </div>
  );
}
