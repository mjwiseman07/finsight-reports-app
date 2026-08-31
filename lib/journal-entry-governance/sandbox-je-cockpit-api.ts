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

export { Je3dActivationError };
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
  type GovernedJeActivationInspection,
  type ActivationInspectionDeps,
} from "./je3d-activation-inspection";
import { buildJe3dPreDispatchChecklistReport } from "./je3d-pre-dispatch-checklist";
import { loadExactExecution } from "./provider-attempt-service";

export const SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY = "governed-sandbox-je-cockpit";

export const SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID =
  "08bbbd62-8c4e-4463-b96e-2bd8bfdce603";

export const SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID = "223";

/** Explicitly excluded Canadian sandbox realm — never canonical Demo A. */
export const SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED = "9341457539236929";

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

export type Patent6ChainReceiptEvent = {
  event_id: string;
  event_type: string;
  event_hash: string | null;
  previous_event_hash: string | null;
  chain_index: number | null;
  aggregate_type: string | null;
  aggregate_id: string | null;
  created_at: string;
};

export type SandboxCockpitCapabilityState = {
  create_sandbox_je: boolean;
  verify_sandbox_je: boolean;
  memory: boolean;
  worker: boolean;
  governed_auto: boolean;
  kill_switch: boolean;
  post_disabled: true;
  verify_disabled: true;
};

export type SafeSandboxAllowlistResponse = {
  qb_environment: "sandbox";
  allowlist_resolution: ResolvedSandboxActivationAllowlist["allowlistResolution"];
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
  checklist: ReturnType<typeof buildJe3dPreDispatchChecklistReport>;
  capabilities: SandboxCockpitCapabilityState;
  post_disabled: true;
  verify_disabled: true;
  memory_is_display_context_only: true;
};

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
    kill_switch: policy.sandboxDispatchKillSwitch,
    post_disabled: true,
    verify_disabled: true,
  };
}

export function mapJe3dActivationErrorToHttpStatus(code: string): number {
  if (code === JE_3D_ACTIVATION_ERROR.AMBIGUOUS_AUTHORITY) return 409;
  if (
    code === JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED ||
    code === JE_3D_ACTIVATION_ERROR.COMPANY_NOT_ALLOWLISTED ||
    code === JE_3D_ACTIVATION_ERROR.CONNECTION_NOT_CANONICAL ||
    code === JE_3D_ACTIVATION_ERROR.REALM_MISMATCH ||
    code === JE_3D_ACTIVATION_ERROR.CALLER_OVERRIDE_FORBIDDEN
  ) {
    return 403;
  }
  if (
    code === JE_3D_ACTIVATION_ERROR.SANDBOX_ENV_REQUIRED ||
    code === JE_3D_ACTIVATION_ERROR.PRODUCTION_ENV_FORBIDDEN ||
    code === JE_3D_ACTIVATION_ERROR.INVALID_QB_ENVIRONMENT
  ) {
    return 403;
  }
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
    verified_provider_journal_id: SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
    capabilities,
    memory_is_display_context_only: true,
  };
}

export async function loadPatent6ChainReceiptEvents(
  executionId: string,
): Promise<Patent6ChainReceiptEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(
      "event_id, event_type, event_hash, previous_event_hash, chain_index, aggregate_type, aggregate_id, created_at",
    )
    .eq("aggregate_type", "journal_entry_execution")
    .eq("aggregate_id", executionId)
    .order("chain_index", { ascending: true });
  if (error) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
      `Failed to load Patent #6 chain receipt events: ${error.message}`,
    );
  }
  return (data || []).map((row: Record<string, unknown>) => ({
    event_id: String(row.event_id),
    event_type: String(row.event_type),
    event_hash: row.event_hash ? String(row.event_hash) : null,
    previous_event_hash: row.previous_event_hash
      ? String(row.previous_event_hash)
      : null,
    chain_index: row.chain_index == null ? null : Number(row.chain_index),
    aggregate_type: row.aggregate_type ? String(row.aggregate_type) : null,
    aggregate_id: row.aggregate_id ? String(row.aggregate_id) : null,
    created_at: String(row.created_at),
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
        chain_index: null,
        aggregate_type: "journal_entry_execution" as const,
        aggregate_id: executionId,
        created_at: event.created_at,
      }))
    : await loadPatent6ChainReceiptEvents(executionId);

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
