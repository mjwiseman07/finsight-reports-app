/**
 * Phase D6.5 Part 2 — Block 4: Strategy S1 — exact content hash within 90 days.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateMatch } from "@/lib/ap-intake/duplicate/schema";

export async function runS1ContentHash(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  billId: string;
  contentHash: string | null;
}): Promise<DuplicateMatch[]> {
  if (!args.contentHash) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const { data, error } = await args.supabase
    .from("ap_intake_bills")
    .select("id, created_at")
    .eq("firm_client_id", args.firmClientId)
    .eq("resolved_vendor_id", args.vendorId)
    .eq("content_hash_sha256", args.contentHash)
    .neq("id", args.billId)
    .gte("created_at", cutoff.toISOString());

  if (error) throw error;

  const rows = data ?? [];
  return rows.map((r) => ({
    matched_bill_id: r.id as string,
    strategy_id: "S1_exact_content_hash" as const,
    confidence: 1.0,
    severity: "HIGH" as const,
    evidence: {
      content_hash: args.contentHash,
      matched_bill_created_at: r.created_at,
      window_days: 90,
    },
  }));
}
