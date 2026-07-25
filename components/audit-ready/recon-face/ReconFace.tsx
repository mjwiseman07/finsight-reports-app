"use client";

import { ReconFaceHeader } from "./ReconFaceHeader";
import { ReconFaceBody } from "./ReconFaceBody";
import { ReconFaceBackupTabs } from "./ReconFaceBackupTabs";
import { ReconFaceSourceData } from "./ReconFaceSourceData";
import { ReconFaceDownloads } from "./ReconFaceDownloads";
import { ReconFaceSkeleton, ReconFaceError } from "./ReconFaceStates";
import { useWorkpaper } from "./hooks/useWorkpaper";
import { focusRing } from "@/components/site-ui";

export type ReconFaceProps = {
  runId: string;
  variant: "inline" | "modal" | "page";
  /** Which backup tab to open first (e.g. account name from a BS summary line kickout). */
  initialTabName?: string;
  /** Inline variant: open the full slide-over. */
  onOpenFull?: () => void;
};

export function ReconFace({
  runId,
  variant,
  initialTabName,
  onOpenFull,
}: ReconFaceProps) {
  const { data, error, isLoading } = useWorkpaper(runId);

  if (isLoading) return <ReconFaceSkeleton variant={variant} />;
  if (error) return <ReconFaceError error={error} runId={runId} variant={variant} />;
  if (!data) return null;

  const { payload, downloads } = data;

  if (variant === "inline") {
    return (
      <div
        className="border-l-2 border-[#C9A961] pl-4"
        data-testid="recon-face-inline"
      >
        <ReconFaceHeader face={payload.face} compact />
        <div className="mt-3">
          <ReconFaceBody face={payload.face} compact />
        </div>
        <div className="mt-3">
          <ReconFaceBackupTabs
            tabs={payload.backupTabs.slice(0, 1)}
            initialTabName={
              initialTabName ?? payload.backupTabs[0]?.tabName ?? null
            }
            maxRowsPerTab={10}
          />
        </div>
        {onOpenFull && (
          <button
            type="button"
            className={`mt-3 text-xs font-medium text-[#C9A961] hover:text-[#DFC084] ${focusRing()}`}
            onClick={onOpenFull}
          >
            Open full workpaper →
          </button>
        )}
      </div>
    );
  }

  if (variant === "modal") {
    // Reserved for future modal use; not wired in Block D.
    return null;
  }

  // variant === "page"
  return (
    <div
      className="flex flex-col gap-6 bg-[#111112] text-[#ECEBE7]"
      data-testid="recon-face-page"
    >
      <ReconFaceHeader face={payload.face} />
      <ReconFaceDownloads downloads={downloads} />
      <ReconFaceBody face={payload.face} />
      <ReconFaceBackupTabs
        tabs={payload.backupTabs}
        initialTabName={
          initialTabName ?? payload.backupTabs[0]?.tabName ?? null
        }
      />
      <ReconFaceSourceData sourceData={payload.sourceData} />
    </div>
  );
}
