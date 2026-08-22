/**
 * JE-3D — Controlled sandbox activation policy.
 *
 * Two-key activation: CREATE_SANDBOX_JE and VERIFY_SANDBOX_JE are independent.
 * Defaults deny everything. No env var broadens company scope.
 *
 * This does NOT replace JE-3B2 / JE-3C compile-time gates — those remain false.
 * Public services consult this policy before wiring orchestration.
 */

export const JE_3D_ACTIVATION_MODE = "CONTROLLED_SANDBOX" as const;

export type Je3dActivationCapability =
  | "CREATE_SANDBOX_JE"
  | "VERIFY_SANDBOX_JE";

/**
 * Authoritative activation policy. Capabilities default OFF.
 * `allowedCompanyIds` is populated only after authoritative DB resolution —
 * never from caller input or environment variables.
 */
export const JE_3D_ACTIVATION_POLICY = {
  mode: JE_3D_ACTIVATION_MODE,
  /** Independent two-key capabilities — both default OFF. */
  capabilities: {
    CREATE_SANDBOX_JE: false as const,
    VERIFY_SANDBOX_JE: false as const,
  },
  governedCreateAllowed: false as const,
  verificationAllowed: false as const,
  /** Default-deny until resolved from database authority. */
  allowedCompanyIds: [] as readonly string[],
  /** Canonical sandbox connection bound after DB resolution (null until resolved). */
  canonicalSandboxConnectionId: null as string | null,
  maxProviderPostsPerActivation: 1 as const,
  memoryWriteAllowed: false as const,
  workerAllowed: false as const,
  governedAutoAllowed: false as const,
  productionAllowed: false as const,
  /**
   * Kill switch: when true, blocks new provider dispatches (create POST).
   * Does NOT block inspection, UNKNOWN_COMMIT discovery, or verification GET.
   */
  sandboxDispatchKillSwitch: false as const,
} as const;

export const JE_3D_ACTIVATION_ERROR = {
  ACTIVATION_DISABLED: "je_3d_activation_disabled",
  CREATE_CAPABILITY_OFF: "je_3d_create_capability_off",
  VERIFY_CAPABILITY_OFF: "je_3d_verify_capability_off",
  KILL_SWITCH_ACTIVE: "je_3d_sandbox_dispatch_kill_switch",
  SANDBOX_ENV_REQUIRED: "je_3d_sandbox_env_required",
  PRODUCTION_ENV_FORBIDDEN: "je_3d_production_env_forbidden",
  INVALID_QB_ENVIRONMENT: "je_3d_invalid_qb_environment",
  COMPANY_NOT_ALLOWLISTED: "je_3d_company_not_allowlisted",
  CONNECTION_NOT_CANONICAL: "je_3d_connection_not_canonical",
  REALM_MISMATCH: "je_3d_realm_mismatch",
  CALLER_OVERRIDE_FORBIDDEN: "je_3d_caller_override_forbidden",
  ALLOWLIST_UNRESOLVED: "je_3d_allowlist_unresolved",
  MEMORY_WRITE_FORBIDDEN: "je_3d_memory_write_forbidden",
} as const;

export const JE_3D_SANDBOX_QBO_API_BASE =
  "https://sandbox-quickbooks.api.intuit.com" as const;

export class Je3dActivationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "Je3dActivationError";
    this.code = code;
  }
}

export type Je3dActivationPolicyView = {
  mode: typeof JE_3D_ACTIVATION_MODE;
  capabilities: {
    CREATE_SANDBOX_JE: boolean;
    VERIFY_SANDBOX_JE: boolean;
  };
  governedCreateAllowed: boolean;
  verificationAllowed: boolean;
  allowedCompanyIds: readonly string[];
  canonicalSandboxConnectionId: string | null;
  maxProviderPostsPerActivation: number;
  memoryWriteAllowed: boolean;
  workerAllowed: boolean;
  governedAutoAllowed: boolean;
  productionAllowed: boolean;
  sandboxDispatchKillSwitch: boolean;
};

export function isJe3dCreateCapabilityEnabled(
  policy: Je3dActivationPolicyView = JE_3D_ACTIVATION_POLICY,
): boolean {
  return Boolean(policy.capabilities.CREATE_SANDBOX_JE);
}

export function isJe3dVerifyCapabilityEnabled(
  policy: Je3dActivationPolicyView = JE_3D_ACTIVATION_POLICY,
): boolean {
  return Boolean(policy.capabilities.VERIFY_SANDBOX_JE);
}

export function assertJe3dMemoryWriteNotEnabled(): never {
  throw new Je3dActivationError(
    JE_3D_ACTIVATION_ERROR.MEMORY_WRITE_FORBIDDEN,
    "JE-3D controlled sandbox activation does not write Advisacor Memory.",
  );
}
