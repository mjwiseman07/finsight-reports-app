import { supabaseAdmin } from "../supabase";

export async function persistRecentIntuitTid(args: {
  userId: string;
  realmId: string;
  intuit_tid: string;
  endpoint?: string | null;
  status_code?: number | null;
}): Promise<void> {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("qbo_recent_intuit_tid")
    .upsert(
      {
        user_id: args.userId,
        realm_id: args.realmId,
        intuit_tid: args.intuit_tid,
        endpoint: args.endpoint ?? null,
        status_code: args.status_code ?? null,
        captured_at: new Date().toISOString(),
      },
      { onConflict: "user_id,realm_id" },
    );
  if (error) {
    console.warn("[recent-intuit-tid] upsert failed", { error: error.message });
  }
}

export async function getRecentIntuitTidForUser(userId: string): Promise<{
  realm_id: string;
  intuit_tid: string;
  endpoint: string | null;
  status_code: number | null;
  captured_at: string;
} | null> {
  if (!supabaseAdmin) return null;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("qbo_recent_intuit_tid")
    .select("realm_id, intuit_tid, endpoint, status_code, captured_at")
    .eq("user_id", userId)
    .gte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[recent-intuit-tid] lookup failed", { error: error.message });
    return null;
  }
  return data;
}
