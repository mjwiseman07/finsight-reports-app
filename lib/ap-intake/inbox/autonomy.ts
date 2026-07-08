import { PERMANENT_EXCLUSION_INTENTS, isPermanentExclusionIntent } from "./exclusions";
import type { ApInboxIntent } from "./intent";

export type AutonomyMode = "approve_all" | "allowlist_auto_send" | "auto_send_default";

export type AutonomyConfig = {
  firm_id: string;
  mode: AutonomyMode;
  allowlist_intents: readonly string[];
  escalation_role_slug: string;
};

export type AutonomyDecision =
  | { decision: "needs_approval"; reason: string }
  | { decision: "auto_send_pending"; reason: string }
  | { decision: "permanent_exclusion_hold"; reason: string };

export function resolveAutonomyDecision(
  intent: ApInboxIntent,
  config: AutonomyConfig,
): AutonomyDecision {
  if (isPermanentExclusionIntent(intent)) {
    return {
      decision: "permanent_exclusion_hold",
      reason: `Intent '${intent}' is on the permanent exclusion list; tenant autonomy mode is not consulted.`,
    };
  }
  switch (config.mode) {
    case "approve_all":
      return {
        decision: "needs_approval",
        reason: "Tenant mode 'approve_all' — every draft requires reviewer approval.",
      };
    case "allowlist_auto_send":
      if (config.allowlist_intents.includes(intent)) {
        return {
          decision: "auto_send_pending",
          reason: `Intent '${intent}' is on the tenant allowlist for auto-send.`,
        };
      }
      return {
        decision: "needs_approval",
        reason: `Intent '${intent}' is not on the tenant allowlist; reviewer approval required.`,
      };
    case "auto_send_default":
      return {
        decision: "auto_send_pending",
        reason: "Tenant mode 'auto_send_default' — non-excluded intents auto-send.",
      };
  }
}

export function validateAutonomyConfigWrite(input: {
  mode: AutonomyMode;
  allowlist_intents: readonly string[];
}): { ok: true } | { ok: false; offending: string[] } {
  const offending = input.allowlist_intents.filter((i) =>
    (PERMANENT_EXCLUSION_INTENTS as readonly string[]).includes(i),
  );
  if (offending.length > 0) return { ok: false, offending };
  return { ok: true };
}
