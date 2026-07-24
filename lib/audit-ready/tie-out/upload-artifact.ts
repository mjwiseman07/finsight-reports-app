import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

const ARTIFACT_BUCKET = "audit-ready-workpapers";

export type UploadedArtifact = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  file_size_bytes: number;
  content_hash: string;
};

export async function uploadRunArtifact(params: {
  runId: string;
  engagementId: string;
  artifactKind: "xlsx" | "pdf";
  fileBytes: Buffer;
  generatedBy: string | null;
}): Promise<UploadedArtifact> {
  const { runId, engagementId, artifactKind, fileBytes, generatedBy } = params;
  const supabase = getSupabaseAdmin();
  const hash = createHash("sha256").update(fileBytes).digest("hex");
  const extension = artifactKind === "xlsx" ? "xlsx" : "pdf";
  const storagePath = `${engagementId}/${runId}/${artifactKind}-${hash.slice(0, 8)}.${extension}`;

  const { error: uploadErr } = await supabase.storage
    .from(ARTIFACT_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType:
        artifactKind === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
      upsert: false,
    });
  if (uploadErr) {
    throw new Error(`Artifact upload failed: ${uploadErr.message}`);
  }

  const { data: row, error: insertErr } = await supabase
    .from("audit_ready_run_artifacts")
    .insert({
      tie_out_run_id: runId,
      artifact_kind: artifactKind,
      storage_bucket: ARTIFACT_BUCKET,
      storage_path: storagePath,
      file_size_bytes: fileBytes.length,
      content_hash: hash,
      generated_by: generatedBy,
    })
    .select("id, storage_bucket, storage_path, file_size_bytes, content_hash")
    .single();

  if (insertErr) {
    throw new Error(`Artifact row insert failed: ${insertErr.message}`);
  }
  return row as UploadedArtifact;
}

export async function getSignedArtifactUrl(params: {
  storagePath: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { storagePath, expiresInSeconds = 3600 } = params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(ARTIFACT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
