import type { Phase39Module10 } from "../../phase39/module-10/types";
import type { AIPersonaId } from "../types";
import type { WorkItem } from "./intake-types";
import type { WorkItemReader } from "./WorkItemReader";

export interface DashboardTaskQueueReaderDeps {
  readonly module10: Phase39Module10;
  readonly clock: () => Date;
}

function toPersonaId(value: string | null | undefined): AIPersonaId | null {
  if (!value) {
    return null;
  }
  return value as AIPersonaId;
}

export class DashboardTaskQueueReader implements WorkItemReader {
  readonly source = "phase39-dashboard-queue" as const;

  constructor(private readonly deps: DashboardTaskQueueReaderDeps) {}

  async readNext(): Promise<WorkItem | null> {
    const task = await this.deps.module10.peekNextQueueTask();
    if (!task) {
      return null;
    }
    return Object.freeze({
      workItemId: task.id,
      source: "phase39-dashboard-queue",
      receivedAt: this.deps.clock().toISOString(),
      requestedPersonaId: toPersonaId(task.requestedPersonaId),
      requestedCapabilityId: task.requestedCapabilityId ?? null,
      payload: Object.freeze({ ...task.body }),
      companyId: task.companyId ?? null,
      phase39ProvenanceRef: `phase39.module10:${task.id}`,
    });
  }

  async ack(
    workItemId: string,
    outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed",
  ): Promise<void> {
    await this.deps.module10.ackQueueTask(workItemId, outcome);
  }
}
