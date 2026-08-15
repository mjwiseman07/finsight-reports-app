"use client";

import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const REPORT_NOTE =
  "Report-only view — no GL comparison. Kickouts flagged from data quality signals.";

export function ReconFaceBody({
  face,
  compact = false,
}: {
  face: ReconFaceSpec;
  compact?: boolean;
}) {
  const isReportOnly = face.mode === "report_only";

  if (isReportOnly) {
    return (
      <div
        className={`rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50 ${compact ? "p-3" : "p-4"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#A29E93]">Per {face.leftLabel}</span>
          <span className="text-sm font-semibold tabular-nums text-[#ECEBE7]">
            {formatCents(face.leftAmountCents)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex rounded-full bg-[#C9A961]/20 px-2 py-0.5 text-xs font-medium text-[#C9A961]">
            Basis: REPORT
          </span>
        </div>
        <p className="mt-2 text-xs text-[#7A7974]">{REPORT_NOTE}</p>
      </div>
    );
  }

  const isTies = face.tieStatus === "ties";
  const hasUrm =
    face.reconOutcome != null || face.unidentifiedResidualCents != null;

  return (
    <div
      className={`rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#A29E93]">Per {face.leftLabel}</span>
          <span className="text-sm tabular-nums text-[#ECEBE7]">
            {formatCents(face.leftAmountCents)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#A29E93]">
            Per {face.rightLabel ?? "General Ledger"}
          </span>
          <span className="text-sm tabular-nums text-[#ECEBE7]">
            {formatCents(face.rightAmountCents)}
          </span>
        </div>
        <div className="border-t border-[#C9A961]/20 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-[#ECEBE7]">
              Variance
            </span>
            <span className="text-sm font-semibold tabular-nums text-[#ECEBE7]">
              {formatCents(face.varianceCents)}
            </span>
          </div>
        </div>
        {hasUrm ? (
          <div className="space-y-1 border-t border-[#C9A961]/20 pt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#A29E93]">Identified items</span>
              <span className="text-sm tabular-nums text-[#ECEBE7]">
                {formatCents(face.identifiedItemsTotalCents ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#A29E93]">
                Unidentified residual
              </span>
              <span className="text-sm tabular-nums text-[#ECEBE7]">
                {formatCents(face.unidentifiedResidualCents ?? 0)}
              </span>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isTies
                ? "bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-red-950/50 text-red-300 ring-1 ring-red-500/30"
            }`}
          >
            {isTies ? "TIES" : "KICKOUT"}
          </span>
          {face.reconOutcome ? (
            <span className="inline-flex rounded-full bg-[#C9A961]/20 px-2.5 py-0.5 text-xs font-medium text-[#C9A961]">
              {face.reconOutcome}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
