"use client";

import { focusRing } from "@/components/site-ui";
import type { WorkpaperDownloads } from "./hooks/useWorkpaper";

export function ReconFaceDownloads({
  downloads,
}: {
  downloads: WorkpaperDownloads;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <DownloadButton
        label="Download XLSX"
        href={downloads.xlsx}
        missingTitle="Not yet available"
      />
      <DownloadButton
        label="Download PDF"
        href={downloads.pdf}
        missingTitle="Not yet available"
      />
    </div>
  );
}

function DownloadButton({
  label,
  href,
  missingTitle,
}: {
  label: string;
  href: string | null;
  missingTitle: string;
}) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        title={missingTitle}
        className="cursor-not-allowed rounded border border-[#C9A961]/20 bg-[#1A1A1C] px-3 py-1.5 text-xs font-medium text-[#7A7974] opacity-60"
      >
        {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded border border-[#C9A961]/40 bg-[#C9A961]/15 px-3 py-1.5 text-xs font-medium text-[#C9A961] hover:bg-[#C9A961]/25 ${focusRing()}`}
    >
      {label}
    </a>
  );
}
