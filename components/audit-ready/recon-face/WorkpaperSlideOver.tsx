"use client";

import { useEffect, useState } from "react";
import { ReconFace } from "./ReconFace";
import { focusRing, headingFont } from "@/components/site-ui";

export type WorkpaperSlideOverProps = {
  runId: string | null;
  initialTabName?: string;
  onClose: () => void;
  onRegenerated?: (newRunId: string) => void;
};

export function WorkpaperSlideOver({
  runId,
  initialTabName,
  onClose,
  onRegenerated,
}: WorkpaperSlideOverProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!runId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [runId, onClose]);

  if (!runId) return null;

  async function handleRegenerate() {
    if (!runId || isRegenerating) return;
    if (
      !confirm(
        "Regenerate this workpaper from live QuickBooks data? A new run will be created.",
      )
    ) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await fetch(
        `/api/audit-ready/runs/${encodeURIComponent(runId)}/regenerate`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        new_run_id?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `regenerate_failed_${res.status}`);
      }
      if (!body.new_run_id) {
        throw new Error("missing_new_run_id");
      }
      onRegenerated?.(body.new_run_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Regenerate failed";
      window.alert(msg);
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#111112]/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-testid="workpaper-slide-over-backdrop"
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col bg-[#111112] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workpaper-slide-over-title"
        data-testid="workpaper-slide-over"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#C9A961]/30 bg-[#111112] px-6 py-4">
          <h2
            id="workpaper-slide-over-title"
            className={`${headingFont} text-xl font-semibold text-[#ECEBE7]`}
          >
            Workpaper
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className={`rounded border border-[#C9A961] bg-[#C9A961] px-3 py-1.5 text-sm font-medium text-[#111112] hover:bg-[#DFC084] disabled:opacity-60 ${focusRing()}`}
              data-testid="workpaper-regenerate"
            >
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 ${focusRing()}`}
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <ReconFace
            runId={runId}
            variant="page"
            initialTabName={initialTabName}
          />
        </div>
      </div>
    </div>
  );
}
