import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import type { SyntheticSnapshotRetrievalConsumer } from "../types";

export interface ResolveSupersededChainInput {
  snapshots: SyntheticHistoricalSnapshotRecord[];
  companyId: string;
  snapshotId: string;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
}

export interface ResolveSupersededChainResult {
  status: "resolved" | "missing_start" | "company_scope_violation" | "cycle_detected";
  startSnapshot?: SyntheticHistoricalSnapshotRecord;
  backwardChain: SyntheticHistoricalSnapshotRecord[];
  forwardChain: SyntheticHistoricalSnapshotRecord[];
  supersededSnapshotIds: string[];
  retrievalDeterminismHash: string;
}

function supersedesSnapshotId(snapshot: SyntheticHistoricalSnapshotRecord) {
  return snapshot.snapshotAudit.supersedesSnapshotId;
}

function supersededBySnapshotId(snapshot: SyntheticHistoricalSnapshotRecord) {
  return snapshot.supersededBySnapshotId || snapshot.snapshotAudit.supersededBySnapshotId;
}

function assertSameCompany(snapshot: SyntheticHistoricalSnapshotRecord | undefined, companyId: string) {
  return !snapshot || snapshot.companyId === companyId;
}

function traverseChain(input: {
  start: SyntheticHistoricalSnapshotRecord;
  byId: Map<string, SyntheticHistoricalSnapshotRecord>;
  companyId: string;
  direction: "backward" | "forward";
}) {
  const chain: SyntheticHistoricalSnapshotRecord[] = [];
  const visited = new Set([input.start.snapshotId]);
  let current: SyntheticHistoricalSnapshotRecord | undefined = input.start;

  while (current) {
    const nextId = input.direction === "backward" ? supersedesSnapshotId(current) : supersededBySnapshotId(current);
    if (!nextId) break;
    if (visited.has(nextId)) return { chain, status: "cycle_detected" as const };
    const next = input.byId.get(nextId);
    if (!next) break;
    if (!assertSameCompany(next, input.companyId)) return { chain, status: "company_scope_violation" as const };
    chain.push(next);
    visited.add(next.snapshotId);
    current = next;
  }

  return { chain, status: "resolved" as const };
}

export function resolveSupersededChain(input: ResolveSupersededChainInput): ResolveSupersededChainResult {
  const byId = new Map(input.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
  const startSnapshot = byId.get(input.snapshotId);

  if (!startSnapshot) {
    return {
      status: "missing_start",
      backwardChain: [],
      forwardChain: [],
      supersededSnapshotIds: [],
      retrievalDeterminismHash: stableSnapshotHash({
        resolver: "resolveSupersededChain",
        companyId: input.companyId,
        snapshotId: input.snapshotId,
        retrievalConsumer: input.retrievalConsumer,
        error: "missing_start",
      }),
    };
  }

  if (!assertSameCompany(startSnapshot, input.companyId)) {
    return {
      status: "company_scope_violation",
      startSnapshot,
      backwardChain: [],
      forwardChain: [],
      supersededSnapshotIds: [],
      retrievalDeterminismHash: stableSnapshotHash({
        resolver: "resolveSupersededChain",
        companyId: input.companyId,
        snapshotId: input.snapshotId,
        retrievalConsumer: input.retrievalConsumer,
        error: "company_scope_violation",
      }),
    };
  }

  const backward = traverseChain({ start: startSnapshot, byId, companyId: input.companyId, direction: "backward" });
  const forward = traverseChain({ start: startSnapshot, byId, companyId: input.companyId, direction: "forward" });
  const status = backward.status !== "resolved" ? backward.status : forward.status;
  const supersededSnapshotIds = [...backward.chain, startSnapshot, ...forward.chain]
    .filter((snapshot) => snapshot.snapshotStatus === "superseded" || Boolean(supersededBySnapshotId(snapshot)))
    .map((snapshot) => snapshot.snapshotId);

  return {
    status,
    startSnapshot,
    backwardChain: backward.chain,
    forwardChain: forward.chain,
    supersededSnapshotIds,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "resolveSupersededChain",
      companyId: input.companyId,
      snapshotId: input.snapshotId,
      retrievalConsumer: input.retrievalConsumer,
      backwardSnapshotIds: backward.chain.map((snapshot) => snapshot.snapshotId),
      forwardSnapshotIds: forward.chain.map((snapshot) => snapshot.snapshotId),
      status,
    }),
  };
}
