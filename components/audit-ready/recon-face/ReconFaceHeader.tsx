"use client";

import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { formatIsoDate } from "@/lib/audit-ready/tie-out/emitters/_shared/format";
import { headingFont } from "@/components/site-ui";

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ReconFaceHeader({
  face,
  compact = false,
}: {
  face: ReconFaceSpec;
  compact?: boolean;
}) {
  const isTies = face.tieStatus === "ties";
  const isReport = face.mode === "report_only";
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className={`${headingFont} ${compact ? "text-sm" : "text-lg"} font-semibold text-[#ECEBE7]`}
          >
            {face.engagementName}
          </h3>
          <p className="text-xs text-[#A29E93]">
            Period end{" "}
            <span className="tabular-nums text-[#ECEBE7]">{face.periodEnd}</span>
            {" · "}
            <span className="font-mono text-[#7A7974]">{face.tieOutKind}</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isReport
              ? "bg-[#C9A961]/20 text-[#C9A961]"
              : isTies
                ? "bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-red-950/50 text-red-300 ring-1 ring-red-500/30"
          }`}
        >
          {isReport ? "REPORT" : isTies ? "TIES" : "KICKOUT"}
        </span>
      </div>
      {!compact && (
        <p className="text-xs tabular-nums text-[#7A7974]">
          Variance tolerance: {formatCents(face.toleranceCents)}
        </p>
      )}
      {face.regeneratedFromRunId ? (
        <p className="text-xs text-[#C9A961]">
          Regenerated from Run {face.regeneratedFromRunId.slice(0, 8)}
          {face.regeneratedAt
            ? ` on ${formatIsoDate(face.regeneratedAt)}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
