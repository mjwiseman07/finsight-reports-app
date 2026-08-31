/**
 * Client-safe constants and response shapes for the read-only sandbox JE cockpit.
 * No server imports — safe for client components.
 */

import type { GovernedJeActivationInspection } from "./je3d-activation-inspection";
import type { Je3dPreDispatchChecklistReport } from "./je3d-pre-dispatch-checklist";
import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";

export const SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY = "governed-sandbox-je-cockpit";

export const SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID =
  "08bbbd62-8c4e-4463-b96e-2bd8bfdce603";

export const SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID = "223";

export const SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED = "9341457539236929";

export type Patent6ChainReceiptEvent = {
  event_id: string;
  event_type: string;
  event_hash: string | null;
  previous_event_hash: string | null;
  chain_index: number | null;
  event_sequence: number | null;
  aggregate_type: string;
  aggregate_id: string;
  /** Business-time stamp from ledger_events.occurred_at — display only, not chain authority. */
  occurred_at: string;
  /** Insert-time stamp from ledger_events.recorded_at — display only, not chain authority. */
  recorded_at: string;
};

export type SandboxCockpitCapabilityState = {
  create_sandbox_je: boolean;
  verify_sandbox_je: boolean;
  memory: boolean;
  worker: boolean;
  governed_auto: boolean;
  /** True when sandbox dispatch kill switch is engaged (provider POST blocked). */
  dispatch_kill_switch_engaged: boolean;
  post_disabled: true;
  verify_disabled: true;
};

/** Unambiguous cockpit label — engaged means dispatch is blocked. */
export function formatDispatchKillSwitchLabel(engaged: boolean): string {
  return engaged ? "ON (dispatch blocked)" : "OFF (dispatch permitted)";
}

export type SafeSandboxAllowlistResponse = {
  qb_environment: "sandbox";
  allowlist_resolution: "resolved" | "unresolved" | "ambiguous";
  demo_a: {
    company_id: string;
    accounting_connection_id: string;
    realm_id: string;
    provider: "quickbooks";
    provider_environment: "sandbox";
    demo_role: string;
    firm_client_id: string;
  } | null;
  verified_execution_id: typeof SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID;
  verified_provider_journal_id: typeof SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID;
  capabilities: SandboxCockpitCapabilityState;
  memory_is_display_context_only: true;
};

export type SafeSandboxInspectionResponse = {
  inspection: GovernedJeActivationInspection;
  canonical_identity: typeof JE_3D_VERIFIED_DEMO_A_IDENTITY;
  verified_at: string | null;
  patent6_chain_receipt: {
    aggregate_type: "journal_entry_execution";
    aggregate_id: string;
    events: Patent6ChainReceiptEvent[];
  };
  capabilities: SandboxCockpitCapabilityState;
  memory_is_display_context_only: true;
};

export type SafeSandboxChecklistResponse = {
  execution_id: string;
  checklist: Je3dPreDispatchChecklistReport;
  capabilities: SandboxCockpitCapabilityState;
  post_disabled: true;
  verify_disabled: true;
  memory_is_display_context_only: true;
};

export { JE_3D_VERIFIED_DEMO_A_IDENTITY };
