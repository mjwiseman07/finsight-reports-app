import { createServiceClient } from "@/lib/supabase/service";
import type {
  AssertionRow,
  AssertionRelevanceRow,
  RuleAssertionCoverageRow,
} from "@/lib/pre-close/assertions-types";

export async function listAssertions(): Promise<AssertionRow[]> {
  const db = createServiceClient();
  const { data, error } = await db.from("assertions_catalog").select("*").order("assertion_id");
  if (error) throw error;
  return (data ?? []) as AssertionRow[];
}

export async function listRelevanceMatrix(): Promise<AssertionRelevanceRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("assertion_relevance_matrix")
    .select("*")
    .order("account_category")
    .order("assertion_id");
  if (error) throw error;
  return (data ?? []) as AssertionRelevanceRow[];
}

export async function listRuleCoverage(ruleId?: string): Promise<RuleAssertionCoverageRow[]> {
  const db = createServiceClient();
  let query = db.from("rule_assertion_coverage").select("*").order("rule_id").order("assertion_id");
  if (ruleId) query = query.eq("rule_id", ruleId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RuleAssertionCoverageRow[];
}

/** Cross-walk: given a rule's coverage rows, what's the union of assertions covered? */
export function unionAssertions(rows: RuleAssertionCoverageRow[]): Set<string> {
  return new Set(rows.map((r) => r.assertion_id));
}
