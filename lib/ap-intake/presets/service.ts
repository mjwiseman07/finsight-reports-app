import { createServiceClient } from "@/lib/supabase/service";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { publishEvent } from "@/lib/events/publisher";
import type { EffectiveSettings, PackOverrides, PresetPackCode } from "./types";
import { isPresetPackCode } from "./types";
import { computeEffectiveSettings, getPackDefinition } from "./registry";

const ADDON_PRESETS = "ap_preset_packs" as const;
const PILOT_PRESETS = "ap_preset_packs" as const;

interface GateInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  caller: string;
  actorUserId?: string;
}

async function gate(input: GateInput): Promise<void> {
  await assertEntitlement(ADDON_PRESETS, input.engagementId, {
    caller: input.caller,
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature(PILOT_PRESETS, input.firmId);
}

async function emitPresetEvent(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  eventType: "ap_preset.pack_selected" | "ap_preset.pack_swapped" | "ap_preset.override_applied";
  aggregateId: string;
  payload: Record<string, unknown>;
  actorUserId: string;
}): Promise<void> {
  await publishEvent({
    eventType: input.eventType,
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "customer_pack_selection",
    aggregateId: input.aggregateId,
    actorType: "user",
    actorId: input.actorUserId,
    payload: input.payload,
  });
}

export async function selectPresetPack(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  packCode: PresetPackCode;
  selectedByUserId: string;
}): Promise<{ selection_id: string; effective_settings: EffectiveSettings }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "presets.selectPresetPack",
    actorUserId: input.selectedByUserId,
  });
  if (!isPresetPackCode(input.packCode)) {
    throw new Error(`invalid pack_code: ${input.packCode}`);
  }
  const supabase = createServiceClient();
  const { data: existing, error: eErr } = await supabase
    .from("customer_pack_selections")
    .select("id")
    .eq("firm_id", input.firmId)
    .is("deactivated_at", null)
    .maybeSingle();
  if (eErr) throw eErr;
  if (existing) throw new Error("firm_already_has_active_pack_use_swap");
  const { data: row, error: iErr } = await supabase
    .from("customer_pack_selections")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      pack_code: input.packCode,
      overrides: {},
      selected_by_user_id: input.selectedByUserId,
    })
    .select("id")
    .single();
  if (iErr || !row) throw iErr ?? new Error("selection_insert_failed");
  await emitPresetEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_preset.pack_selected",
    aggregateId: row.id as string,
    payload: { pack_code: input.packCode },
    actorUserId: input.selectedByUserId,
  });
  const effective = computeEffectiveSettings(input.packCode, {});
  return { selection_id: row.id as string, effective_settings: effective };
}

export async function swapPresetPack(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  newPackCode: PresetPackCode;
  swappedByUserId: string;
}): Promise<{ selection_id: string; effective_settings: EffectiveSettings }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "presets.swapPresetPack",
    actorUserId: input.swappedByUserId,
  });
  if (!isPresetPackCode(input.newPackCode)) {
    throw new Error(`invalid pack_code: ${input.newPackCode}`);
  }
  const supabase = createServiceClient();
  const { data: current, error: cErr } = await supabase
    .from("customer_pack_selections")
    .select("id, pack_code, overrides")
    .eq("firm_id", input.firmId)
    .is("deactivated_at", null)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!current) throw new Error("no_active_pack_use_select");
  if (current.pack_code === input.newPackCode) {
    throw new Error("new_pack_matches_current_pack");
  }
  const now = new Date().toISOString();
  const { error: uErr } = await supabase
    .from("customer_pack_selections")
    .update({ deactivated_at: now, deactivated_by_user_id: input.swappedByUserId })
    .eq("id", current.id);
  if (uErr) throw uErr;
  const { data: row, error: iErr } = await supabase
    .from("customer_pack_selections")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      pack_code: input.newPackCode,
      overrides: current.overrides ?? {},
      selected_by_user_id: input.swappedByUserId,
    })
    .select("id")
    .single();
  if (iErr || !row) throw iErr ?? new Error("swap_insert_failed");
  await emitPresetEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_preset.pack_swapped",
    aggregateId: row.id as string,
    payload: {
      previous_pack_code: current.pack_code,
      new_pack_code: input.newPackCode,
      previous_selection_id: current.id,
    },
    actorUserId: input.swappedByUserId,
  });
  const effective = computeEffectiveSettings(
    input.newPackCode,
    (current.overrides as PackOverrides) ?? {},
  );
  return { selection_id: row.id as string, effective_settings: effective };
}

export async function applyPackOverride(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  override: PackOverrides;
  appliedByUserId: string;
}): Promise<{ selection_id: string; effective_settings: EffectiveSettings }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "presets.applyPackOverride",
    actorUserId: input.appliedByUserId,
  });
  const supabase = createServiceClient();
  const { data: current, error: cErr } = await supabase
    .from("customer_pack_selections")
    .select("id, pack_code, overrides")
    .eq("firm_id", input.firmId)
    .is("deactivated_at", null)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!current) throw new Error("no_active_pack_to_override");
  const merged: PackOverrides = {
    ...((current.overrides as PackOverrides) ?? {}),
    ...input.override,
  };
  const { error: uErr } = await supabase
    .from("customer_pack_selections")
    .update({ overrides: merged, updated_at: new Date().toISOString() })
    .eq("id", current.id);
  if (uErr) throw uErr;
  await emitPresetEvent({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    eventType: "ap_preset.override_applied",
    aggregateId: current.id as string,
    payload: {
      applied_override: input.override,
      resulting_overrides: merged,
    },
    actorUserId: input.appliedByUserId,
  });
  const effective = computeEffectiveSettings(current.pack_code as PresetPackCode, merged);
  return { selection_id: current.id as string, effective_settings: effective };
}

export async function getCurrentEffectiveSettings(input: {
  firmId: string;
}): Promise<EffectiveSettings | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("customer_pack_selections")
    .select("pack_code, overrides")
    .eq("firm_id", input.firmId)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const packCode = data.pack_code as PresetPackCode;
  getPackDefinition(packCode);
  return computeEffectiveSettings(packCode, (data.overrides as PackOverrides) ?? {});
}
