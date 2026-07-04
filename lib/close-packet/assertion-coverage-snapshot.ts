import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssertionCoverageStatement } from "@/lib/pre-close/assertion-coverage-statement-types";

export interface SnapshotArgs {
  supabase: SupabaseClient;
  closePacketId: string;
  closePeriodId: string;
  firmClientId: string;
  packetVersion: number;
  statement: AssertionCoverageStatement;
  capturedByUserId?: string | null;
}

export async function snapshotCoverageStatement(args: SnapshotArgs): Promise<{
  snapshot_id: string;
  content_sha256: string;
}> {
  const {
    supabase,
    closePacketId,
    closePeriodId,
    firmClientId,
    packetVersion,
    statement,
    capturedByUserId,
  } = args;

  const canonical = canonicalize(statement);
  const contentSha256 = createHash("sha256").update(canonical).digest("hex");

  const { data, error } = await supabase
    .from("assertion_coverage_statement_versions")
    .insert({
      close_packet_id: closePacketId,
      close_period_id: closePeriodId,
      firm_client_id: firmClientId,
      packet_version: packetVersion,
      content_json: statement,
      content_sha256: contentSha256,
      coverage_row_count: statement.summary.total_cells,
      gap_count: statement.summary.gap,
      tested_count: statement.summary.tested,
      partial_count: statement.summary.partial,
      not_applicable_count: statement.summary.not_applicable,
      isa_315_baseline_version: statement.isa_315_baseline_version,
      captured_by_user_id: capturedByUserId ?? null,
    })
    .select("snapshot_id, content_sha256")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("assertion_coverage_statement_versions")
        .select("snapshot_id, content_sha256")
        .eq("close_packet_id", closePacketId)
        .eq("packet_version", packetVersion)
        .single();
      if (existing) return existing;
    }
    throw new Error(`snapshotCoverageStatement failed: ${error.message}`);
  }

  return data;
}

export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(",")}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((v as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}
