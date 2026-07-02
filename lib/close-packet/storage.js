import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createHash } from "crypto";

const BUCKET = process.env.CLOSE_PACKETS_BUCKET || "close-packets";

/**
 * Upload PDF bytes to Supabase storage and return { path, sha256, signedUrl }.
 * Path format: {closePeriodId}/v{version}.pdf
 */
export async function uploadPacketPdf({ closePeriodId, version, pdfBytes }) {
  const supabase = getSupabaseAdmin();
  const path = `${closePeriodId}/v${version}.pdf`;
  const sha256 = createHash("sha256").update(pdfBytes).digest("hex");

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (urlError) throw new Error(`Signed URL failed: ${urlError.message}`);

  return { path, sha256, signedUrl: urlData.signedUrl };
}

export async function getPacketPdfSignedUrl(path, expiresInSeconds = 60 * 60) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
