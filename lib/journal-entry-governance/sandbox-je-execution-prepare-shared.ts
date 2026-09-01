/**
 * Client-safe shapes for sandbox two-person execution prepare.
 * No server imports — safe for client components.
 */

import type { Patent6ChainReceiptEvent } from "./sandbox-je-cockpit-shared";
import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";

export const SANDBOX_JE_PREPARE_MUTATE_RATE_LIMIT_KEY =
  "governed-sandbox-je-prepare-mutate";

export const SANDBOX_JE_ACCEPTED_PROPOSAL_ID =
  "750903ca-e3ab-4fdc-8ae8-a4a052c618e5" as const;

export const SANDBOX_JE_ACCEPTED_APPROVAL_ID =
  "e5839fd7-9ddc-439f-bd90-3d89cd0cc3bd" as const;

export type SandboxJePrepareCapabilityState = {
  prepare_sandbox_je: boolean;
  create_sandbox_je: false;
  verify_sandbox_je: false;
  memory: false;
  worker: false;
  governed_auto: false;
  dispatch_kill_switch_engaged: true;
  post_disabled: true;
  verify_disabled: true;
  execution_prepare_disabled: boolean;
};

export type SafeSandboxPrepareResponse = {
  execution_id: string;
  proposal_id: string;
  approval_id: string;
  status: "READY_TO_POST" | "PRECHECK_FAILED" | "RESERVED";
  execution_hash: string;
  correlation_marker: string;
  reused: boolean;
  preflight_eligible: boolean;
  preparation_authority: "SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1";
  preparation_mode: "APPROVER_MECHANICAL_CUSTODY";
  demo_a: typeof JE_3D_VERIFIED_DEMO_A_IDENTITY;
  capabilities: SandboxJePrepareCapabilityState;
  patent6_chain_receipt: {
    aggregate_type: "journal_entry_execution";
    aggregate_id: string;
    events: Patent6ChainReceiptEvent[];
  };
  memory_is_display_context_only: true;
};

export { JE_3D_VERIFIED_DEMO_A_IDENTITY };
