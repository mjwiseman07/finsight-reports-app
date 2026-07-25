"use client";

import { useEffect } from "react";
import { ReconFace } from "./ReconFace";
import { focusRing, headingFont } from "@/components/site-ui";

export type WorkpaperSlideOverProps = {
  runId: string | null;
  initialTabName?: string;
  onClose: () => void;
};

export function WorkpaperSlideOver({
  runId,
  initialTabName,
  onClose,
}: WorkpaperSlideOverProps) {
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
          <button
            type="button"
            onClick={onClose}
            className={`rounded border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 ${focusRing()}`}
          >
            Close
          </button>
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
