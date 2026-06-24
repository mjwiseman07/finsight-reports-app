/** Phase 39 module 10 — dashboard task queue interface (LOCK entry point; no roles/ edits). */

export interface Phase39QueueTask {
  readonly id: string;
  readonly requestedPersonaId?: string | null;
  readonly requestedCapabilityId?: string | null;
  readonly body: Readonly<Record<string, unknown>>;
  readonly companyId?: string | null;
}

export interface Phase39Module10 {
  peekNextQueueTask(): Promise<Phase39QueueTask | null>;
  ackQueueTask(
    workItemId: string,
    outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed",
  ): Promise<void>;
}
