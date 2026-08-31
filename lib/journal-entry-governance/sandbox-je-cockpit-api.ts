/**
 * Read-only US sandbox JE cockpit API helpers.
 * No provider calls. No DB/Memory writes. Fail closed on ambiguous custody.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  classifyQbEnvironment,
  rejectCallerTransportOverrides,
} from "./je3d-sandbox-environment";
import {
  JE_3D_ACTIVATION_ERROR,
  Je3dActivationError,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "./je3d-activation-policy";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  isVerifiedDemoAIdentityMatch,
  resolveJe3dActivationPolicy,
} from "./je3d-first-controlled-create-activation";
import {
  resolveSandboxActivationAllowlist,
  type ResolvedSandboxActivationAllowlist,
  type SandboxAllowlistQueryDeps,
} from "./je3d-sandbox-company-authority";
import {
  inspectGovernedJeActivationCustody,
  type ActivationInspectionDeps,
} from "./je3d-activation-inspection";
import { buildJe3dPreDispatchChecklistReport } from "./je3d-pre-dispatch-checklist";
import { loadExactExecution } from "./provider-attempt-service";
import {
  assertPatent6ChainReceiptCustody,
  LEDGER_EVENTS_PATENT6_CHAIN_SELECT,
  parseLedgerEventPatent6ChainRow,
  type LedgerEventPatent6ChainRow,
} from "./ledger-events-schema";
import {
  SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED,
  SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
  type Patent6ChainReceiptEvent,
  type SafeSandboxAllowlistResponse,
  type SafeSandboxChecklistResponse,
  type SafeSandboxInspectionResponse,
  type SandboxCockpitCapabilityState,
} from "./sandbox-je-cockpit-shared";

export {
  SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED,
  SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY,
  SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
  SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
} from "./sandbox-je-cockpit-shared";

export { Je3dActivationError };

export type {
  Patent6ChainReceiptEvent,
  SafeSandboxAllowlistResponse,
  SafeSandboxChecklistResponse,
  SafeSandboxInspectionResponse,
  SandboxCockpitCapabilityState,
} from "./sandbox-je-cockpit-shared";

const FORBIDDEN_QUERY_OVERRIDE_KEYS = [
  "realmId",
  "realm_id",
  "companyId",
  "company_id",
  "accountingConnectionId",
  "accounting_connection_id",
  "connectionId",
  "connection_id",
  "providerJournalId",
  "provider_journal_id",
  "qbo_je_id",
  "accessToken",
  "access_token",
  "providerEnvironment",
  "provider_environment",
] as const;

export function assertSandboxCockpitQbEnvironment(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): void {
  const classified = classifyQbEnvironment(envValue);
  if (!classified.ok) {
    throw new Je3dActivationError(classified.code, classified.message);
  }
}

export function rejectSandboxCockpitRequestOverrides(request: Request): void {
  const url = new URL(request.url);
  for (const key of FORBIDDEN_QUERY_OVERRIDE_KEYS) {
    const value = url.searchParams.get(key);
    if (value != null && String(value).trim() !== "") {
      throw new Je3dActivationError(
        JE_3D_ACTIVATION_ERROR.CALLER_OVERRIDE_FORBIDDEN,
        `Request parameter ${key} is forbidden; canonical identity cannot be overridden.`,
      );
    }
  }
}

export function resolveSandboxCockpitCapabilityState(): SandboxCockpitCapabilityState {
  const policy = resolveJe3dActivationPolicy();
  return {
    create_sandbox_je: isJe3dCreateCapabilityEnabled(policy),
    verify_sandbox_je: isJe3dVerifyCapabilityEnabled(policy),
    memory: policy.memoryWriteAllowed,
    worker: policy.workerAllowed,
    governed_auto: policy.governedAutoAllowed,
    dispatch_kill_switch_engaged: policy.sandboxDispatchKillSwitch,
    post_disabled: true,
    verify_disabled: true,
  };
}

export function mapJe3dActivationErrorToHttpStatus(code: string): number {
  if (code === JE_3D_ACTIVATION_ERROR.AMBIGUOUS_AUTHORITY) return 409;
  return 403;
}

export function buildSafeAllowlistResponse(
  allowlist: ResolvedSandboxActivationAllowlist,
): SafeSandboxAllowlistResponse {
  const demoA = allowlist.demoA;
  const capabilities = resolveSandboxCockpitCapabilityState();

  if (
    allowlist.allowlistResolution !== "resolved" ||
    !demoA ||
    !isVerifiedDemoAIdentityMatch({
      companyId: demoA.companyId,
      accountingConnectionId: demoA.accountingConnectionId,
      realmId: demoA.realmId,
      providerEnvironment: demoA.providerEnvironment,
      demoRole: demoA.demoRole,
    })
  ) {
    throw new Je3dActivationError(
      allowlist.allowlistResolution === "ambiguous"
        ? JE_3D_ACTIVATION_ERROR.AMBIGUOUS_AUTHORITY
        : JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
      allowlist.allowlistResolution === "ambiguous"
        ? "Sandbox activation allowlist is ambiguous; cockpit access blocked."
        : "Canonical Demo A sandbox allowlist could not be resolved.",
    );
  }

  if (demoA.realmId === SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.COMPANY_NOT_ALLOWLISTED,
      "Canadian sandbox realm is explicitly excluded from the US sandbox cockpit.",
    );
  }

  return {
    qb_environment: "sandbox",
    allowlist_resolution: allowlist.allowlistResolution,
    demo_a: {
      company_id: demoA.companyId,
      accounting_connection_id: demoA.accountingConnectionId,
      realm_id: demoA.realmId,
      provider: demoA.provider,
      provider_environment: demoA.providerEnvironment,
      demo_role: demoA.demoRole,
      firm_client_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
    },
    verified_execution_id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
    verified_provider_journal_id: "223",
    capabilities,
    memory_is_display_context_only: true,
  };
}

export async function loadPatent6ChainReceiptEvents(
  executionId: string,
  verificationReceiptId?: string | null,
): Promise<Patent6ChainReceiptEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(LEDGER_EVENTS_PATENT6_CHAIN_SELECT)
    .eq("aggregate_type", "journal_entry_execution")
    .eq("aggregate_id", executionId)
    .order("chain_index", { ascending: true, nullsFirst: false })
    .order("event_sequence", { ascending: true });
  if (error) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
      `Failed to load Patent #6 chain receipt events: ${error.message}`,
    );
  }
  const parsed = (data || []).map((row: Record<string, unknown>) =>
    parseLedgerEventPatent6ChainRow(row),
  );
  assertPatent6ChainReceiptCustody({
    executionId,
    events: parsed,
    verificationReceiptId,
  });
  return parsed.map((row: LedgerEventPatent6ChainRow) => ({
    event_id: row.event_id,
    event_type: row.event_type,
    event_hash: row.event_hash,
    previous_event_hash: row.previous_event_hash,
    chain_index: row.chain_index,
    event_sequence: row.event_sequence,
    aggregate_type: row.aggregate_type,
    aggregate_id: row.aggregate_id,
    occurred_at: row.occurred_at,
    recorded_at: row.recorded_at,
  }));
}

export async function fetchSandboxAllowlistForCockpit(
  deps?: SandboxAllowlistQueryDeps,
): Promise<SafeSandboxAllowlistResponse> {
  assertSandboxCockpitQbEnvironment();
  const allowlist = await resolveSandboxActivationAllowlist(deps);
  return buildSafeAllowlistResponse(allowlist);
}

export async function fetchSandboxInspectionForCockpit(
  executionId: string,
  deps: ActivationInspectionDeps = {},
): Promise<SafeSandboxInspectionResponse> {
  assertSandboxCockpitQbEnvironment();
  rejectCallerTransportOverrides({});

  const inspection = await inspectGovernedJeActivationCustody(executionId, deps);
  const execution = deps.loadExecution
    ? await deps.loadExecution(executionId)
    : await loadExactExecution(executionId);

  if (
    inspection.realm_id === SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED ||
    inspection.company_id !== JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId ||
    inspection.accounting_connection_id !==
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId
  ) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.COMPANY_NOT_ALLOWLISTED,
      "Execution does not bind to canonical US sandbox Demo A custody.",
    );
  }

  const chainEvents = deps.loadLedgerEvents
    ? (await deps.loadLedgerEvents(executionId)).map((event) => ({
        event_id: event.event_id,
        event_type: event.event_type,
        event_hash: null,
        previous_event_hash: null,
        chain_index: event.chain_index ?? null,
        event_sequence: event.event_sequence ?? null,
        aggregate_type: "journal_entry_execution" as const,
        aggregate_id: executionId,
        occurred_at: "",
        recorded_at: "",
      }))
    : await loadPatent6ChainReceiptEvents(
        executionId,
        inspection.verification_receipt_id,
      );

  return {
    inspection,
    canonical_identity: JE_3D_VERIFIED_DEMO_A_IDENTITY,
    verified_at: execution?.verified_at ?? null,
    patent6_chain_receipt: {
      aggregate_type: "journal_entry_execution",
      aggregate_id: executionId,
      events: chainEvents,
    },
    capabilities: resolveSandboxCockpitCapabilityState(),
    memory_is_display_context_only: true,
  };
}

export async function fetchSandboxChecklistForCockpit(
  executionId: string,
  deps: ActivationInspectionDeps = {},
): Promise<SafeSandboxChecklistResponse> {
  assertSandboxCockpitQbEnvironment();
  const allowlist = await resolveSandboxActivationAllowlist(
    deps.guardDeps?.allowlistQueryDeps,
  );
  const inspectionPayload = await fetchSandboxInspectionForCockpit(
    executionId,
    deps,
  );

  const checklist = buildJe3dPreDispatchChecklistReport({
    allowlist,
    inspection: inspectionPayload.inspection,
    qbEnvironment: process.env.QB_ENVIRONMENT ?? null,
  });

  return {
    execution_id: executionId,
    checklist,
    capabilities: resolveSandboxCockpitCapabilityState(),
    post_disabled: true,
    verify_disabled: true,
    memory_is_display_context_only: true,
  };
}
