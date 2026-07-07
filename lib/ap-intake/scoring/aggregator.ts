import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import type {
  AggregatedContribution,
  AggregatedScore,
  ContributingSignal,
  ScoreLayer,
  ScoreSeverity,
} from "./schema";

const QUARANTINE_THRESHOLD = 0.9;

const CONTRIBUTION_TABLE: Record<ScoreLayer, Partial<Record<ScoreSeverity, number>>> = {
  L3: { HIGH: 0.6, MEDIUM: 0.3 },
  L4: { HIGH: 0.3, MEDIUM: 0.15 },
  L5: { HIGH: 0.5, MEDIUM: 0.2 },
  L6: { HIGH: 0.35, MEDIUM: 0.15 },
};

function contributionFor(layer: ScoreLayer, severity: ScoreSeverity): number {
  return CONTRIBUTION_TABLE[layer]?.[severity] ?? 0;
}

export async function aggregateFraudScore(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  billId: string;
  signals: ContributingSignal[];
}): Promise<AggregatedScore> {
  const contributions: AggregatedContribution[] = args.signals.map((s) => ({
    ...s,
    contribution: contributionFor(s.layer, s.severity),
  }));

  const rawSum = contributions.reduce((sum, c) => sum + c.contribution, 0);
  const score = Math.min(1, Number(rawSum.toFixed(3)));
  const quarantine_recommended = score >= QUARANTINE_THRESHOLD;

  // Upsert one row per (bill_id, layer, signal_code). Preserve disposition on conflict.
  if (contributions.length > 0) {
    const rows = contributions.map((c) => ({
      firm_id: args.firmId,
      firm_client_id: args.firmClientId,
      bill_id: args.billId,
      layer: c.layer,
      signal_code: c.code,
      severity: c.severity,
      contribution: c.contribution,
      evidence: c.evidence,
      aggregated_score_snapshot: score,
    }));
    await args.supabase.from("fraud_score_signals").upsert(rows, {
      onConflict: "bill_id,layer,signal_code",
      ignoreDuplicates: true,
    });
  }

  // Update the bill's aggregated fraud score
  await args.supabase
    .from("ap_intake_bills")
    .update({ fraud_score_current: score })
    .eq("id", args.billId);

  // Emit fraud_score_updated event
  await publishEvent(
    {
      eventType: "bill.fraud_score_updated",
      eventCategory: "ap",
      firmId: args.firmId,
      firmClientId: args.firmClientId,
      aggregateType: "ap_intake_bill",
      aggregateId: args.billId,
      actorType: "system",
      payload: {
        bill_id: args.billId,
        score,
        contributions,
      },
    },
    args.supabase,
  );

  if (quarantine_recommended) {
    await publishEvent(
      {
        eventType: "bill.fraud_score_quarantine",
        eventCategory: "ap",
        firmId: args.firmId,
        firmClientId: args.firmClientId,
        aggregateType: "ap_intake_bill",
        aggregateId: args.billId,
        actorType: "system",
        payload: {
          bill_id: args.billId,
          score,
          threshold: QUARANTINE_THRESHOLD,
        },
      },
      args.supabase,
    );
  }

  return {
    bill_id: args.billId,
    score,
    contributions,
    quarantine_recommended,
  };
}
