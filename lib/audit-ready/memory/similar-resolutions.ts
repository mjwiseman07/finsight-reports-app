import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const RESOLUTION_CODES = [
  "immaterial",
  "timing",
  "reclass",
  "true_error",
  "other",
] as const;

export type ResolutionCode = (typeof RESOLUTION_CODES)[number];

export type SimilarResolution = {
  investigationId: string;
  investigatedAt: string;
  investigatedBy: string;
  note: string;
  resolutionCode: ResolutionCode | null;
  resolutionStatus: "resolved";
  matchKey: string;
};

export type SimilarSourceKey =
  | { source_type: "bs_summary_line"; qbo_account_id: string }
  | { source_type: "pbc_run"; tie_out_kind: string };

type SimilarResolutionRpcRow = {
  investigation_id: string;
  investigated_at: string;
  investigated_by: string;
  note: string;
  resolution_code: ResolutionCode | null;
  resolution_status: "resolved";
  match_key: string;
};

export async function getSimilarKickoutResolutions(
  engagementId: string,
  key: SimilarSourceKey,
): Promise<SimilarResolution[]> {
  const admin = getSupabaseAdmin();
  const sourceKey =
    key.source_type === "bs_summary_line"
      ? { qbo_account_id: key.qbo_account_id }
      : { tie_out_kind: key.tie_out_kind };

  const { data, error } = await admin.rpc(
    "get_similar_kickout_resolutions",
    {
      p_engagement_id: engagementId,
      p_source_type: key.source_type,
      p_source_key: sourceKey,
    },
  );
  if (error) throw error;

  return ((data ?? []) as SimilarResolutionRpcRow[]).map((row) => ({
    investigationId: row.investigation_id,
    investigatedAt: row.investigated_at,
    investigatedBy: row.investigated_by,
    note: row.note,
    resolutionCode: row.resolution_code,
    resolutionStatus: row.resolution_status,
    matchKey: row.match_key,
  }));
}
