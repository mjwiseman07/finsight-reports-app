/**
 * LOCK-VC C5 — per-vertical state serializers (encryption-at-rest via 42.7E framework).
 */
import type { MemoryFrameworkState } from "./persistence-schema";
import { MEMORY_FRAMEWORK_PERSISTENCE_SCHEMA } from "./persistence-schema";

export function serializeMemoryFrameworkState(state: MemoryFrameworkState): string {
  return JSON.stringify(state);
}

export function deserializeMemoryFrameworkState(payload: string): MemoryFrameworkState {
  const parsed = JSON.parse(payload) as MemoryFrameworkState;
  if (!parsed.verticalState) {
    throw new Error("MemoryFrameworkState.verticalState required");
  }
  return Object.freeze(parsed);
}

export function createEmptyMemoryFrameworkState(): MemoryFrameworkState {
  return Object.freeze({
    verticalState: Object.freeze({}),
  });
}

export function roundTripMemoryFrameworkState(
  state: MemoryFrameworkState = MEMORY_FRAMEWORK_PERSISTENCE_SCHEMA,
): MemoryFrameworkState {
  return deserializeMemoryFrameworkState(serializeMemoryFrameworkState(state));
}
