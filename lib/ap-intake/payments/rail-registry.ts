/**
 * Phase D6.5 Part 2 — Block 8a — Rail Adapter Registry.
 */
import type { FanoutOutcome, Rail } from "./types";

export interface RailAttemptInput {
  batch_id: string;
  batch_line_id: string;
  firm_id: string;
  firm_client_id: string;
  vendor_id: string;
  vendor_bank_account_id: string;
  amount_cents: number;
  memo: string | null;
}

export interface RailAttemptResult {
  outcome: FanoutOutcome;
  external_reference: string | null;
  adapter_version: string;
  raw_adapter_payload: Record<string, unknown>;
}

export interface RailAdapter {
  rail: Rail;
  version: string;
  attempt(input: RailAttemptInput): Promise<RailAttemptResult>;
  record(
    input: RailAttemptInput & {
      external_reference: string;
      outcome: FanoutOutcome;
    },
  ): Promise<RailAttemptResult>;
}

const registry = new Map<Rail, RailAdapter>();

export function registerRail(adapter: RailAdapter): void {
  registry.set(adapter.rail, adapter);
}

export function getRail(rail: Rail): RailAdapter {
  const a = registry.get(rail);
  if (!a) throw new Error(`no_rail_adapter_registered:${rail}`);
  return a;
}

export function listRegisteredRails(): Rail[] {
  return Array.from(registry.keys());
}

export function _resetRailRegistryForTesting(): void {
  registry.clear();
}
