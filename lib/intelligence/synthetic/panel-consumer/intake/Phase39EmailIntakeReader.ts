import type { Phase39Module12 } from "../../phase39/module-12/types";
import type { AIPersonaId } from "../types";
import type { WorkItem } from "./intake-types";
import type { WorkItemReader } from "./WorkItemReader";

export interface Phase39EmailIntakeReaderDeps {
  readonly module12: Phase39Module12;
  readonly clock: () => Date;
}

function toPersonaId(value: string | null | undefined): AIPersonaId | null {
  if (!value) {
    return null;
  }
  return value as AIPersonaId;
}

export class Phase39EmailIntakeReader implements WorkItemReader {
  readonly source = "phase39-email" as const;

  constructor(private readonly deps: Phase39EmailIntakeReaderDeps) {}

  async readNext(): Promise<WorkItem | null> {
    const msg = await this.deps.module12.peekNextIntakeMessage();
    if (!msg) {
      return null;
    }
    return Object.freeze({
      workItemId: msg.id,
      source: "phase39-email",
      receivedAt: this.deps.clock().toISOString(),
      requestedPersonaId: toPersonaId(msg.requestedPersonaId),
      requestedCapabilityId: msg.requestedCapabilityId ?? null,
      payload: Object.freeze({ ...msg.body }),
      companyId: msg.companyId ?? null,
      phase39ProvenanceRef: `phase39.module12:${msg.id}`,
    });
  }

  async ack(
    workItemId: string,
    outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed",
  ): Promise<void> {
    await this.deps.module12.ackIntakeMessage(workItemId, outcome);
  }
}
