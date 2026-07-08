import { createServiceClient } from "@/lib/supabase/service";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { publishEvent } from "@/lib/events/publisher";

const ADDON_SELFGOV = "ap_adaptive_governance" as const;
const PILOT_SELFGOV = "ap_adaptive_governance" as const;

export type SourceLayer = "L5" | "L6" | "L7" | "L8" | "L9" | "L11";
export type ObservationType =
  | "reviewer_approved"
  | "reviewer_rejected"
  | "override_applied"
  | "false_positive_dismissed"
  | "false_negative_discovered"
  | "config_adjusted";

interface GateInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  caller: string;
  actorUserId?: string;
  actorType?: "user" | "system";
}

async function gate(input: GateInput): Promise<void> {
  await assertEntitlement(ADDON_SELFGOV, input.engagementId, {
    caller: input.caller,
    firmClientId: input.firmClientId,
    actorType: input.actorType ?? "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature(PILOT_SELFGOV, input.firmId);
}

async function emitSelfgovEvent(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  eventType:
    | "ap_selfgov.observation_recorded"
    | "ap_selfgov.amendment_drafted"
    | "ap_selfgov.amendment_applied"
    | "ap_selfgov.amendment_rejected";
  aggregateType: "observation_event" | "drafted_amendment";
  aggregateId: string;
  payload: Record<string, unknown>;
  actorUserId?: string;
}): Promise<void> {
  await publishEvent({
    eventType: input.eventType,
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorType: input.actorUserId ? "user" : "system",
    actorId: input.actorUserId,
    payload: input.payload,
  });
}

export async function recordObservation(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  sourceLayer: SourceLayer;
  observationType: ObservationType;
  targetSetting: string;
  observedValue: Record<string, unknown>;
  actorUserId?: string;
  contextSummary?: Record<string, unknown>;
  causingEventId?: string;
}): Promise<{ observation_event_id: string }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "selfgov.recordObservation",
    actorUserId: input.actorUserId,
    actorType: input.actorUserId ? "user" : "system",
  });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("observation_events")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      source_layer: input.sourceLayer,
      observation_type: input.observationType,
      target_setting: input.targetSetting,
      observed_value: input.observedValue,
      actor_user_id: input.actorUserId ?? null,
      context_summary: input.contextSummary ?? {},
      causing_event_id: input.causingEventId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("observation_insert_failed");
  await emitSelfgovEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_selfgov.observation_recorded",
    aggregateType: "observation_event",
    aggregateId: data.id as string,
    payload: {
      source_layer: input.sourceLayer,
      observation_type: input.observationType,
      target_setting: input.targetSetting,
    },
    actorUserId: input.actorUserId,
  });
  return { observation_event_id: data.id as string };
}

export const MIN_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_PENDING_DRAFTS_PER_FIRM = 3;

export interface ObservationSample {
  id: string;
  source_layer: SourceLayer;
  observation_type: ObservationType;
  target_setting: string;
  observed_value: Record<string, unknown>;
}

export interface SynthesizedDraft {
  target_setting: string;
  current_value: Record<string, unknown>;
  proposed_value: Record<string, unknown>;
  confidence_score: number;
  reason_codes: string[];
  evidence_summary: Record<string, unknown>;
  causing_observation_event_ids: string[];
  reviewer_role_slug: string;
}

export function synthesizeAmendmentDrafts(
  observations: ObservationSample[],
  currentSettings: Record<string, unknown>,
  reviewerRoleSlug: string,
): SynthesizedDraft[] {
  if (observations.length === 0) return [];
  const clusters = new Map<string, ObservationSample[]>();
  for (const o of observations) {
    const arr = clusters.get(o.target_setting) ?? [];
    arr.push(o);
    clusters.set(o.target_setting, arr);
  }
  const drafts: SynthesizedDraft[] = [];
  for (const [setting, samples] of clusters.entries()) {
    if (samples.length < 3) continue;
    const confidence = Math.min(0.95, 0.5 + samples.length * 0.05);
    if (confidence < MIN_CONFIDENCE_THRESHOLD) continue;
    const currentValue = { value: currentSettings[setting] ?? null };
    const proposedValue = {
      value: samples[samples.length - 1].observed_value.value ?? null,
    };
    const reasonCodes = Array.from(
      new Set(samples.map((s) => `${s.source_layer}:${s.observation_type}`)),
    );
    drafts.push({
      target_setting: setting,
      current_value: currentValue,
      proposed_value: proposedValue,
      confidence_score: confidence,
      reason_codes: reasonCodes,
      evidence_summary: {
        sample_count: samples.length,
        source_layers: Array.from(new Set(samples.map((s) => s.source_layer))),
      },
      causing_observation_event_ids: samples.map((s) => s.id),
      reviewer_role_slug: reviewerRoleSlug,
    });
  }
  return drafts;
}

export async function runSynthesizer(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  reviewerRoleSlug: string;
  currentSettings: Record<string, unknown>;
  lookbackDays: number;
}): Promise<{ drafts_created: number }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "selfgov.runSynthesizer",
    actorType: "system",
  });
  const supabase = createServiceClient();
  const { count: pendingCount, error: cntErr } = await supabase
    .from("drafted_amendments")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", input.firmId)
    .eq("status", "drafted");
  if (cntErr) throw cntErr;
  if ((pendingCount ?? 0) >= MAX_PENDING_DRAFTS_PER_FIRM) {
    return { drafts_created: 0 };
  }
  const sinceIso = new Date(Date.now() - input.lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: obs, error: oErr } = await supabase
    .from("observation_events")
    .select("id, source_layer, observation_type, target_setting, observed_value")
    .eq("firm_id", input.firmId)
    .gte("observed_at", sinceIso);
  if (oErr) throw oErr;
  const samples: ObservationSample[] = (obs ?? []).map((r) => ({
    id: r.id as string,
    source_layer: r.source_layer as SourceLayer,
    observation_type: r.observation_type as ObservationType,
    target_setting: r.target_setting as string,
    observed_value: (r.observed_value as Record<string, unknown>) ?? {},
  }));
  const drafts = synthesizeAmendmentDrafts(
    samples,
    input.currentSettings,
    input.reviewerRoleSlug,
  );
  const available = MAX_PENDING_DRAFTS_PER_FIRM - (pendingCount ?? 0);
  const toInsert = drafts.slice(0, available);
  let created = 0;
  for (const d of toInsert) {
    const { data: row, error: iErr } = await supabase
      .from("drafted_amendments")
      .insert({
        firm_id: input.firmId,
        firm_client_id: input.firmClientId,
        engagement_id: input.engagementId,
        target_setting: d.target_setting,
        current_value: d.current_value,
        proposed_value: d.proposed_value,
        confidence_score: d.confidence_score,
        reason_codes: d.reason_codes,
        evidence_summary: d.evidence_summary,
        causing_observation_event_ids: d.causing_observation_event_ids,
        reviewer_role_slug: d.reviewer_role_slug,
        status: "drafted",
      })
      .select("id")
      .single();
    if (iErr || !row) throw iErr ?? new Error("draft_insert_failed");
    await emitSelfgovEvent({
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: input.engagementId,
      eventType: "ap_selfgov.amendment_drafted",
      aggregateType: "drafted_amendment",
      aggregateId: row.id as string,
      payload: {
        target_setting: d.target_setting,
        confidence_score: d.confidence_score,
      },
    });
    created += 1;
  }
  return { drafts_created: created };
}

export async function approveDraftedAmendment(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  amendmentId: string;
  approvedByUserId: string;
}): Promise<{ ok: true }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "selfgov.approveDraftedAmendment",
    actorUserId: input.approvedByUserId,
  });
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("drafted_amendments")
    .update({
      status: "applied",
      applied_at: now,
      applied_by_user_id: input.approvedByUserId,
      updated_at: now,
    })
    .eq("id", input.amendmentId)
    .eq("status", "drafted")
    .select("id, target_setting, proposed_value")
    .single();
  if (error || !data) throw error ?? new Error("amendment_not_drafted_or_missing");

  const proposed = data.proposed_value as { value: unknown };
  const { data: selection, error: sErr } = await supabase
    .from("customer_pack_selections")
    .select("id, overrides")
    .eq("firm_id", input.firmId)
    .is("deactivated_at", null)
    .maybeSingle();
  if (sErr) throw sErr;
  if (selection) {
    const merged = {
      ...((selection.overrides as Record<string, unknown>) ?? {}),
      [data.target_setting as string]: proposed.value,
    };
    const { error: oErr } = await supabase
      .from("customer_pack_selections")
      .update({ overrides: merged, updated_at: now })
      .eq("id", selection.id);
    if (oErr) throw oErr;
  }

  await emitSelfgovEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_selfgov.amendment_applied",
    aggregateType: "drafted_amendment",
    aggregateId: data.id as string,
    payload: {
      target_setting: data.target_setting,
      proposed_value: data.proposed_value,
    },
    actorUserId: input.approvedByUserId,
  });
  return { ok: true };
}

export async function rejectDraftedAmendment(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  amendmentId: string;
  rejectedByUserId: string;
  rejectedReason: string;
}): Promise<{ ok: true }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "selfgov.rejectDraftedAmendment",
    actorUserId: input.rejectedByUserId,
  });
  if (!input.rejectedReason || input.rejectedReason.trim().length === 0) {
    throw new Error("rejected_reason_required");
  }
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("drafted_amendments")
    .update({
      status: "rejected",
      rejected_at: now,
      rejected_by_user_id: input.rejectedByUserId,
      rejected_reason: input.rejectedReason,
      updated_at: now,
    })
    .eq("id", input.amendmentId)
    .eq("status", "drafted")
    .select("id, target_setting")
    .single();
  if (error || !data) throw error ?? new Error("amendment_not_drafted_or_missing");
  await emitSelfgovEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_selfgov.amendment_rejected",
    aggregateType: "drafted_amendment",
    aggregateId: data.id as string,
    payload: {
      target_setting: data.target_setting,
      rejected_reason: input.rejectedReason,
    },
    actorUserId: input.rejectedByUserId,
  });
  return { ok: true };
}
