import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

/**
 * The face of a recon — tie-out proof shown at the top of every workpaper.
 * If a subledger exists, left = subledger; if not, left = prepared schedule.
 * Right is always the GL.
 */
/**
 * two_sided = subledger/schedule ↔ GL with variance + badge.
 * report_only = single-sided (GRNI): no GL right side, no variance.
 */
export type ReconFaceMode = "two_sided" | "report_only";

export interface ReconFaceSpec {
  /** Defaults to "two_sided" when omitted (Block A/B emitters unaffected). */
  mode?: ReconFaceMode;
  leftLabel: string;
  leftAmountCents: number;
  /** Nullable for report_only faces. */
  rightLabel: string | null;
  rightAmountCents: number | null;
  varianceCents: number | null;
  toleranceCents: number;
  /** report_only faces always set "ties". */
  tieStatus: "ties" | "kickout";
  /**
   * Sections of the face — each corresponds to one Backup tab in the XLSX.
   */
  sections: Array<{
    label: string;
    amountCents: number;
    backupTabName: string;
  }>;
  engagementName: string;
  engagementId: string;
  periodEnd: string;
  tieOutKind: TieOutKind;
  runId: string;
  generatedAt: string;
  /** Set when this run was created via regenerate (Block E). */
  regeneratedFromRunId?: string | null;
  /** completed_at (or started_at) of the parent run, when regenerated. */
  regeneratedAt?: string | null;
}

/**
 * A single Backup tab — one row per transaction/asset/item.
 */
export interface BackupTabSpec {
  tabName: string;
  columns: Array<{
    key: string;
    label: string;
    format?: "currency" | "date" | "text" | "number";
  }>;
  rows: Array<Record<string, string | number | null>>;
  subtotalRow?: Record<string, string | number | null>;
}

/**
 * Full workpaper payload — passed to the XLSX and PDF emitters.
 */
export interface WorkpaperPayload {
  face: ReconFaceSpec;
  backupTabs: BackupTabSpec[];
  sourceData: {
    qboRealmId: string;
    qboConnectionId: string;
    apiResponseJson: unknown;
    fetchedAt: string;
  };
}

/**
 * Every kind resolver must eventually implement this contract.
 * Block A defines it; Block B/C implement it per kind.
 */
export interface WorkpaperEmitter {
  readonly kind: TieOutKind;
  build(runId: string): Promise<WorkpaperPayload>;
  emitXlsx(payload: WorkpaperPayload): Promise<Buffer>;
  emitPdf(payload: WorkpaperPayload): Promise<Buffer>;
}
