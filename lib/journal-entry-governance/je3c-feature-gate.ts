/**
 * JE-3C — Hard-disabled feature gate for exact QBO JournalEntry read-back verification.
 * Every invocation surface must refuse while verificationEnabled is false.
 */

export const JE_3C_FEATURE_GATE = {
  phase: "JE-3C" as const,
  verificationEnabled: false as const,
  allowLiveQboGet: false as const,
  allowMemoryWrite: false as const,
  allowWorker: false as const,
  allowGovernedAuto: false as const,
  allowProductionRoute: false as const,
} as const;

export const JE_3C_GATE_ERROR = {
  VERIFICATION_DISABLED: "je_3c_verification_disabled",
  LIVE_GET_DISABLED: "je_3c_live_qbo_get_disabled",
  MEMORY_DISABLED: "je_3c_memory_write_disabled",
} as const;

export class Je3cGateError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "Je3cGateError";
    this.code = code;
  }
}

/** Always throws while JE-3C remains hard-disabled. */
export function assertJe3cVerificationEnabled(): never {
  throw new Je3cGateError(
    JE_3C_GATE_ERROR.VERIFICATION_DISABLED,
    "JE-3C exact QBO JournalEntry verification is hard-disabled. Draft-only; no production invocation.",
  );
}

export function assertJe3cLiveGetNotEnabled(): never {
  throw new Je3cGateError(
    JE_3C_GATE_ERROR.LIVE_GET_DISABLED,
    "JE-3C live QBO GET verification is hard-disabled.",
  );
}

export function assertJe3cMemoryWriteNotEnabled(): never {
  throw new Je3cGateError(
    JE_3C_GATE_ERROR.MEMORY_DISABLED,
    "JE-3C must not write Memory in this PR. Memory is a VERIFIED-only downstream projection/outbox.",
  );
}

export function isJe3cVerificationEnabled(): boolean {
  return Boolean(JE_3C_FEATURE_GATE.verificationEnabled);
}
