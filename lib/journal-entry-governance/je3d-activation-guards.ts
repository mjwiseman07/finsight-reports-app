/**
 * JE-3D — Controlled sandbox activation guards.
 * Gates public create/verify wiring without flipping JE-3B2/JE-3C compile-time gates.
 */

import {
  JE_3D_ACTIVATION_ERROR,
  JE_3D_ACTIVATION_POLICY,
  Je3dActivationError,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
  type Je3dActivationPolicyView,
} from "./je3d-activation-policy";
import {
  assertJe3dSandboxQboEnvironment,
  rejectCallerTransportOverrides,
} from "./je3d-sandbox-environment";
import {
  assertExecutionOnAllowlistedSandbox,
  assertTokenRealmMatchesConnection,
  resolveSandboxActivationAllowlist,
  type ResolvedSandboxActivationAllowlist,
  type SandboxAllowlistQueryDeps,
} from "./je3d-sandbox-company-authority";
import type { JournalEntryExecutionRow } from "./execution-types";

export type Je3dActivationGuardDeps = {
  resolveAllowlist?: (
    deps?: SandboxAllowlistQueryDeps,
  ) => Promise<ResolvedSandboxActivationAllowlist>;
  allowlistQueryDeps?: SandboxAllowlistQueryDeps;
};

function assertKillSwitchOff(
  policy: Je3dActivationPolicyView = JE_3D_ACTIVATION_POLICY,
): void {
  if (policy.sandboxDispatchKillSwitch) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.KILL_SWITCH_ACTIVE,
      "Sandbox dispatch kill switch is active; new provider POST dispatches are blocked.",
    );
  }
}

export function assertJe3dCreateActivationPolicy(
  policy: Je3dActivationPolicyView = JE_3D_ACTIVATION_POLICY,
): void {
  if (!isJe3dCreateCapabilityEnabled(policy)) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.CREATE_CAPABILITY_OFF,
      "CREATE_SANDBOX_JE capability is disabled.",
    );
  }
  assertKillSwitchOff(policy);
  assertJe3dSandboxQboEnvironment();
}

export function assertJe3dVerifyActivationPolicy(
  policy: Je3dActivationPolicyView = JE_3D_ACTIVATION_POLICY,
): void {
  if (!isJe3dVerifyCapabilityEnabled(policy)) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.VERIFY_CAPABILITY_OFF,
      "VERIFY_SANDBOX_JE capability is disabled.",
    );
  }
  assertJe3dSandboxQboEnvironment();
}

export async function assertJe3dSandboxExecutionCustody(args: {
  execution: JournalEntryExecutionRow;
  tokenRealmId?: string;
  connectionRealmId?: string;
  guardDeps?: Je3dActivationGuardDeps;
  policy?: Je3dActivationPolicyView;
}): Promise<ResolvedSandboxActivationAllowlist> {
  rejectCallerTransportOverrides({});
  assertJe3dSandboxQboEnvironment();
  const resolveAllowlist =
    args.guardDeps?.resolveAllowlist ?? resolveSandboxActivationAllowlist;
  const allowlist = await resolveAllowlist(args.guardDeps?.allowlistQueryDeps);
  if (!allowlist.demoA || allowlist.allowedCompanyIds.length === 0) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.ALLOWLIST_UNRESOLVED,
      "No authoritative sandbox Demo A company/connection could be resolved from database authority.",
    );
  }
  assertExecutionOnAllowlistedSandbox({
    executionCompanyId: args.execution.company_id,
    executionConnectionId: args.execution.accounting_connection_id,
    allowlist,
  });
  if (args.tokenRealmId && args.connectionRealmId) {
    assertTokenRealmMatchesConnection({
      tokenRealmId: args.tokenRealmId,
      connectionRealmId: args.connectionRealmId,
    });
  }
  if (args.policy?.productionAllowed) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.PRODUCTION_ENV_FORBIDDEN,
      "Production activation is forbidden.",
    );
  }
  return allowlist;
}

/** Inspection / recovery / verification may run under kill switch; still sandbox-only. */
export async function assertJe3dSandboxInspectionCustody(args: {
  execution: JournalEntryExecutionRow;
  guardDeps?: Je3dActivationGuardDeps;
}): Promise<ResolvedSandboxActivationAllowlist> {
  rejectCallerTransportOverrides({});
  assertJe3dSandboxQboEnvironment();
  const resolveAllowlist =
    args.guardDeps?.resolveAllowlist ?? resolveSandboxActivationAllowlist;
  const allowlist = await resolveAllowlist(args.guardDeps?.allowlistQueryDeps);
  assertExecutionOnAllowlistedSandbox({
    executionCompanyId: args.execution.company_id,
    executionConnectionId: args.execution.accounting_connection_id,
    allowlist,
  });
  return allowlist;
}
