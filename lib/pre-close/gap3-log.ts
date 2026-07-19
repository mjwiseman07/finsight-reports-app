/**
 * Gap 3 — best-effort audit insert into ai_action_log (never throws).
 */
import { createServiceClient } from "@/lib/supabase/service";

export type Gap3ActionCategory =
  | "gap3_approval"
  | "gap3_sod_violation"
  | "gap3_mfa_step_up"
  | "gap3_grandfathered_approval"
  | "gap3_autonomous_post"
  | "gap3_client_je_report"
  | "qbo_api_trace";

export async function logGap3Action(input: {
  firmClientId?: string | null;
  actionCategory: Gap3ActionCategory;
  actionType: string;
  actorId?: string | null;
  inputSummary: string;
  outputSummary?: string;
}): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from("ai_action_log").insert({
      firm_client_id: input.firmClientId ?? null,
      action_type: input.actionType,
      action_category: input.actionCategory,
      model_name: input.actorId ? `user:${input.actorId}` : "system:gap3",
      model_provider: "local",
      input_summary: input.inputSummary.slice(0, 4000),
      output_summary: (input.outputSummary ?? "").slice(0, 4000),
    });
  } catch (err) {
    console.warn("[gap3-log] insert failed", err);
  }
}
