/**
 * JE-3D — First controlled sandbox CREATE activation (Demo A only).
 *
 * Verified production identity — for controlled first-run staging/evidence only.
 * Not general product authority. Runtime allowlist still resolves from database.
 *
 * FULL-CYCLE CLOSED / FAIL-CLOSED STATE:
 *   CREATE_SANDBOX_JE = false
 *   VERIFY_SANDBOX_JE = false
 *   sandboxDispatchKillSwitch = true (all new provider POST dispatches blocked)
 *
 * Exact-execution binding remains mandatory: CREATE capability alone never authorizes POST.
 */

import {
  JE_3D_ACTIVATION_POLICY,
  type Je3dActivationPolicyView,
} from "./je3d-activation-policy";

/** Independently verified Demo A production identity (reconfirmed 2026-08-28). */
export const JE_3D_VERIFIED_DEMO_A_IDENTITY = {
  companyId: "aaaaaaaa-2222-4222-8222-222222222222",
  accountingConnectionId: "dfef5e96-e717-4e3e-afac-fde0de1b5b23",
  realmId: "9341457151063823",
  provider: "quickbooks",
  providerEnvironment: "sandbox",
  demoRole: "DEMO_A_GENERAL_ACCOUNTING",
  firmClientId: "aaaaaaaa-1111-4111-8111-111111111111",
  firmId: "11111111-1111-1111-1111-111111111111",
} as const;

/**
 * JE-3D first-cycle activation is closed. Both provider capabilities are
 * disabled and the dispatch kill switch is active. Reopening either capability
 * requires a separately reviewed activation change.
 */
export const JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY: Je3dActivationPolicyView =
  {
    ...JE_3D_ACTIVATION_POLICY,
    capabilities: {
      CREATE_SANDBOX_JE: false,
      VERIFY_SANDBOX_JE: false,
    },
    productionAllowed: false,
    memoryWriteAllowed: false,
    workerAllowed: false,
    governedAutoAllowed: false,
    sandboxDispatchKillSwitch: true,
  };

export function resolveJe3dActivationPolicy(): Je3dActivationPolicyView {
  return JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY;
}

export function isVerifiedDemoAIdentityMatch(args: {
  companyId: string;
  accountingConnectionId: string;
  realmId: string;
  providerEnvironment: string | null;
  demoRole: string | null;
}): boolean {
  return (
    args.companyId === JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId &&
    args.accountingConnectionId ===
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId &&
    args.realmId === JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId &&
    args.providerEnvironment ===
      JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment &&
    args.demoRole === JE_3D_VERIFIED_DEMO_A_IDENTITY.demoRole
  );
}

