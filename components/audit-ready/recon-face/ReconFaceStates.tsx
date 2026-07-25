"use client";

import type { WorkpaperError } from "./hooks/useWorkpaper";
import { headingFont } from "@/components/site-ui";

export function ReconFaceSkeleton({
  variant,
}: {
  variant: "inline" | "modal" | "page";
}) {
  const pad = variant === "inline" ? "py-3" : "py-8";
  return (
    <div
      className={`${pad} animate-pulse space-y-3`}
      data-testid="recon-face-skeleton"
    >
      <div className="h-4 w-1/3 rounded bg-[#1A1A1C]" />
      <div className="h-20 rounded bg-[#1A1A1C]/80" />
      <div className="h-10 rounded bg-[#1A1A1C]/60" />
    </div>
  );
}

export function ReconFaceError({
  error,
  runId,
  variant,
}: {
  error: WorkpaperError;
  runId: string;
  variant: "inline" | "modal" | "page";
}) {
  return (
    <div
      className={`rounded-lg border border-red-500/30 bg-red-950/30 ${variant === "inline" ? "p-3" : "p-4"}`}
      role="alert"
      data-testid="recon-face-error"
    >
      <p className={`${headingFont} text-sm font-semibold text-red-200`}>
        {error.message}
      </p>
      <p className="mt-1 text-xs text-[#7A7974]">
        Run {runId.slice(0, 8)}
        {error.kind ? ` · kind ${error.kind}` : ""}
        {error.status ? ` · HTTP ${error.status}` : ""}
      </p>
    </div>
  );
}
