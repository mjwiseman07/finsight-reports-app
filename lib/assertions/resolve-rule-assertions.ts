/**
 * D-Assertions Part 4 — Resolve assertion_id[] for a given rule_id from
 * rule_assertion_coverage. Deterministic (sorted output), cached per request
 * via a simple Map to avoid duplicate SELECTs when the same rule fires many
 * times in one orchestration pass.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const RESOLVER_CACHE = new WeakMap<SupabaseClient, Map<string, string[]>>();

/** Test-only: bust per-client resolver cache when mock DB resets between cases. */
export function clearResolverCache(supabase: SupabaseClient) {
  RESOLVER_CACHE.delete(supabase);
}

export async function resolveRuleAssertions(
  supabase: SupabaseClient,
  ruleId: string,
): Promise<string[]> {
  let byRule = RESOLVER_CACHE.get(supabase);
  if (!byRule) {
    byRule = new Map();
    RESOLVER_CACHE.set(supabase, byRule);
  }
  const cached = byRule.get(ruleId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("rule_assertion_coverage")
    .select("assertion_id")
    .eq("rule_id", ruleId);

  if (error) {
    byRule.set(ruleId, []);
    return [];
  }

  const ids = Array.from(new Set((data ?? []).map((r) => r.assertion_id as string))).sort();
  byRule.set(ruleId, ids);
  return ids;
}

/**
 * Resolve assertions for a curated_rule_fires row when only the fire_id is known.
 * Used by the JE poster fallback path (source_type='rule', assertions_addressed unspecified).
 */
export async function resolveFireAssertions(
  supabase: SupabaseClient,
  fireId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("curated_rule_fires")
    .select("rule_id")
    .eq("fire_id", fireId)
    .maybeSingle();

  if (error || !data) return [];
  return resolveRuleAssertions(supabase, data.rule_id as string);
}
