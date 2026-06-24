import { selectEscalationTarget } from "../../role-adapter";
import type { AIPersonaId, EscalationTicketRef } from "../types";

export interface EscalationRegisterInput {
  readonly reason: string;
  readonly targetScope: "universal" | AIPersonaId;
  readonly humanFallback: { email: "mwiseman@advisacor.com"; available: true };
  readonly companyId?: string | null;
}

export interface EscalationRegistry {
  register(input: EscalationRegisterInput): EscalationTicketRef;
}

export function createEscalationRegistry(): EscalationRegistry {
  return {
    register(input: EscalationRegisterInput): EscalationTicketRef {
      const target = selectEscalationTarget({
        industryCode: "unknown",
        jurisdictionCountry: "US",
        companyId: input.companyId ?? "unknown",
      });
      const registryEntryId = target?.contactRef ?? input.humanFallback.email;
      return Object.freeze({
        registryEntryId,
        reason: input.reason,
        targetScope: input.targetScope,
        humanFallback: Object.freeze({
          email: "mwiseman@advisacor.com",
          available: true as const,
        }),
      });
    },
  };
}
