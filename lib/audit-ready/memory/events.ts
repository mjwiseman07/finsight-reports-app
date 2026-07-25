import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type MemoryEventType =
  | "suggestions_shown"
  | "suggestions_none"
  | "copy_clicked"
  | "resolution_saved";

export type EmitMemoryEventInput = {
  eventType: MemoryEventType;
  engagementId: string;
  actorUserId: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Fire-and-forget memory event emission.
 * Never throws — errors logged only. Parent request must not fail if event insert fails.
 */
export async function emitMemoryEvent(
  input: EmitMemoryEventInput,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("audit_ready_memory_events").insert({
      event_type: input.eventType,
      engagement_id: input.engagementId,
      actor_user_id: input.actorUserId,
      payload: input.payload ?? {},
    });
    if (error) {
      console.error("[memory-events] emit failed", input.eventType, error);
    }
  } catch (err) {
    console.error("[memory-events] emit failed", input.eventType, err);
  }
}
