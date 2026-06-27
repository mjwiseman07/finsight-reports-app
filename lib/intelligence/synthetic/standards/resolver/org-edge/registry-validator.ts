import type { CitationHandle, FrameworkId } from "./types";

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

interface EligibilityAttestation {
  noPublicAccountability: boolean;
  publishesGeneralPurposeFinancialStatements: boolean;
  attestedBy: string;
  attestedAt: string;
  citationHandle: string;
}

interface RegistryElectionEntry {
  companyId: string;
  electedFramework: string;
  electedAt: string;
  electedBy: string;
  electionScope: string;
  electionEvidenceRef: string;
  eligibilityAttestation?: EligibilityAttestation;
}

interface RegistryShape {
  schemaVersion: string;
  generatedBy: string;
  elections: RegistryElectionEntry[];
}

const FRAMEWORK_TO_CITATION: Record<FrameworkId, CitationHandle> = {
  US_GAAP: "ASC_105_10_05_1",
  IFRS: "IAS_1_PRESENTATION",
  IFRS_SME: "IFRS_FOR_SMES_S1",
  SEC_REGS_X: "SEC_REG_S_X",
  SEC_FORM_20F: "SEC_FORM_20F_FPI",
};

const SUPPORTED_FRAMEWORKS = new Set<string>(Object.keys(FRAMEWORK_TO_CITATION));

function validateEntry(entry: RegistryElectionEntry, idx: number): void {
  if (!entry.companyId || typeof entry.companyId !== "string") {
    throw new Error(`syncElectionRegistry[${idx}]: companyId required`);
  }
  if (!entry.electedFramework || !SUPPORTED_FRAMEWORKS.has(entry.electedFramework)) {
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
    throw new Error(`syncElectionRegistry[${idx}]: electionEvidenceRef required`);
  }
  if (entry.electedFramework === "IFRS_SME") {
    const attestation = entry.eligibilityAttestation;
    if (!attestation) {
      throw new Error(`syncElectionRegistry[${idx}]: IFRS_SME election requires eligibilityAttestation`);
    }
    if (!attestation.noPublicAccountability) {
      throw new Error(`syncElectionRegistry[${idx}]: IFRS_SME ineligible — public accountability`);
    }
    if (!attestation.publishesGeneralPurposeFinancialStatements) {
      throw new Error(`syncElectionRegistry[${idx}]: IFRS_SME ineligible — general-purpose FS`);
    }
    if (!ISO_8601.test(attestation.attestedAt)) {
      throw new Error(`syncElectionRegistry[${idx}]: eligibilityAttestation.attestedAt must be ISO-8601 UTC`);
    }
    if (attestation.citationHandle !== "IFRS_FOR_SMES_S1") {
      throw new Error(`syncElectionRegistry[${idx}]: IFRS_SME eligibility must cite IFRS_FOR_SMES_S1`);
    }
  }
}

export function validateSyncElectionRegistryDocument(parsed: unknown): void {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("syncElectionRegistry: registry must be an object");
  }
  const raw = parsed as RegistryShape;
  if (raw.generatedBy !== "human_curated") {
    throw new Error(`syncElectionRegistry: generatedBy must be "human_curated"`);
  }
  if (!Array.isArray(raw.elections)) {
    throw new Error("syncElectionRegistry: elections must be an array");
  }
  const seen = new Set<string>();
  raw.elections.forEach((entry, idx) => {
    validateEntry(entry, idx);
    if (seen.has(entry.companyId)) {
      throw new Error(`syncElectionRegistry[${idx}]: duplicate companyId "${entry.companyId}"`);
    }
    seen.add(entry.companyId);
  });
}

export function citationHandleForFramework(
  framework: FrameworkId,
  eligibilityAttestation?: { citationHandle?: string },
): CitationHandle {
  if (eligibilityAttestation?.citationHandle) {
    return eligibilityAttestation.citationHandle as CitationHandle;
  }
  return FRAMEWORK_TO_CITATION[framework];
}

export function frameworkIdFromRegistryValue(value: string): FrameworkId {
  if (!SUPPORTED_FRAMEWORKS.has(value)) {
    throw new Error(`Unsupported framework in registry: ${value}`);
  }
  return value as FrameworkId;
}
