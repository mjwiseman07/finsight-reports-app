/**
 * Permanent exclusion list — L8 Multimodal AP Inbox.
 *
 * These intents are NEVER auto-responded to, regardless of tenant autonomy config.
 * Enforced at three layers:
 *   1. Config write     — validator rejects, logs to ap_inbox_permanent_exclusions_log
 *   2. Draft creation   — autonomy engine forces 'permanent_exclusion_hold' regardless of mode
 *   3. Send-time        — sender re-checks intent and throws PermanentExclusionError if hit
 *
 * DB CHECK constraint on ap_inbox_autonomy_config.allowlist_intents is the at-rest safety net.
 *
 * DO NOT expose a mutation path for this list. It is a compile-time constant.
 */
export const PERMANENT_EXCLUSION_INTENTS = [
  "bank_change_request",
  "wire_transfer_initiation",
  "refund_transmission_request",
  "refund_request",
] as const;

export type PermanentExclusionIntent = (typeof PERMANENT_EXCLUSION_INTENTS)[number];

export function isPermanentExclusionIntent(
  intent: string | null | undefined,
): intent is PermanentExclusionIntent {
  if (!intent) return false;
  return (PERMANENT_EXCLUSION_INTENTS as readonly string[]).includes(intent);
}

export class PermanentExclusionError extends Error {
  readonly intent: string;
  readonly enforcementPath: "server_config_reject" | "draft_hold" | "send_time_reject";

  constructor(
    intent: string,
    enforcementPath: "server_config_reject" | "draft_hold" | "send_time_reject",
    message?: string,
  ) {
    super(
      message ??
        `Intent '${intent}' is on the permanent exclusion list (${enforcementPath}); auto-response is not permitted.`,
    );
    this.name = "PermanentExclusionError";
    this.intent = intent;
    this.enforcementPath = enforcementPath;
  }
}
