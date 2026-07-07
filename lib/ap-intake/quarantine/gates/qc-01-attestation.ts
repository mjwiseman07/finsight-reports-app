/**
 * Phase D6.5 Part 2 — Block 3
 * qc-01: Attestation Gate.
 * Pass if attestation is ≥20 chars AND contains a reference to at least one
 * originating quarantine signal code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Qc01Context {
  supabase: SupabaseClient;
  quarantineId: string;
  attestationText: string;
}

export interface Qc01Result {
  gate_id: "qc-01";
  pass: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

const MIN_LEN = 20;

export async function evaluateQc01(ctx: Qc01Context): Promise<Qc01Result> {
  const text = (ctx.attestationText ?? "").trim();

  if (text.length < MIN_LEN) {
    return {
      gate_id: "qc-01",
      pass: false,
      reason: "attestation_too_short",
      evidence: { length: text.length, min: MIN_LEN },
    };
  }

  const { data: q } = await ctx.supabase
    .from("ap_intake_quarantine")
    .select("originating_signals")
    .eq("id", ctx.quarantineId)
    .maybeSingle();

  const signals = (q?.originating_signals ?? []) as Array<{ code: string }>;
  const signalCodes = signals.map((s) => s.code).filter((c): c is string => Boolean(c));
  const lowered = text.toLowerCase();
  const referencedSignals = signalCodes.filter((code) => lowered.includes(code.toLowerCase()));

  if (referencedSignals.length === 0) {
    return {
      gate_id: "qc-01",
      pass: false,
      reason: "attestation_missing_signal_reference",
      evidence: {
        length: text.length,
        expected_signals: signalCodes,
        referenced_signals: [],
      },
    };
  }

  return {
    gate_id: "qc-01",
    pass: true,
    reason: "attestation_valid",
    evidence: {
      length: text.length,
      expected_signals: signalCodes,
      referenced_signals: referencedSignals,
    },
  };
}
