import type { ScenarioAssertion, ScenarioContext } from "../../types";

export function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function assertTrue(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label);
  }
}

export function assertion(id: string, description: string, check: (ctx: ScenarioContext) => void): ScenarioAssertion {
  return { id, description, check };
}

export function recordFrameworkAudit(
  ctx: ScenarioContext,
  channelId: string,
  entityId: string,
  framework: string,
): void {
  ctx.auditBus.appendChannel(channelId, {
    entityId,
    framework,
    scoped: true,
  });
}
