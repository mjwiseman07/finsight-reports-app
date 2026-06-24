// PHASE 42.7A.4 — synchronous, in-memory projection of governance-attested
// OrgFrameworkElection records. Loaded at module init from
// sync-election-registry.json. Lookups are O(n) over a small curated list.
// This module deliberately performs NO I/O.

import registryJson from "./sync-election-registry.json";
import type { FrameworkCode, OrgFrameworkElection } from "./types";

interface EligibilityAttestation {
  noPublicAccountability: boolean;
  publishesGeneralPurposeFinancialStatements: boolean;
  attestedBy: string;
  attestedAt: string;
  citationHandle: string;
}

interface SyncElectionEntry {
  companyId: string;
  electedFramework: FrameworkCode;
  electedAt: string;
  electedBy: string;
  electionScope: OrgFrameworkElection["electionScope"];
  electionEvidenceRef: string;
  eligibilityAttestation?: EligibilityAttestation;
}

interface SyncElectionRegistryShape {
  schemaVersion: string;
  generatedBy: "human_curated";
  curatedAt: string;
  registryDoctrine: string;
  citationDoctrine: string;
  citationRefs: Record<string, string>;
  elections: SyncElectionEntry[];
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function validateEntry(entry: SyncElectionEntry, idx: number): void {
  if (!entry.companyId || typeof entry.companyId !== "string") {
    throw new Error(`syncElectionRegistry[${idx}]: companyId required`);
  }
  if (!entry.electedFramework) {
    throw new Error(`syncElectionRegistry[${idx}]: electedFramework required`);
  }
  if (!ISO_8601.test(entry.electedAt)) {
    throw new Error(`syncElectionRegistry[${idx}]: electedAt must be ISO-8601 UTC`);
  }
  if (!entry.electedBy || typeof entry.electedBy !== "string") {
    throw new Error(`syncElectionRegistry[${idx}]: electedBy required`);
  }
  if (!["company", "entity", "consolidation_group"].includes(entry.electionScope)) {
    throw new Error(`syncElectionRegistry[${idx}]: invalid electionScope`);
  }
  if (!entry.electionEvidenceRef || typeof entry.electionEvidenceRef !== "string") {
    throw new Error(
      `syncElectionRegistry[${idx}]: electionEvidenceRef required (Phase 40 governance handle)`,
    );
  }
  if (entry.electedFramework === "IFRS_SME") {
    const attestation = entry.eligibilityAttestation;
    if (!attestation) {
      throw new Error(
        `syncElectionRegistry[${idx}]: IFRS_SME election requires eligibilityAttestation (IFRS for SMEs S1)`,
      );
    }
    if (!attestation.noPublicAccountability) {
      throw new Error(
        `syncElectionRegistry[${idx}]: IFRS_SME ineligible — entity must not have public accountability (IFRS for SMEs S1.2(a), S1.5)`,
      );
    }
    if (!attestation.publishesGeneralPurposeFinancialStatements) {
      throw new Error(
        `syncElectionRegistry[${idx}]: IFRS_SME ineligible — entity must publish general-purpose FS (IFRS for SMEs S1.2(b))`,
      );
    }
    if (!ISO_8601.test(attestation.attestedAt)) {
      throw new Error(
        `syncElectionRegistry[${idx}]: eligibilityAttestation.attestedAt must be ISO-8601 UTC`,
      );
    }
    if (attestation.citationHandle !== "IFRS_FOR_SMES_S1") {
      throw new Error(
        `syncElectionRegistry[${idx}]: IFRS_SME eligibility must cite IFRS_FOR_SMES_S1`,
      );
    }
  }
}

function loadRegistry(): Map<string, SyncElectionEntry> {
  const raw = registryJson as SyncElectionRegistryShape;
  if (raw.generatedBy !== "human_curated") {
    throw new Error(
      `syncElectionRegistry: generatedBy must be "human_curated"; got "${raw.generatedBy}"`,
    );
  }
  if (!Array.isArray(raw.elections)) {
    throw new Error("syncElectionRegistry: elections must be an array");
  }
  const byCompany = new Map<string, SyncElectionEntry>();
  raw.elections.forEach((entry, idx) => {
    validateEntry(entry, idx);
    if (byCompany.has(entry.companyId)) {
      throw new Error(
        `syncElectionRegistry[${idx}]: duplicate companyId "${entry.companyId}" — sync registry must have at most one active election per company`,
      );
    }
    byCompany.set(entry.companyId, entry);
  });
  return byCompany;
}

const REGISTRY: Map<string, SyncElectionEntry> = loadRegistry();

export function lookupSyncElection(
  companyId: string | undefined,
): OrgFrameworkElection | null {
  if (!companyId) {
    return null;
  }
  const entry = REGISTRY.get(companyId);
  if (!entry) {
    return null;
  }
  return {
    electedFramework: entry.electedFramework,
    electedAt: entry.electedAt,
    electedBy: entry.electedBy,
    electionScope: entry.electionScope,
    electionEvidenceRef: entry.electionEvidenceRef,
  };
}

export function getSyncRegistrySize(): number {
  return REGISTRY.size;
}

export const __testOnly = { validateEntry };
