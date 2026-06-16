import {
  buildRoleDashboard,
  type BuildRoleDashboardInput,
  type SyntheticRoleDashboard,
} from "./buildRoleDashboard";
import {
  buildRoleTaskQueue,
  type BuildRoleTaskQueueInput,
  type SyntheticRoleTaskQueue,
} from "./buildRoleTaskQueue";

export interface BuildRoleDashboardsInput {
  dashboards: BuildRoleDashboardInput[];
  taskQueues?: BuildRoleTaskQueueInput[];
}

export interface BuildRoleDashboardsResult {
  dashboards: SyntheticRoleDashboard[];
  taskQueues: SyntheticRoleTaskQueue[];
  skippedIndexes: number[];
  taskQueueSkippedIndexes: number[];
  warnings: string[];
}

export function buildRoleDashboards(input: BuildRoleDashboardsInput): BuildRoleDashboardsResult {
  const dashboards: SyntheticRoleDashboard[] = [];
  const taskQueues: SyntheticRoleTaskQueue[] = [];
  const skippedIndexes: number[] = [];
  const taskQueueSkippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.dashboards.forEach((item, index) => {
    const result = buildRoleDashboard(item);

    if (result.dashboard) {
      dashboards.push(result.dashboard);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `dashboards[${index}]: ${warning}`));
  });

  (input.taskQueues ?? []).forEach((item, index) => {
    const result = buildRoleTaskQueue(item);

    if (result.taskQueue) {
      taskQueues.push(result.taskQueue);
    }

    if (result.skipped) {
      taskQueueSkippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `taskQueues[${index}]: ${warning}`));
  });

  return {
    dashboards,
    taskQueues,
    skippedIndexes,
    taskQueueSkippedIndexes,
    warnings,
  };
}
