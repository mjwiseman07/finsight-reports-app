import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.CLOSE_PACKETS_BUCKET || "close-packets";

/**
 * Upload PDF bytes for a packet. Returns the storage object path.
 */
export async function uploadPacketPdf({ packetId, closePeriodId, pdfBuffer }) {
  const supabase = getSupabaseAdmin();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const objectPath = `packets/${closePeriodId}/${packetId}/${stamp}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, pdfBuffer, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return objectPath;
}

/**
 * Get a signed URL for an object path. Default 5-minute TTL — enough for the
 * browser to fetch and render, short enough that leaked URLs die fast.
 */
export async function signedUrlFor(objectPath, ttlSeconds = 300) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPath, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}
