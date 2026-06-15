import {
  buildRoleExecutionAuditLog,
  type BuildRoleExecutionAuditLogInput,
  type SyntheticRoleExecutionAuditLog,
} from "./buildRoleExecutionAuditLog";

export interface BuildRoleExecutionAuditLogsInput {
  items: BuildRoleExecutionAuditLogInput[];
}

export interface BuildRoleExecutionAuditLogsResult {
  roleExecutionAuditLogs: SyntheticRoleExecutionAuditLog[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRoleExecutionAuditLogs(
  input: BuildRoleExecutionAuditLogsInput,
): BuildRoleExecutionAuditLogsResult {
  const roleExecutionAuditLogs: SyntheticRoleExecutionAuditLog[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildRoleExecutionAuditLog(item);

    if (result.roleExecutionAuditLog) {
      roleExecutionAuditLogs.push(result.roleExecutionAuditLog);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `roleExecutionAuditLogs[${index}]: ${warning}`));
  });

  return {
    roleExecutionAuditLogs,
    skippedIndexes,
    warnings,
  };
}
