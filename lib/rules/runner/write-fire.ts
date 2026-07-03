import type { SupabaseClient } from "@supabase/supabase-js";
import type { FireInsert } from "./types";

export async function writeFire(
  supabase: SupabaseClient,
  fire: FireInsert,
): Promise<{ inserted: boolean; fire_id: string | null }> {
  const { data, error } = await supabase
    .from("curated_rule_fires")
    .insert(fire)
    .select("fire_id")
    .maybeSingle();
  if (error) {
    // 23505 = unique_violation -> dedup hit (curated_rule_fires_dedup_idx),
    // treat as no-op: the same (client, rule, target, inputs) already fired.
    if ((error as { code?: string }).code === "23505") {
      return { inserted: false, fire_id: null };
    }
    throw error;
  }
  return { inserted: true, fire_id: data?.fire_id ?? null };
}
