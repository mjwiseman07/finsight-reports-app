import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const TOKEN_TTL_HOURS = 24;

export async function issuePurgeToken(firm_id: string, user_id: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const supabase = createServiceClient();
  const { error } = await supabase.from("gap2_purge_tokens").insert({
    token_hash: hash,
    firm_id,
    requested_by_user_id: user_id,
    expires_at: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString(),
  });
  if (error) throw error;
  return raw;
}

export async function verifyAndConsumePurgeToken(
  raw: string,
): Promise<{ firm_id: string; user_id: string } | null> {
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("gap2_purge_tokens")
    .select("firm_id, requested_by_user_id, expires_at, consumed_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at as string) < new Date()) return null;

  await supabase
    .from("gap2_purge_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("token_hash", hash)
    .is("consumed_at", null);

  return {
    firm_id: data.firm_id as string,
    user_id: data.requested_by_user_id as string,
  };
}
