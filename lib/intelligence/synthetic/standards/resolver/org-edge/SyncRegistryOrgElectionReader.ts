import * as fs from "node:fs";
import * as path from "node:path";
import type { AttestedElection } from "./types";
import { OrgElectionRegistryUnavailableError } from "./types";
import type { OrgElectionReader } from "./OrgElectionReader";
import {
  citationHandleForFramework,
  frameworkIdFromRegistryValue,
  validateSyncElectionRegistryDocument,
} from "./registry-validator";

export interface SyncRegistryOrgElectionReaderDeps {
  readonly registryPath: string;
  readonly validateRegistrySchema: (parsed: unknown) => void;
  readonly logger?: { warn(msg: string): void; info(msg: string): void };
}

interface RegistryElectionEntry {
  companyId: string;
  electedFramework: string;
  electedAt: string;
  electedBy: string;
  electionEvidenceRef: string;
  eligibilityAttestation?: {
    citationHandle: string;
  };
}

export class SyncRegistryOrgElectionReader implements OrgElectionReader {
  private readonly index: ReadonlyMap<string, AttestedElection>;
  private readonly available: boolean;

  constructor(private readonly deps: SyncRegistryOrgElectionReaderDeps) {
    let raw: string;
    try {
      raw = fs.readFileSync(deps.registryPath, "utf-8");
    } catch (error) {
      throw new OrgElectionRegistryUnavailableError(
        `cannot read ${deps.registryPath}: ${(error as Error).message}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new OrgElectionRegistryUnavailableError(
        `invalid JSON in ${deps.registryPath}: ${(error as Error).message}`,
      );
    }

    deps.validateRegistrySchema(parsed);

    const registry = parsed as {
      schemaVersion: string;
      elections: RegistryElectionEntry[];
    };
    const map = new Map<string, AttestedElection>();
    for (const entry of registry.elections) {
      if (map.has(entry.companyId)) {
        throw new OrgElectionRegistryUnavailableError(`duplicate orgId in registry: ${entry.companyId}`);
      }
      const framework = frameworkIdFromRegistryValue(entry.electedFramework);
      map.set(
        entry.companyId,
        Object.freeze({
          orgId: entry.companyId,
          framework,
          citationHandle: citationHandleForFramework(framework, entry.eligibilityAttestation),
          attestedBy: entry.electedBy,
          attestedAt: entry.electedAt,
          attestationVersion: registry.schemaVersion,
          note: entry.electionEvidenceRef,
        }),
      );
    }

    this.index = map;
    this.available = true;
    deps.logger?.info(
      `OrgElectionReader: loaded ${map.size} attested elections from ${path.basename(deps.registryPath)}`,
    );
  }

  read(orgId: string): AttestedElection | null {
    return this.index.get(orgId) ?? null;
  }

  isAvailable(): boolean {
    return this.available;
  }
}
