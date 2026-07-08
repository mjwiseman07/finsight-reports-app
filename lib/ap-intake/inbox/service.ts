/**
 * D6.5 Part 2 · Block 7b — L8 Multimodal AP Inbox service.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PERMANENT_EXCLUSION_INTENTS,
  PermanentExclusionError,
  isPermanentExclusionIntent,
} from "./exclusions";
import {
  resolveAutonomyDecision,
  validateAutonomyConfigWrite,
  type AutonomyConfig,
  type AutonomyMode,
} from "./autonomy";
import type { ApInboxIntent } from "./intent";
import { makeDefaultClassifier, type IntentClassifier, type RawMessage } from "./classifier";
import { makeDefaultDrafter, type Drafter, type VendorAccountState } from "./drafter";

export { PERMANENT_EXCLUSION_INTENTS, PermanentExclusionError } from "./exclusions";

const ADDON = "ap_multimodal_inbox" as const;
const PILOT = "ap_multimodal_inbox" as const;

type GateInput = {
  firmId: string;
  firmClientId?: string;
  engagementId: string;
  caller: string;
  actorUserId?: string;
  actorType?: "user" | "system";
};

async function gate(input: GateInput): Promise<void> {
  await assertEntitlement(ADDON, input.engagementId, {
    caller: input.caller,
    firmClientId: input.firmClientId,
    actorType: input.actorType ?? "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature(PILOT, input.firmId);
}

async function resolveEngagementIdForFirmAddon(
  firmId: string,
  addonCode: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: engs } = await supabase.from("engagements").select("id").eq("firm_id", firmId);
  if (!engs?.length) return null;
  for (const eng of engs) {
    const { data: row } = await supabase
      .from("engagement_addons")
      .select("is_active")
      .eq("engagement_id", eng.id)
      .eq("addon_code", addonCode)
      .maybeSingle();
    if (row?.is_active) return eng.id as string;
  }
  return null;
}

export type IngestMessageInput = {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  channel: "email" | "voice" | "sms" | "messaging";
  externalMessageId?: string | null;
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  senderAddress: string;
  rawPayload: unknown;
  attachments?: unknown[];
  classifier?: IntentClassifier;
};

export type IngestMessageOutput = {
  message_id: string;
  intent: ApInboxIntent;
  intent_confidence: number;
  draft_id: string | null;
  autonomy_decision: "needs_approval" | "auto_send_pending" | "permanent_exclusion_hold" | null;
};

export async function ingestMessage(input: IngestMessageInput): Promise<IngestMessageOutput> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.ingestMessage",
    actorType: "system",
  });
  const supabase = createServiceClient();
  const { data: msg, error: insertErr } = await supabase
    .from("vendor_ap_inbox_messages")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      channel: input.channel,
      direction: "inbound",
      external_message_id: input.externalMessageId ?? null,
      subject: input.subject ?? null,
      body_text: input.bodyText,
      body_html: input.bodyHtml ?? null,
      attachments: input.attachments ?? [],
      sender_address: input.senderAddress,
      raw_payload: input.rawPayload as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (insertErr || !msg) throw insertErr ?? new Error("ap_inbox ingest insert returned no row");

  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: msg.id as string,
    eventType: "ap_inbox.message_received",
    payload: { channel: input.channel },
  });

  const classifier = input.classifier ?? makeDefaultClassifier();
  const raw: RawMessage = {
    channel: input.channel,
    subject: input.subject ?? null,
    body_text: input.bodyText,
    sender_address: input.senderAddress,
    attachments: input.attachments,
  };
  let intent: ApInboxIntent = "generic";
  let confidence = 0;
  try {
    const result = await classifier.classifyMessage(raw);
    intent = result.intent;
    confidence = result.confidence;
  } catch {
    await emitInboxEvent(supabase, {
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: input.engagementId,
      aggregateId: msg.id as string,
      eventType: "ap_inbox.classification_failed",
      payload: {},
    });
    intent = "generic";
    confidence = 0;
  }

  const { error: updErr } = await supabase
    .from("vendor_ap_inbox_messages")
    .update({
      intent,
      intent_confidence: confidence,
      intent_classified_at: new Date().toISOString(),
    })
    .eq("id", msg.id);
  if (updErr) throw updErr;

  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: msg.id as string,
    eventType: "ap_inbox.message_classified",
    payload: { intent, confidence },
  });

  const drafted = await draftResponseCore(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    messageId: msg.id as string,
    intent,
    subject: input.subject ?? null,
    bodyText: input.bodyText,
    senderAddress: input.senderAddress,
  });

  return {
    message_id: msg.id as string,
    intent,
    intent_confidence: confidence,
    draft_id: drafted?.id ?? null,
    autonomy_decision: drafted?.autonomy_decision ?? null,
  };
}

export type DraftResponseInput = {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  messageId: string;
  intent: ApInboxIntent;
  subject: string | null;
  bodyText: string;
  senderAddress: string;
  drafter?: Drafter;
  vendorAccountState?: VendorAccountState;
  modelId?: string;
  toneProfileId?: string | null;
};

export type DraftedRow = {
  id: string;
  autonomy_decision: "needs_approval" | "auto_send_pending" | "permanent_exclusion_hold";
};

export async function draftResponse(input: DraftResponseInput): Promise<DraftedRow> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.draftResponse",
    actorType: "system",
  });
  const supabase = createServiceClient();
  return draftResponseCore(supabase, input);
}

async function draftResponseCore(
  supabase: SupabaseClient,
  input: DraftResponseInput,
): Promise<DraftedRow> {
  const config = await getOrCreateAutonomyConfig(supabase, input.firmId);
  const decision = resolveAutonomyDecision(input.intent, config);

  if (isPermanentExclusionIntent(input.intent)) {
    const { data: hold, error: holdErr } = await supabase
      .from("ap_inbox_drafted_responses")
      .insert({
        firm_id: input.firmId,
        message_id: input.messageId,
        draft_body_text: "[PERMANENT EXCLUSION — no draft generated. Reviewer must handle manually.]",
        intent_at_draft_time: input.intent,
        model_id: input.modelId ?? "n/a",
        tone_profile_id: input.toneProfileId ?? null,
        autonomy_decision: "permanent_exclusion_hold",
        autonomy_reason: decision.reason,
      })
      .select("id, autonomy_decision")
      .single();
    if (holdErr || !hold) throw holdErr ?? new Error("draft hold insert returned no row");
    await logPermanentExclusion(
      supabase,
      input.firmId,
      input.messageId,
      input.intent,
      "draft_hold",
      null,
    );
    await emitInboxEvent(supabase, {
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: input.engagementId,
      aggregateId: input.messageId,
      eventType: "ap_inbox.permanent_exclusion_enforced",
      payload: { enforcement_path: "draft_hold", intent: input.intent },
    });
    return { id: hold.id as string, autonomy_decision: "permanent_exclusion_hold" };
  }

  const drafter = input.drafter ?? makeDefaultDrafter();
  const drafted = await drafter.draft({
    firmId: input.firmId,
    messageId: input.messageId,
    intent: input.intent,
    subject: input.subject,
    bodyText: input.bodyText,
    senderAddress: input.senderAddress,
    vendorAccountState:
      input.vendorAccountState ?? { openInvoices: [], openCreditsCents: 0, prepaymentBalanceCents: 0 },
    toneProfileId: input.toneProfileId ?? null,
    modelId: input.modelId ?? "template-v1",
  });
  if (!drafted) throw new Error("Drafter returned null for non-excluded intent — invariant violation");

  const { data: row, error: insertErr } = await supabase
    .from("ap_inbox_drafted_responses")
    .insert({
      firm_id: input.firmId,
      message_id: input.messageId,
      draft_body_text: drafted.draft_body_text,
      draft_body_html: drafted.draft_body_html,
      intent_at_draft_time: drafted.intent_at_draft_time,
      model_id: drafted.model_id,
      tone_profile_id: drafted.tone_profile_id,
      autonomy_decision: decision.decision,
      autonomy_reason: decision.reason,
    })
    .select("id, autonomy_decision")
    .single();
  if (insertErr || !row) throw insertErr ?? new Error("draft insert returned no row");

  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.messageId,
    eventType: "ap_inbox.draft_created",
    payload: { autonomy_decision: decision.decision, intent: input.intent },
  });

  return { id: row.id as string, autonomy_decision: row.autonomy_decision as DraftedRow["autonomy_decision"] };
}

export async function reclassifyMessage(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  messageId: string;
  newIntent: ApInboxIntent;
  reviewerUserId: string;
}): Promise<void> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.reclassifyMessage",
    actorUserId: input.reviewerUserId,
  });
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("vendor_ap_inbox_messages")
    .update({ intent: input.newIntent, intent_classified_at: new Date().toISOString() })
    .eq("id", input.messageId)
    .eq("firm_id", input.firmId);
  if (error) throw error;
  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.messageId,
    eventType: "ap_inbox.reclassified",
    payload: { new_intent: input.newIntent, reviewer_user_id: input.reviewerUserId },
    actorUserId: input.reviewerUserId,
  });
}

export async function approveDraft(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  draftId: string;
  reviewerUserId: string;
  editedBodyText?: string;
}): Promise<void> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.approveDraft",
    actorUserId: input.reviewerUserId,
  });
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    reviewer_user_id: input.reviewerUserId,
    reviewer_decided_at: new Date().toISOString(),
    reviewer_decision: input.editedBodyText ? "approved_with_edits" : "approved_as_drafted",
  };
  if (input.editedBodyText) patch.draft_body_text = input.editedBodyText;
  const { error } = await supabase
    .from("ap_inbox_drafted_responses")
    .update(patch)
    .eq("id", input.draftId)
    .eq("firm_id", input.firmId);
  if (error) throw error;
  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.draftId,
    eventType: "ap_inbox.draft_reviewer_approved",
    payload: {},
    actorUserId: input.reviewerUserId,
  });
}

export async function rejectDraft(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  draftId: string;
  reviewerUserId: string;
  reason?: string;
}): Promise<void> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.rejectDraft",
    actorUserId: input.reviewerUserId,
  });
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ap_inbox_drafted_responses")
    .update({
      reviewer_user_id: input.reviewerUserId,
      reviewer_decided_at: new Date().toISOString(),
      reviewer_decision: "rejected",
    })
    .eq("id", input.draftId)
    .eq("firm_id", input.firmId);
  if (error) throw error;
  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.draftId,
    eventType: "ap_inbox.draft_reviewer_rejected",
    payload: { reason: input.reason ?? null },
    actorUserId: input.reviewerUserId,
  });
}

export async function deferDraft(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  draftId: string;
  reviewerUserId: string;
}): Promise<void> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.deferDraft",
    actorUserId: input.reviewerUserId,
  });
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ap_inbox_drafted_responses")
    .update({
      reviewer_user_id: input.reviewerUserId,
      reviewer_decided_at: new Date().toISOString(),
      reviewer_decision: "deferred",
    })
    .eq("id", input.draftId)
    .eq("firm_id", input.firmId);
  if (error) throw error;
  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.draftId,
    eventType: "ap_inbox.draft_reviewer_deferred",
    payload: {},
    actorUserId: input.reviewerUserId,
  });
}

export async function updateAutonomyConfig(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  mode: AutonomyMode;
  allowlistIntents: readonly string[];
  escalationRoleSlug?: string;
  actorUserId?: string;
}): Promise<void> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.updateAutonomyConfig",
    actorUserId: input.actorUserId,
  });
  const supabase = createServiceClient();
  const check = validateAutonomyConfigWrite({
    mode: input.mode,
    allowlist_intents: input.allowlistIntents,
  });
  if (!check.ok) {
    await logPermanentExclusion(
      supabase,
      input.firmId,
      null,
      check.offending.join(","),
      "server_config_reject",
      { mode: input.mode, allowlist_intents: input.allowlistIntents },
    );
    await emitInboxEvent(supabase, {
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: input.engagementId,
      aggregateId: input.firmId,
      eventType: "ap_inbox.permanent_exclusion_enforced",
      payload: { enforcement_path: "server_config_reject", offending: check.offending },
    });
    throw new PermanentExclusionError(
      check.offending[0] ?? "unknown",
      "server_config_reject",
      `Allowlist contains permanent-excluded intents: ${check.offending.join(", ")}`,
    );
  }
  const { error } = await supabase.from("ap_inbox_autonomy_config").upsert(
    {
      firm_id: input.firmId,
      mode: input.mode,
      allowlist_intents: input.allowlistIntents,
      escalation_role_slug: input.escalationRoleSlug ?? "firm_admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "firm_id" },
  );
  if (error) throw error;
  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateId: input.firmId,
    eventType: "ap_inbox.autonomy_config_updated",
    payload: { mode: input.mode },
    actorUserId: input.actorUserId,
  });
}

export async function sendDraftedResponse(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  draftId: string;
}): Promise<{ sent_message_id: string }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "inbox.sendDraftedResponse",
    actorType: "system",
  });
  const supabase = createServiceClient();
  const { data: draft, error: readErr } = await supabase
    .from("ap_inbox_drafted_responses")
    .select(
      "id, firm_id, message_id, intent_at_draft_time, autonomy_decision, draft_body_text, draft_body_html",
    )
    .eq("id", input.draftId)
    .eq("firm_id", input.firmId)
    .single();
  if (readErr || !draft) throw readErr ?? new Error("draft not found");

  if (isPermanentExclusionIntent(draft.intent_at_draft_time as string)) {
    await logPermanentExclusion(
      supabase,
      input.firmId,
      draft.message_id as string,
      draft.intent_at_draft_time as string,
      "send_time_reject",
      { draft_id: draft.id },
    );
    await emitInboxEvent(supabase, {
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: input.engagementId,
      aggregateId: draft.message_id as string,
      eventType: "ap_inbox.permanent_exclusion_enforced",
      payload: {
        enforcement_path: "send_time_reject",
        intent: draft.intent_at_draft_time,
      },
    });
    throw new PermanentExclusionError(draft.intent_at_draft_time as string, "send_time_reject");
  }

  if (
    draft.autonomy_decision !== "auto_send_pending" &&
    draft.autonomy_decision !== "needs_approval"
  ) {
    throw new Error(`Draft ${draft.id} has autonomy_decision=${draft.autonomy_decision}; not sendable`);
  }

  const firmClientId =
    (await lookupFirmClient(supabase, draft.message_id as string)) ?? input.firmClientId;
  const { data: outbound, error: sendErr } = await supabase
    .from("vendor_ap_inbox_messages")
    .insert({
      firm_id: input.firmId,
      firm_client_id: firmClientId,
      channel: "email",
      direction: "outbound",
      subject: null,
      body_text: draft.draft_body_text as string,
      body_html: (draft.draft_body_html as string | null) ?? null,
      sender_address: "no-reply@advisacor.com",
      raw_payload: { source: "draft", draft_id: draft.id },
      intent: draft.intent_at_draft_time as string,
    })
    .select("id")
    .single();
  if (sendErr || !outbound) throw sendErr ?? new Error("outbound insert returned no row");

  const { error: markErr } = await supabase
    .from("ap_inbox_drafted_responses")
    .update({ sent_at: new Date().toISOString(), sent_message_id: outbound.id })
    .eq("id", draft.id);
  if (markErr) throw markErr;

  await emitInboxEvent(supabase, {
    firmId: input.firmId,
    firmClientId,
    engagementId: input.engagementId,
    aggregateId: outbound.id as string,
    eventType: "ap_inbox.draft_sent",
    payload: { draft_id: draft.id },
  });

  return { sent_message_id: outbound.id as string };
}

export async function resolveInboxEngagementId(firmId: string): Promise<string | null> {
  return resolveEngagementIdForFirmAddon(firmId, ADDON);
}

async function getOrCreateAutonomyConfig(
  supabase: SupabaseClient,
  firmId: string,
): Promise<AutonomyConfig> {
  const { data, error } = await supabase
    .from("ap_inbox_autonomy_config")
    .select("firm_id, mode, allowlist_intents, escalation_role_slug")
    .eq("firm_id", firmId)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      firm_id: data.firm_id as string,
      mode: data.mode as AutonomyMode,
      allowlist_intents: (data.allowlist_intents as string[]) ?? [],
      escalation_role_slug: data.escalation_role_slug as string,
    };
  }
  const { data: inserted, error: insertErr } = await supabase
    .from("ap_inbox_autonomy_config")
    .insert({
      firm_id: firmId,
      mode: "approve_all",
      allowlist_intents: [],
      escalation_role_slug: "firm_admin",
    })
    .select("firm_id, mode, allowlist_intents, escalation_role_slug")
    .single();
  if (insertErr || !inserted) throw insertErr ?? new Error("autonomy config seed returned no row");
  return {
    firm_id: inserted.firm_id as string,
    mode: inserted.mode as AutonomyMode,
    allowlist_intents: (inserted.allowlist_intents as string[]) ?? [],
    escalation_role_slug: inserted.escalation_role_slug as string,
  };
}

async function lookupFirmClient(supabase: SupabaseClient, messageId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vendor_ap_inbox_messages")
    .select("firm_client_id")
    .eq("id", messageId)
    .maybeSingle();
  return (data?.firm_client_id as string | undefined) ?? null;
}

async function emitInboxEvent(
  _supabase: SupabaseClient,
  input: {
    firmId: string;
    firmClientId: string;
    engagementId: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    actorUserId?: string;
  },
): Promise<void> {
  await publishEvent({
    eventType: input.eventType,
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_ap_inbox",
    aggregateId: input.aggregateId,
    actorType: input.actorUserId ? "user" : "system",
    actorId: input.actorUserId,
    payload: input.payload,
  });
}

async function logPermanentExclusion(
  supabase: SupabaseClient,
  firmId: string,
  messageId: string | null,
  intent: string,
  enforcementPath: "server_config_reject" | "draft_hold" | "send_time_reject",
  rejectedConfig: unknown,
): Promise<void> {
  const { error } = await supabase.from("ap_inbox_permanent_exclusions_log").insert({
    firm_id: firmId,
    message_id: messageId,
    intent,
    enforcement_path: enforcementPath,
    rejected_config: rejectedConfig,
  });
  if (error) {
    console.warn("[ap_inbox] permanent exclusion log insert failed", { error });
  }
}
