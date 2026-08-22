/**
 * JE-3B2 — Hard-disabled feature gate for governed QBO JournalEntry create.
 * Every invocation surface must refuse while governedCreateEnabled is false.
 */

export const JE_3B2_FEATURE_GATE = {
  phase: "JE-3B2" as const,
  governedCreateEnabled: false as const,
  allowLiveQboPost: false as const,
  allowMemoryWrite: false as const,
  allowWorker: false as const,
  allowGovernedAuto: false as const,
  allowProductionRoute: false as const,
} as const;

export const JE_3B2_GATE_ERROR = {
  CREATE_DISABLED: "je_3b2_governed_create_disabled",
  LIVE_POST_DISABLED: "je_3b2_live_qbo_post_disabled",
  MEMORY_DISABLED: "je_3b2_memory_write_disabled",
} as const;

export class Je3b2GateError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "Je3b2GateError";
    this.code = code;
  }
}

/** Always throws while JE-3B2 remains hard-disabled. */
export function assertJe3b2GovernedCreateEnabled(): never {
  throw new Je3b2GateError(
    JE_3B2_GATE_ERROR.CREATE_DISABLED,
    "JE-3B2 governed QBO JournalEntry create is hard-disabled. Draft-only; no production invocation.",
  );
}

export function assertJe3b2LivePostNotEnabled(): never {
  throw new Je3b2GateError(
    JE_3B2_GATE_ERROR.LIVE_POST_DISABLED,
    "JE-3B2 live QBO POST is hard-disabled.",
  );
}

export function assertJe3b2MemoryWriteNotEnabled(): never {
  throw new Je3b2GateError(
    JE_3B2_GATE_ERROR.MEMORY_DISABLED,
    "JE-3B2 must not write Memory. Memory is a JE-3C+ VERIFIED-only downstream projection.",
  );
}

export function isJe3b2GovernedCreateEnabled(): boolean {
  return Boolean(JE_3B2_FEATURE_GATE.governedCreateEnabled);
}
