import type { AttestedElection, FrameworkId } from "../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";

export interface RegistryElectionEntry {
  readonly orgId: string;
  readonly entityId: string;
  readonly framework: FrameworkId;
  readonly vertical: string;
  readonly electionEvidenceRef: string;
}

export interface IsolatedRegistrySnapshot {
  readonly snapshotId: string;
  readonly elections: readonly RegistryElectionEntry[];
  getFramework(orgId: string, entityId: string): FrameworkId | null;
  setElection(entry: RegistryElectionEntry): void;
  clone(): IsolatedRegistrySnapshot;
}

let snapshotCounter = 0;

export function createIsolatedRegistry(
  seed: readonly RegistryElectionEntry[] = [],
): IsolatedRegistrySnapshot {
  snapshotCounter += 1;
  const elections = new Map<string, RegistryElectionEntry>();

  const key = (orgId: string, entityId: string): string => `${orgId}::${entityId}`;

  for (const entry of seed) {
    elections.set(key(entry.orgId, entry.entityId), Object.freeze({ ...entry }));
  }

  const snapshot: IsolatedRegistrySnapshot = {
    snapshotId: `registry-snap-${snapshotCounter}`,
    get elections() {
      return Object.freeze([...elections.values()]);
    },
    getFramework(orgId: string, entityId: string): FrameworkId | null {
      return elections.get(key(orgId, entityId))?.framework ?? null;
    },
    setElection(entry: RegistryElectionEntry): void {
      elections.set(key(entry.orgId, entry.entityId), Object.freeze({ ...entry }));
    },
    clone(): IsolatedRegistrySnapshot {
      return createIsolatedRegistry([...elections.values()]);
    },
  };

  return snapshot;
}
