// D6.4a: Persist evidence rows atomically with the JE post-attempt.
// This is the ONLY sanctioned path for writing to je_line_evidence.
// Must be called inside the same transaction as the je_post_attempts insert.

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JeCompositionResult } from "./types";
import { validateJeComposition } from "./contract";

export interface PersistEvidenceArgs {
  db: SupabaseClient;
  attemptId: string;
  firmClientId: string;
  composition: JeCompositionResult;
}

export async function persistJeEvidence(args: PersistEvidenceArgs): Promise<string[]> {
  validateJeComposition(args.composition);

  const rows = args.composition.lines.map((line) => {
    const canonical = JSON.stringify({
      attemptId: args.attemptId,
      lineIndex: line.lineIndex,
      accountId: line.accountId,
      dr: line.drAmount,
      cr: line.crAmount,
      evidence: line.evidence,
    });
    const contentHash = createHash("sha256").update(canonical).digest("hex");
    return {
      attempt_id: args.attemptId,
      firm_client_id: args.firmClientId,
      line_index: line.lineIndex,
      evidence_type: line.evidence.evidenceType,
      source_type: line.evidence.sourceType,
      source_id: line.evidence.sourceId ?? null,
      source_key: line.evidence.sourceKey ?? {},
      source_amount: line.evidence.sourceAmount ?? null,
      source_date: line.evidence.sourceDate ?? null,
      evidence_summary: line.evidence.evidenceSummary,
      calculation_notes: line.evidence.calculationNotes ?? null,
      originating_rule_id: line.evidence.originatingRuleId ?? null,
      originating_fire_id: line.evidence.originatingFireId ?? null,
      content_hash: contentHash,
    };
  });

  const { data, error } = await args.db.from("je_line_evidence").insert(rows).select("evidence_id");
  if (error) throw error;
  return (data ?? []).map((r: { evidence_id: string }) => r.evidence_id);
}
