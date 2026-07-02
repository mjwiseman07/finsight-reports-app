import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_TTL_DAYS = 7;

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Create a share token for a packet. Returns the raw token (show once) and DB id.
 */
export async function createShareToken({
  packetId,
  createdByUserId,
  label = null,
  ttlDays = DEFAULT_TTL_DAYS,
}) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlDays * 86400_000).toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_packet_share_tokens")
    .insert({
      packet_id: packetId,
      token_hash: tokenHash,
      created_by_user_id: createdByUserId,
      expires_at: expiresAt,
      label,
    })
    .select("id, expires_at")
    .single();
  if (error) throw error;
  return { rawToken, tokenId: data.id, expiresAt: data.expires_at };
}

/**
 * Verify a raw token. Returns { valid, packetId, tokenId, reason? }.
 * Does NOT record access — caller must call recordShareAccess separately.
 */
export async function verifyShareToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false, reason: "missing_token" };
  }
  const tokenHash = hashToken(rawToken);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_packet_share_tokens")
    .select("id, packet_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return { valid: false, reason: "not_found" };
  if (data.revoked_at) return { valid: false, reason: "revoked" };
  if (new Date(data.expires_at) < new Date()) return { valid: false, reason: "expired" };
  return { valid: true, packetId: data.packet_id, tokenId: data.id };
}

export async function recordShareAccess(tokenId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("increment_share_token_access", { p_token_id: tokenId });
  if (!error) return;
  // Fallback if the RPC is not defined: two-step read + update.
  const { data: current } = await supabase
    .from("close_packet_share_tokens")
    .select("access_count")
    .eq("id", tokenId)
    .single();
  const nextCount = (current?.access_count ?? 0) + 1;
  await supabase
    .from("close_packet_share_tokens")
    .update({ last_accessed_at: new Date().toISOString(), access_count: nextCount })
    .eq("id", tokenId);
}

export async function revokeShareToken({ tokenId, packetId }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("close_packet_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("packet_id", packetId);
  if (error) throw error;
}
