import registryJson from "./escalation-registry.json";
import type { EscalationTarget } from "./types";

interface RegistryEntry {
  attestedBy: string;
  attestedAt: string;
  role: string;
  scope: EscalationTarget["scope"];
  scopeFilter: {
    industryCode?: string;
    jurisdictionCountry?: string;
    companyId?: string;
  };
  contactRef: string;
  citationHandle: string | null;
  notes?: string;
}

interface RegistryShape {
  schemaVersion: string;
  generatedBy: "human_curated";
  curatedAt: string;
  registryDoctrine: string;
  selectionDoctrine: string;
  entries: RegistryEntry[];
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const SCOPE_RANK: Record<EscalationTarget["scope"], number> = {
  universal: 0,
  industry: 1,
  jurisdiction: 2,
  company: 3,
};

function validateEntry(entry: RegistryEntry, idx: number): void {
  if (!entry.attestedBy) {
    throw new Error(`escalationRegistry[${idx}]: attestedBy required`);
  }
  if (!ISO_8601.test(entry.attestedAt)) {
    throw new Error(`escalationRegistry[${idx}]: attestedAt must be ISO-8601 UTC`);
  }
  if (!entry.role) {
    throw new Error(`escalationRegistry[${idx}]: role required`);
  }
  if (!Object.prototype.hasOwnProperty.call(SCOPE_RANK, entry.scope)) {
    throw new Error(`escalationRegistry[${idx}]: invalid scope "${entry.scope}"`);
  }
  if (!entry.contactRef) {
    throw new Error(`escalationRegistry[${idx}]: contactRef required`);
  }
  if (entry.scope === "industry" && !entry.scopeFilter.industryCode) {
    throw new Error(`escalationRegistry[${idx}]: scope=industry requires scopeFilter.industryCode`);
  }
  if (entry.scope === "jurisdiction" && !entry.scopeFilter.jurisdictionCountry) {
    throw new Error(
      `escalationRegistry[${idx}]: scope=jurisdiction requires scopeFilter.jurisdictionCountry`,
    );
  }
  if (entry.scope === "company" && !entry.scopeFilter.companyId) {
    throw new Error(`escalationRegistry[${idx}]: scope=company requires scopeFilter.companyId`);
  }
}

function loadRegistry(): RegistryEntry[] {
  const raw = registryJson as RegistryShape;
  if (raw.generatedBy !== "human_curated") {
    throw new Error("escalationRegistry: generatedBy must be \"human_curated\"");
  }
  if (!Array.isArray(raw.entries)) {
    throw new Error("escalationRegistry: entries must be an array");
  }
  raw.entries.forEach(validateEntry);
  if (raw.entries.length === 0) {
    throw new Error(
      "escalationRegistry: starter registry must contain at least one entry (founder fallback)",
    );
  }
  return raw.entries;
}

const REGISTRY: RegistryEntry[] = loadRegistry();

export interface EscalationLookup {
  industryCode: string;
  jurisdictionCountry: string;
  companyId: string;
}

export function selectEscalationTarget(lookup: EscalationLookup): EscalationTarget | null {
  const matches = REGISTRY.filter((entry) => {
    switch (entry.scope) {
      case "universal":
        return true;
      case "industry":
        return entry.scopeFilter.industryCode === lookup.industryCode;
      case "jurisdiction":
        return entry.scopeFilter.jurisdictionCountry === lookup.jurisdictionCountry;
      case "company":
        return entry.scopeFilter.companyId === lookup.companyId;
      default:
        return false;
    }
  });

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    const rankDiff = SCOPE_RANK[right.scope] - SCOPE_RANK[left.scope];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return right.attestedAt.localeCompare(left.attestedAt);
  });

  const winner = matches[0];
  return {
    attestedBy: winner.attestedBy,
    attestedAt: winner.attestedAt,
    role: winner.role,
    scope: winner.scope,
    contactRef: winner.contactRef,
    citationHandle: winner.citationHandle,
  };
}

export function getEscalationRegistrySize(): number {
  return REGISTRY.length;
}

export const __testOnly = { validateEntry };
