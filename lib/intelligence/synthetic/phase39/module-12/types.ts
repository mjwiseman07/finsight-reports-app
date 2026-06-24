/** Phase 39 module 12 — email intake interface (LOCK entry point; no roles/ edits). */

export interface Phase39IntakeMessage {
  readonly id: string;
  readonly requestedPersonaId?: string | null;
  readonly requestedCapabilityId?: string | null;
  readonly body: Readonly<Record<string, unknown>>;
  readonly companyId?: string | null;
}

export interface Phase39Module12 {
  peekNextIntakeMessage(): Promise<Phase39IntakeMessage | null>;
  ackIntakeMessage(
    workItemId: string,
    outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed",
  ): Promise<void>;
}
