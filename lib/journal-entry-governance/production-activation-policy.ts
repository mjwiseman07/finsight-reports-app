/**
 * Production journal-entry activation authority.
 *
 * This is intentionally separate from JE-3D sandbox activation. The checked-in
 * state is permanently fail-closed until a separately reviewed pilot identity,
 * amount ceiling, capability change, and kill-switch change are committed.
 *
 * Public enforcement always uses PRODUCTION_JE_ACTIVATION_POLICY. No runtime
 * policy override parameter is accepted on exported assert functions.
 * The canonical policy object is deeply frozen and mutation-resistant.
 */

export type ProductionJeCapability =
  | "CREATE_PRODUCTION_JE"
  | "VERIFY_PRODUCTION_JE";

export type ProductionPilotIdentity = Readonly<{
  companyId: string;
  accountingConnectionId: string;
  realmId: string;
  provider: "quickbooks";
  providerEnvironment: "production";
}>;

export type ProductionJeActivationPolicy = Readonly<{
  capabilities: Readonly<Record<ProductionJeCapability, boolean>>;
  productionDispatchKillSwitch: boolean;
  memoryProjectionAllowed: boolean;
  workerAllowed: boolean;
  governedAutoAllowed: boolean;
  requireFreshMfa: true;
  maxExecutionAmountCents: number | null;
  pilotIdentity: ProductionPilotIdentity | null;
}>;

function deepFreezeProductionActivationPolicy(
  policy: ProductionJeActivationPolicy,
): ProductionJeActivationPolicy {
  if (policy.pilotIdentity) {
    Object.freeze(policy.pilotIdentity);
  }
  Object.freeze(policy.capabilities);
  return Object.freeze(policy);
}

export const PRODUCTION_JE_ACTIVATION_POLICY: ProductionJeActivationPolicy =
  deepFreezeProductionActivationPolicy({
    capabilities: {
      CREATE_PRODUCTION_JE: false,
      VERIFY_PRODUCTION_JE: false,
    },
    productionDispatchKillSwitch: true,
    memoryProjectionAllowed: false,
    workerAllowed: false,
    governedAutoAllowed: false,
    requireFreshMfa: true,
    maxExecutionAmountCents: null,
    pilotIdentity: null,
  });

export type ProductionActivationCheck = {
  capability: ProductionJeCapability;
  companyId: string;
  accountingConnectionId: string;
  realmId: string;
  provider: string;
  providerEnvironment: string | null;
  totalDebitsCents: number;
  qboEnvironment?: string;
};

export class ProductionJeActivationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ProductionJeActivationError";
  }
}

/**
 * Public enforcement — always uses canonical PRODUCTION_JE_ACTIVATION_POLICY.
 * No caller-supplied policy override is accepted.
 */
export function assertProductionJeActivation(
  input: ProductionActivationCheck,
): void {
  const policy = PRODUCTION_JE_ACTIVATION_POLICY;
  if (!policy.capabilities[input.capability]) {
    throw new ProductionJeActivationError(
      "production_capability_off",
      `${input.capability} is disabled.`,
    );
  }
  if (input.capability === "CREATE_PRODUCTION_JE" && policy.productionDispatchKillSwitch) {
    throw new ProductionJeActivationError(
      "production_kill_switch_active",
      "Production dispatch kill switch is active.",
    );
  }
  if (input.qboEnvironment !== "production") {
    throw new ProductionJeActivationError(
      "production_environment_mismatch",
      "QB_ENVIRONMENT must be production for production JE authority.",
    );
  }
  if (policy.workerAllowed || policy.governedAutoAllowed) {
    throw new ProductionJeActivationError(
      "production_automation_forbidden",
      "Worker and governed-auto authority must remain disabled for the pilot.",
    );
  }
  if (!policy.requireFreshMfa) {
    throw new ProductionJeActivationError(
      "production_fresh_mfa_required",
      "Fresh MFA must be mandatory for production activation.",
    );
  }
  if (
    policy.maxExecutionAmountCents == null ||
    !Number.isSafeInteger(policy.maxExecutionAmountCents) ||
    policy.maxExecutionAmountCents <= 0
  ) {
    throw new ProductionJeActivationError(
      "production_amount_ceiling_missing",
      "A positive production amount ceiling is required.",
    );
  }
  if (
    !Number.isSafeInteger(input.totalDebitsCents) ||
    input.totalDebitsCents <= 0 ||
    input.totalDebitsCents > policy.maxExecutionAmountCents
  ) {
    throw new ProductionJeActivationError(
      "production_amount_outside_ceiling",
      "Execution amount is invalid or exceeds the production ceiling.",
    );
  }
  const identity = policy.pilotIdentity;
  if (!identity) {
    throw new ProductionJeActivationError(
      "production_pilot_identity_missing",
      "Exact production pilot identity is not configured.",
    );
  }
  if (
    input.companyId !== identity.companyId ||
    input.accountingConnectionId !== identity.accountingConnectionId ||
    input.realmId !== identity.realmId ||
    input.provider !== identity.provider ||
    input.providerEnvironment !== identity.providerEnvironment
  ) {
    throw new ProductionJeActivationError(
      "production_pilot_identity_mismatch",
      "Execution does not match the exact approved production pilot identity.",
    );
  }
}

/**
 * Apply production activation only when the process or custody environment is
 * production. Sandbox JE-3D remains under its own activation policy.
 * Always uses canonical PRODUCTION_JE_ACTIVATION_POLICY.
 */
export function assertProductionJeActivationWhenApplicable(
  input: ProductionActivationCheck,
): void {
  if (
    input.qboEnvironment !== "production" &&
    input.providerEnvironment !== "production"
  ) {
    return;
  }
  assertProductionJeActivation(input);
}
