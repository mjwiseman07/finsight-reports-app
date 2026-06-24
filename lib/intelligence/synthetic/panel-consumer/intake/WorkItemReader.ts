import type { WorkItem } from "./intake-types";

export interface WorkItemReader {
  readonly source: WorkItem["source"];
  readNext(): Promise<WorkItem | null>;
  ack(
    workItemId: string,
    outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed",
  ): Promise<void>;
}
