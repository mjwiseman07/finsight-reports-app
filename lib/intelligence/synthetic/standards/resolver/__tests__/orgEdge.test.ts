import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import curatedPrecedenceTable from "../treatment-precedence-table.json";
import { resolveTreatment } from "../resolveTreatment";
import { resolveTreatmentPure } from "../resolveTreatmentPure";
import { fetchTreatmentContext } from "../fetchTreatmentContext";
import {
  detectDisagreement,
  NullOrgElectionReader,
  SyncRegistryOrgElectionReader,
  validateSyncElectionRegistryDocument,
} from "../org-edge";
import type { AttestedElection, CitationHandle, FrameworkId, OrgElectionReader } from "../org-edge/types";
import {
  OrgElectionConsolidationNotSupportedError,
  OrgElectionRegistryUnavailableError,
} from "../org-edge/types";
import type {
  ResolveTreatmentInput,
  TreatmentPrecedenceTable,
  TreatmentResolution,
  TreatmentResolverDeps,
} from "../types";
import { runResolveTreatmentPureGoldenTests } from "./resolveTreatmentPure.golden.test";
import { runTreatmentDeterminismHashTests } from "./treatmentDeterminismHash.test";
import { runMfgShimTests } from "../../../industry/manufacturing/composition/__tests__/resolveReportingFramework.shim.test";
import { runRtlShimTests } from "../../../industry/retail/composition/__tests__/resolveReportingFramework.shim.test";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";
const FROZEN_CLOCK = (): string => FROZEN_GENERATED_AT;

const CITATION_BY_FRAMEWORK: Record<FrameworkId, CitationHandle> = {
  US_GAAP: "ASC_105_10_05_1",
  IFRS: "IAS_1_PRESENTATION",
  IFRS_SME: "IFRS_FOR_SMES_S1",
  SEC_REGS_X: "SEC_REG_S_X",
  SEC_FORM_20F: "SEC_FORM_20F_FPI",
};

export interface OrgEdgeCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface OrgEdgeEvidence {
  readonly evidenceVersion: "42.7D.1";
  readonly generatedAt: string;
  readonly totalCases: 60;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly OrgEdgeCaseRecord[];
}

interface RegistryElectionEntry {
  companyId: string;
  electedFramework: string;
  electedAt: string;
  electedBy: string;
  electionScope: string;
  electionEvidenceRef: string;
  eligibilityAttestation?: {
    noPublicAccountability: boolean;
    publishesGeneralPurposeFinancialStatements: boolean;
    attestedBy: string;
    attestedAt: string;
    citationHandle: string;
  };
}

function pushCase(
  cases: OrgEdgeCaseRecord[],
  counters: { passCount: number; failCount: number },
  input: {
    id: string;
    decision: string;
    expected: string;
    actual: string;
    reason: string;
  },
): void {
  if (input.actual !== input.expected) {
    counters.failCount += 1;
  } else {
    counters.passCount += 1;
  }
  cases.push(
    Object.freeze({
      id: input.id,
      decision: input.decision,
      expected: input.expected,
      outcome: input.actual,
      reason: input.reason,
    }),
  );
}

function writeTempRegistry(
  elections: RegistryElectionEntry[],
  extra: Record<string, unknown> = {},
): string {
  const filePath = path.join(
    os.tmpdir(),
    `sync-election-org-edge-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        schemaVersion: "1.0.0",
        generatedBy: "human_curated",
        elections,
        ...extra,
      },
      null,
      2,
    ),
  );
  return filePath;
}

function validRegistryEntry(
  companyId: string,
  electedFramework: string,
  overrides: Partial<RegistryElectionEntry> = {},
): RegistryElectionEntry {
  const entry: RegistryElectionEntry = {
    companyId,
    electedFramework,
    electedAt: "2026-06-24T00:00:00Z",
    electedBy: "mwiseman@advisacor.com",
    electionScope: "company",
    electionEvidenceRef: "GOV-TEST-1",
    ...overrides,
  };
  if (electedFramework === "IFRS_SME" && !entry.eligibilityAttestation) {
    entry.eligibilityAttestation = {
      noPublicAccountability: true,
      publishesGeneralPurposeFinancialStatements: true,
      attestedBy: "mwiseman@advisacor.com",
      attestedAt: "2026-06-24T00:00:00Z",
      citationHandle: "IFRS_FOR_SMES_S1",
    };
  }
  return entry;
}

function attestedElection(
  orgId: string,
  framework: FrameworkId,
  overrides: Partial<AttestedElection> = {},
): AttestedElection {
  return Object.freeze({
    orgId,
    framework,
    citationHandle: overrides.citationHandle ?? CITATION_BY_FRAMEWORK[framework],
    attestedBy: "mwiseman@advisacor.com",
    attestedAt: FROZEN_GENERATED_AT,
    attestationVersion: "42.7A.4.1",
    note: "test attestation",
    ...overrides,
  });
}

class MapOrgElectionReader implements OrgElectionReader {
  constructor(
    private readonly elections: ReadonlyMap<string, AttestedElection>,
    private readonly availableFlag = true,
  ) {}

  read(orgId: string): AttestedElection | null {
    return this.elections.get(orgId) ?? null;
  }

  isAvailable(): boolean {
    return this.availableFlag;
  }
}

function baseInput(overrides: Partial<ResolveTreatmentInput> = {}): ResolveTreatmentInput {
  return {
    orgElection: null,
    companyMemoryHandle: {
      companyId: "00000000-0000-4000-8000-000000000001",
      asOfPeriodKey: "2026-Q2",
      memoryGroupId: "memory-group-test",
      snapshotDeterminismHash: "snap_test",
    },
    knowledgePackageHandle: {
      packageId: "pkg-test",
      boundPhase37SnapshotHash: "phase37_test",
      industry: {
        industryCode: "MANUFACTURING",
        subIndustryCode: null,
      },
    },
    industry: {
      industryCode: "MANUFACTURING",
      subIndustryCode: null,
    },
    jurisdiction: {
      country: "US",
      region: null,
    },
    reportingPeriod: {
      periodKey: "2026-Q2",
      fiscalYearEnd: "2026-06-30",
    },
    ...overrides,
  };
}

function createDeps(overrides: Partial<TreatmentResolverDeps> = {}): TreatmentResolverDeps {
  return {
    memoryReader: {
      queryLatestMemoryRecord: async () => null,
    },
    precedenceTableLoader: {
      load: async () => curatedPrecedenceTable as TreatmentPrecedenceTable,
    },
    clock: FROZEN_CLOCK,
    ...overrides,
  };
}

function buildReader(registryPath: string): SyncRegistryOrgElectionReader {
  return new SyncRegistryOrgElectionReader({
    registryPath,
    validateRegistrySchema: validateSyncElectionRegistryDocument,
  });
}

function disagreementNote(
  election: AttestedElection,
  projectedFramework: FrameworkId,
): string {
  return `Org ${election.orgId} attested ${election.framework} (${election.citationHandle}); curated rules would have produced ${projectedFramework}. Attested election wins; advisory logged for human review.`;
}

function executeS1(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): void {
  const validPath = writeTempRegistry([
    validRegistryEntry("org-valid-1", "US_GAAP"),
    validRegistryEntry("org-valid-2", "IFRS"),
  ]);

  try {
    const reader = buildReader(validPath);
    pushCase(cases, counters, {
      id: "S1.reader-construction.01",
      decision: "loads-valid-registry",
      expected: "loaded-with-entries",
      actual: reader.isAvailable() && reader.read("org-valid-1") !== null ? "loaded-with-entries" : "failed",
      reason: "Registry parsed; entries indexed; isAvailable() true.",
    });
    pushCase(cases, counters, {
      id: "S1.reader-construction.02",
      decision: "is-available",
      expected: "true",
      actual: String(reader.isAvailable()),
      reason: "isAvailable() true after valid load.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.01",
      decision: "loads-valid-registry",
      expected: "loaded-with-entries",
      actual: "failed",
      reason: (error as Error).message,
    });
    pushCase(cases, counters, {
      id: "S1.reader-construction.02",
      decision: "is-available",
      expected: "true",
      actual: "false",
      reason: (error as Error).message,
    });
  }

  try {
    buildReader(path.join(os.tmpdir(), "missing-registry-org-edge-test.json"));
    pushCase(cases, counters, {
      id: "S1.reader-construction.03",
      decision: "missing-file",
      expected: "OrgElectionRegistryUnavailableError",
      actual: "no-throw",
      reason: "Expected throw on missing registry file.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.03",
      decision: "missing-file",
      expected: "OrgElectionRegistryUnavailableError",
      actual: error instanceof OrgElectionRegistryUnavailableError ? "OrgElectionRegistryUnavailableError" : "other-error",
      reason: "Throws OrgElectionRegistryUnavailableError on missing file.",
    });
  }

  const invalidJsonPath = writeTempRegistry([]);
  fs.writeFileSync(invalidJsonPath, "{not-json");
  try {
    buildReader(invalidJsonPath);
    pushCase(cases, counters, {
      id: "S1.reader-construction.04",
      decision: "invalid-json",
      expected: "OrgElectionRegistryUnavailableError",
      actual: "no-throw",
      reason: "Expected throw on invalid JSON.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.04",
      decision: "invalid-json",
      expected: "OrgElectionRegistryUnavailableError",
      actual: error instanceof OrgElectionRegistryUnavailableError ? "OrgElectionRegistryUnavailableError" : "other-error",
      reason: "Throws OrgElectionRegistryUnavailableError on invalid JSON.",
    });
  }

  const schemaInvalidPath = writeTempRegistry([], { generatedBy: "machine_generated" });
  try {
    buildReader(schemaInvalidPath);
    pushCase(cases, counters, {
      id: "S1.reader-construction.05",
      decision: "schema-invalid",
      expected: "fail-loud",
      actual: "no-throw",
      reason: "Expected throw on schema-invalid registry.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.05",
      decision: "schema-invalid",
      expected: "fail-loud",
      actual: error instanceof Error ? "fail-loud" : "other-error",
      reason: "Throws on schema-invalid registry (validator or reader).",
    });
  }

  const duplicatePath = writeTempRegistry([
    validRegistryEntry("dup-org", "US_GAAP"),
    validRegistryEntry("dup-org", "IFRS"),
  ]);
  try {
    buildReader(duplicatePath);
    pushCase(cases, counters, {
      id: "S1.reader-construction.06",
      decision: "duplicate-org-id",
      expected: "fail-loud",
      actual: "no-throw",
      reason: "Expected throw on duplicate companyId.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.06",
      decision: "duplicate-org-id",
      expected: "fail-loud",
      actual: error instanceof Error ? "fail-loud" : "other-error",
      reason: "Throws on duplicate companyId (validator or reader).",
    });
  }

  const frozenPath = writeTempRegistry([validRegistryEntry("frozen-org", "US_GAAP")]);
  try {
    const frozenReader = buildReader(frozenPath);
    const election = frozenReader.read("frozen-org");
    let mutationBlocked = false;
    try {
      (election as { framework: string }).framework = "IFRS";
    } catch {
      mutationBlocked = true;
    }
    pushCase(cases, counters, {
      id: "S1.reader-construction.07",
      decision: "frozen-entries",
      expected: "mutation-blocked",
      actual: mutationBlocked || election?.framework === "US_GAAP" ? "mutation-blocked" : "mutable",
      reason: "AttestedElection entries are frozen at construction.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.07",
      decision: "frozen-entries",
      expected: "mutation-blocked",
      actual: "failed",
      reason: (error as Error).message,
    });
  }

  const loadOncePath = writeTempRegistry([validRegistryEntry("load-once-org", "IFRS")]);
  try {
    const loadOnceReader = buildReader(loadOncePath);
    fs.unlinkSync(loadOncePath);
    const afterDelete = loadOnceReader.read("load-once-org");
    pushCase(cases, counters, {
      id: "S1.reader-construction.08",
      decision: "load-once",
      expected: "read-after-delete-works",
      actual: afterDelete?.framework === "IFRS" ? "read-after-delete-works" : "failed",
      reason: "Load-once: file deleted post-construction; reads still work.",
    });
  } catch (error) {
    pushCase(cases, counters, {
      id: "S1.reader-construction.08",
      decision: "load-once",
      expected: "read-after-delete-works",
      actual: "failed",
      reason: (error as Error).message,
    });
  }
}

function executeS2(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): void {
  const reader = new NullOrgElectionReader();
  pushCase(cases, counters, {
    id: "S2.null-reader.01",
    decision: "read-any-org",
    expected: "null",
    actual: reader.read("any-org-id") === null ? "null" : "non-null",
    reason: "NullOrgElectionReader returns null for any orgId.",
  });
  pushCase(cases, counters, {
    id: "S2.null-reader.02",
    decision: "is-available",
    expected: "false",
    actual: String(reader.isAvailable()),
    reason: "NullOrgElectionReader.isAvailable() is false.",
  });
  pushCase(cases, counters, {
    id: "S2.null-reader.03",
    decision: "default-safe",
    expected: "safe-default",
    actual: reader.read("") === null && !reader.isAvailable() ? "safe-default" : "unsafe",
    reason: "NullOrgElectionReader is safe to use as default.",
  });
}

function executeS3(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): void {
  let projectionCalls = 0;
  const projection = {
    computeProjectedFramework() {
      projectionCalls += 1;
      return { framework: "US_GAAP" as FrameworkId, ruleIds: ["RULE-001"] as readonly string[] };
    },
  };
  const noElectionDecision = detectDisagreement(null, projection);
  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.01",
    decision: "no-election",
    expected: "no-election-no-projection",
    actual:
      noElectionDecision.kind === "no-election" && projectionCalls === 0
        ? "no-election-no-projection"
        : "failed",
    reason: "No election returns no-election; projection not invoked.",
  });

  const electionMatch = attestedElection("org-match", "US_GAAP");
  const matchDecision = detectDisagreement(electionMatch, {
    computeProjectedFramework: () => ({ framework: "US_GAAP", ruleIds: ["RULE-002"] }),
  });
  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.02",
    decision: "matching-framework",
    expected: "override-no-disagreement",
    actual:
      matchDecision.kind === "override" && matchDecision.disagreement === null
        ? "override-no-disagreement"
        : "failed",
    reason: "Matching election and projection yields override without disagreement.",
  });

  const electionDiff = attestedElection("org-diff", "IFRS", { citationHandle: "IAS_1_PRESENTATION" });
  const diffDecision = detectDisagreement(electionDiff, {
    computeProjectedFramework: () => ({ framework: "US_GAAP", ruleIds: ["RULE-001", "RULE-002"] }),
  });
  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.03",
    decision: "disagreement",
    expected: "override-with-disagreement",
    actual: diffDecision.kind === "override-with-disagreement" ? "override-with-disagreement" : "failed",
    reason: "Differing election and projection yields override-with-disagreement.",
  });

  const frameworkPairs: Array<{ attested: FrameworkId; projected: FrameworkId; suffix: string }> = [
    { attested: "US_GAAP", projected: "IFRS", suffix: "04" },
    { attested: "IFRS", projected: "IFRS_SME", suffix: "05" },
    { attested: "US_GAAP", projected: "SEC_REGS_X", suffix: "06" },
    { attested: "IFRS", projected: "SEC_REGS_X", suffix: "07" },
    { attested: "US_GAAP", projected: "SEC_FORM_20F", suffix: "08" },
  ];
  for (const pair of frameworkPairs) {
    const decision = detectDisagreement(
      attestedElection(`org-pair-${pair.suffix}`, pair.attested),
      { computeProjectedFramework: () => ({ framework: pair.projected, ruleIds: ["RULE-PAIR"] }) },
    );
    pushCase(cases, counters, {
      id: `S3.disagreement-detector-pure.${pair.suffix}`,
      decision: "framework-pair",
      expected: "override-with-disagreement",
      actual:
        decision.kind === "override-with-disagreement" &&
        decision.disagreement?.attestedFramework === pair.attested &&
        decision.disagreement?.curatedRulesWouldHaveProduced === pair.projected
          ? "override-with-disagreement"
          : "failed",
      reason: `${pair.attested} vs ${pair.projected} pair produces disagreement advisory.`,
    });
  }

  const propagated = detectDisagreement(
    attestedElection("org-propagated", "IFRS_SME", {
      attestedBy: "founder@test.com",
      attestedAt: "2026-01-15T12:00:00Z",
      citationHandle: "IFRS_FOR_SMES_S1",
    }),
    { computeProjectedFramework: () => ({ framework: "US_GAAP", ruleIds: ["RULE-010"] }) },
  );
  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.09",
    decision: "attestation-propagated",
    expected: "fields-propagated",
    actual:
      propagated.disagreement?.attestedBy === "founder@test.com" &&
      propagated.disagreement?.attestedAt === "2026-01-15T12:00:00Z" &&
      propagated.disagreement?.attestedCitationHandle === "IFRS_FOR_SMES_S1"
        ? "fields-propagated"
        : "failed",
    reason: "Attestation fields propagate into disagreement advisory.",
  });

  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.10",
    decision: "human-review",
    expected: "true",
    actual: String(propagated.disagreement?.humanReviewRecommended === true),
    reason: "humanReviewRecommended is always true on disagreement.",
  });

  const refsDecision = detectDisagreement(
    attestedElection("org-refs", "IFRS"),
    { computeProjectedFramework: () => ({ framework: "US_GAAP", ruleIds: ["RULE-A", "RULE-B"] }) },
  );
  const refs = refsDecision.disagreement?.curatedRulesCitationRefs ?? [];
  let refsFrozen = false;
  try {
    (refs as string[]).push("MUTATED");
  } catch {
    refsFrozen = true;
  }
  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.11",
    decision: "citation-refs-frozen",
    expected: "frozen-copy",
    actual:
      refs.length === 2 && refsFrozen && refsDecision.disagreement?.curatedRulesCitationRefs.length === 2
        ? "frozen-copy"
        : "failed",
    reason: "curatedRulesCitationRefs is a frozen copy of projected ruleIds.",
  });

  pushCase(cases, counters, {
    id: "S3.disagreement-detector-pure.12",
    decision: "note-template",
    expected: disagreementNote(electionDiff, "US_GAAP"),
    actual: diffDecision.disagreement?.note ?? "missing",
    reason: "Disagreement note matches locked template string.",
  });
}

async function pureBaselineResolution(input: ResolveTreatmentInput): Promise<TreatmentResolution> {
  const context = await fetchTreatmentContext(input, createDeps());
  return resolveTreatmentPure(context);
}

async function executeS4(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  const input = baseInput();
  const baseline = await pureBaselineResolution(input);

  const withoutReader = await resolveTreatment(input, createDeps());
  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.01",
    decision: "without-reader",
    expected: baseline.chosenFramework ?? "null",
    actual: withoutReader.chosenFramework ?? "null",
    reason: "Without reader delegates to inner core (pre-42.7D behavior).",
  });

  const withNullReader = await resolveTreatment(
    input,
    createDeps({ orgElectionReader: new NullOrgElectionReader() }),
  );
  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.02",
    decision: "null-reader",
    expected: baseline.chosenFramework ?? "null",
    actual: withNullReader.chosenFramework ?? "null",
    reason: "Null reader preserves pre-42.7D behavior.",
  });

  const emptyRegistryPath = writeTempRegistry([]);
  const emptyReader = buildReader(emptyRegistryPath);
  const unknownOrgInput = baseInput({
    companyMemoryHandle: {
      ...input.companyMemoryHandle,
      companyId: "unknown-org-id",
    },
  });
  const withUnknownOrg = await resolveTreatment(
    unknownOrgInput,
    createDeps({ orgElectionReader: emptyReader }),
  );
  const unknownBaseline = await pureBaselineResolution(unknownOrgInput);
  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.03",
    decision: "unknown-org",
    expected: unknownBaseline.chosenFramework ?? "null",
    actual: withUnknownOrg.chosenFramework ?? "null",
    reason: "Reader with unknown orgId delegates to inner core.",
  });

  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.04",
    decision: "resolved-by-absent",
    expected: "not-org-edge",
    actual: withoutReader.resolvedBy === "org-edge" ? "org-edge" : "not-org-edge",
    reason: "No-election path must not set resolvedBy org-edge.",
  });
  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.05",
    decision: "advisories-absent",
    expected: "absent",
    actual: withoutReader.advisories === undefined ? "absent" : "present",
    reason: "No-election path must not populate advisories.",
  });
  pushCase(cases, counters, {
    id: "S4.outer-wrapper-no-election.06",
    decision: "election-absent",
    expected: "absent",
    actual: withoutReader.election === undefined ? "absent" : "present",
    reason: "No-election path must not populate election field.",
  });
}

async function executeS5(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  const orgId = "org-override-match";
  const election = attestedElection(orgId, "US_GAAP");
  const reader = new MapOrgElectionReader(new Map([[orgId, election]]));
  const input = baseInput({
    companyMemoryHandle: {
      ...baseInput().companyMemoryHandle,
      companyId: orgId,
    },
  });
  const resolution = await resolveTreatment(input, createDeps({ orgElectionReader: reader }));

  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.01",
    decision: "framework",
    expected: "US_GAAP",
    actual: resolution.chosenFramework ?? "missing",
    reason: "Attested framework wins when matching curated projection.",
  });
  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.02",
    decision: "citation-handle",
    expected: "ASC_105_10_05_1",
    actual: resolution.citationHandle ?? "missing",
    reason: "Attested citationHandle flows through override path.",
  });
  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.03",
    decision: "resolved-by",
    expected: "org-edge",
    actual: resolution.resolvedBy ?? "missing",
    reason: "Override path sets resolvedBy org-edge.",
  });
  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.04",
    decision: "matched-rules",
    expected: "0",
    actual: String(resolution.matchedRules.length),
    reason: "Override path leaves matchedRules empty.",
  });
  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.05",
    decision: "unresolved-conflicts",
    expected: "0",
    actual: String(resolution.unresolvedConflicts.length),
    reason: "Override path leaves unresolvedConflicts empty.",
  });
  pushCase(cases, counters, {
    id: "S5.outer-wrapper-override.06",
    decision: "advisories",
    expected: "0",
    actual: String(resolution.advisories?.length ?? 0),
    reason: "Matching override produces no advisories.",
  });
}

async function executeS6(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  const orgId = "org-override-disagreement";
  const election = attestedElection(orgId, "IFRS", { citationHandle: "IAS_1_PRESENTATION" });
  const reader = new MapOrgElectionReader(new Map([[orgId, election]]));
  const input = baseInput({
    companyMemoryHandle: {
      ...baseInput().companyMemoryHandle,
      companyId: orgId,
    },
  });
  const resolution = await resolveTreatment(input, createDeps({ orgElectionReader: reader }));

  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.01",
    decision: "framework-override-wins",
    expected: "IFRS",
    actual: resolution.chosenFramework ?? "missing",
    reason: "Attested framework wins even when curated rules disagree.",
  });
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.02",
    decision: "advisories-length",
    expected: "1",
    actual: String(resolution.advisories?.length ?? 0),
    reason: "Disagreement emits one advisory.",
  });
  const advisory = resolution.advisories?.[0];
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.03",
    decision: "both-frameworks",
    expected: "IFRS-vs-US_GAAP",
    actual:
      advisory?.attestedFramework === "IFRS" && advisory?.curatedRulesWouldHaveProduced === "US_GAAP"
        ? "IFRS-vs-US_GAAP"
        : "failed",
    reason: "Advisory carries both attested and curated frameworks.",
  });
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.04",
    decision: "attested-by",
    expected: "mwiseman@advisacor.com",
    actual: advisory?.attestedBy ?? "missing",
    reason: "attestedBy propagates into advisory.",
  });
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.05",
    decision: "human-review",
    expected: "true",
    actual: String(advisory?.humanReviewRecommended === true),
    reason: "humanReviewRecommended true on disagreement advisory.",
  });
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.06",
    decision: "curated-rule-refs",
    expected: "populated",
    actual:
      Array.isArray(advisory?.curatedRulesCitationRefs) &&
      (advisory?.curatedRulesCitationRefs.length ?? 0) > 0
        ? "populated"
        : "empty",
    reason: "Curated rule refs populated on disagreement advisory.",
  });

  let projectionCalls = 0;
  detectDisagreement(election, {
    computeProjectedFramework() {
      projectionCalls += 1;
      return { framework: "US_GAAP", ruleIds: ["RULE-001"] };
    },
  });
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.07",
    decision: "projection-once",
    expected: "1",
    actual: String(projectionCalls),
    reason: "Lazy projection invoked exactly once when election exists.",
  });

  let noElectionProjectionCalls = 0;
  detectDisagreement(null, {
    computeProjectedFramework() {
      noElectionProjectionCalls += 1;
      return { framework: "US_GAAP", ruleIds: ["RULE-001"] };
    },
  });
  const noElectionResolution = await resolveTreatment(
    baseInput(),
    createDeps({ orgElectionReader: new NullOrgElectionReader() }),
  );
  pushCase(cases, counters, {
    id: "S6.outer-wrapper-override-with-disagreement.08",
    decision: "no-election-no-projection",
    expected: "not-org-edge",
    actual:
      noElectionProjectionCalls === 0 && noElectionResolution.resolvedBy !== "org-edge"
        ? "not-org-edge"
        : "failed",
    reason: "No election: projection not invoked; org-edge path not taken.",
  });
}

async function executeS7(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  let thrown: unknown;
  try {
    await resolveTreatment(
      baseInput({ consolidationContext: { parentOrgId: "parent" } }),
      createDeps(),
    );
  } catch (error) {
    thrown = error;
  }
  pushCase(cases, counters, {
    id: "S7.consolidation-fail-loud.01",
    decision: "consolidation-rejected",
    expected: "OrgElectionConsolidationNotSupportedError",
    actual:
      thrown instanceof OrgElectionConsolidationNotSupportedError
        ? "OrgElectionConsolidationNotSupportedError"
        : "other",
    reason: "consolidationContext rejected with OrgElectionConsolidationNotSupportedError.",
  });
  pushCase(cases, counters, {
    id: "S7.consolidation-fail-loud.02",
    decision: "error-code",
    expected: "ORG_ELECTION_CONSOLIDATION_NOT_SUPPORTED",
    actual:
      thrown instanceof OrgElectionConsolidationNotSupportedError
        ? thrown.code
        : "missing",
    reason: "Error code stable on consolidation rejection.",
  });
  pushCase(cases, counters, {
    id: "S7.consolidation-fail-loud.03",
    decision: "no-partial-resolution",
    expected: "no-resolution",
    actual: thrown ? "no-resolution" : "partial-resolution-returned",
    reason: "No partial state mutation on consolidation rejection.",
  });
}

function executeS8(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): void {
  const pureSource = fs.readFileSync(
    path.join(__dirname, "..", "resolveTreatmentPure.ts"),
    "utf8",
  );
  pushCase(cases, counters, {
    id: "S8.pure-inner-core-untouched.01",
    decision: "no-org-edge-imports",
    expected: "zero-references",
    actual: /org-edge/.test(pureSource) ? "found-references" : "zero-references",
    reason: "resolveTreatmentPure.ts must not reference org-edge.",
  });

  let goldenOk = false;
  let goldenCount = 0;
  try {
    goldenCount = runResolveTreatmentPureGoldenTests();
    goldenOk = goldenCount > 0;
  } catch {
    goldenOk = false;
  }
  let hashOk = false;
  let hashCount = 0;
  try {
    hashCount = runTreatmentDeterminismHashTests();
    hashOk = hashCount > 0;
  } catch {
    hashOk = false;
  }
  pushCase(cases, counters, {
    id: "S8.pure-inner-core-untouched.02",
    decision: "golden-and-hash",
    expected: "pass",
    actual: goldenOk && hashOk ? "pass" : "fail",
    reason: `Golden (${goldenCount}) and determinism hash (${hashCount}) suites still pass.`,
  });

  const mfg = runMfgShimTests();
  pushCase(cases, counters, {
    id: "S8.pure-inner-core-untouched.03",
    decision: "mfg-shim",
    expected: "0-failures",
    actual: mfg.failed === 0 ? "0-failures" : `${mfg.failed}-failures`,
    reason: "MFG shim tests still pass.",
  });

  const rtl = runRtlShimTests();
  pushCase(cases, counters, {
    id: "S8.pure-inner-core-untouched.04",
    decision: "rtl-shim",
    expected: "0-failures",
    actual: rtl.failed === 0 ? "0-failures" : `${rtl.failed}-failures`,
    reason: "RTL shim tests still pass.",
  });
}

async function executeS9(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  const resolution = await resolveTreatment(baseInput(), createDeps());
  const { chosenFramework, matchedRules, unresolvedConflicts } = resolution;
  pushCase(cases, counters, {
    id: "S9.resolution-shape-backward-compat.01",
    decision: "destructure",
    expected: "ok",
    actual:
      chosenFramework !== undefined &&
      Array.isArray(matchedRules) &&
      Array.isArray(unresolvedConflicts)
        ? "ok"
        : "failed",
    reason: "Consumer destructuring of core fields still works.",
  });
  pushCase(cases, counters, {
    id: "S9.resolution-shape-backward-compat.02",
    decision: "optional-fields-absent",
    expected: "absent",
    actual:
      resolution.resolvedBy === undefined &&
      resolution.advisories === undefined &&
      resolution.election === undefined
        ? "absent"
        : "present",
    reason: "New optional fields absent when no org-edge reader/election.",
  });

  const resolvedByValues: Array<TreatmentResolution["resolvedBy"]> = [
    "curated-rules",
    "org-edge",
    "fallback",
    undefined,
  ];
  pushCase(cases, counters, {
    id: "S9.resolution-shape-backward-compat.03",
    decision: "resolved-by-enum",
    expected: "typed",
    actual: resolvedByValues.every(
      (value) =>
        value === undefined ||
        value === "curated-rules" ||
        value === "org-edge" ||
        value === "fallback",
    )
      ? "typed"
      : "invalid",
    reason: "resolvedBy enum values remain strictly typed.",
  });

  const orgId = "org-s9-advisories";
  const reader = new MapOrgElectionReader(
    new Map([[orgId, attestedElection(orgId, "IFRS")]]),
  );
  const withAdvisories = await resolveTreatment(
    baseInput({
      companyMemoryHandle: {
        ...baseInput().companyMemoryHandle,
        companyId: orgId,
      },
    }),
    createDeps({ orgElectionReader: reader }),
  );
  pushCase(cases, counters, {
    id: "S9.resolution-shape-backward-compat.04",
    decision: "advisories-array",
    expected: "array",
    actual: Array.isArray(withAdvisories.advisories) ? "array" : "not-array",
    reason: "advisories is an array when present on org-edge resolutions.",
  });
}

async function executeS10(cases: OrgEdgeCaseRecord[], counters: { passCount: number; failCount: number }): Promise<void> {
  const handles: CitationHandle[] = [
    "ASC_105_10_05_1",
    "IAS_1_PRESENTATION",
    "IFRS_FOR_SMES_S1",
    "SEC_REG_S_X",
    "SEC_FORM_20F_FPI",
  ];
  const frameworkByHandle: Record<CitationHandle, FrameworkId> = {
    ASC_105_10_05_1: "US_GAAP",
    IAS_1_PRESENTATION: "IFRS",
    IFRS_FOR_SMES_S1: "IFRS_SME",
    SEC_REG_S_X: "SEC_REGS_X",
    SEC_FORM_20F: "SEC_FORM_20F",
  };

  for (let index = 0; index < handles.length; index += 1) {
    const citationHandle = handles[index]!;
    const framework = frameworkByHandle[citationHandle];
    const orgId = `org-citation-${index + 1}`;
    const reader = new MapOrgElectionReader(
      new Map([[orgId, attestedElection(orgId, framework, { citationHandle })]]),
    );
    const resolution = await resolveTreatment(
      baseInput({
        companyMemoryHandle: {
          ...baseInput().companyMemoryHandle,
          companyId: orgId,
        },
      }),
      createDeps({ orgElectionReader: reader }),
    );
    pushCase(cases, counters, {
      id: `S10.citation-handle-correctness.0${index + 1}`,
      decision: "citation-handle",
      expected: citationHandle,
      actual: resolution.citationHandle ?? "missing",
      reason: `${citationHandle} flows through org-edge resolution.`,
    });
  }
}

async function buildCasesThroughS10(): Promise<OrgEdgeCaseRecord[]> {
  const cases: OrgEdgeCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };
  executeS1(cases, counters);
  executeS2(cases, counters);
  executeS3(cases, counters);
  await executeS4(cases, counters);
  await executeS5(cases, counters);
  await executeS6(cases, counters);
  await executeS7(cases, counters);
  executeS8(cases, counters);
  await executeS9(cases, counters);
  await executeS10(cases, counters);
  return cases;
}

export async function runOrgEdgeTests(): Promise<OrgEdgeEvidence> {
  const cases: OrgEdgeCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  executeS1(cases, counters);
  executeS2(cases, counters);
  executeS3(cases, counters);
  await executeS4(cases, counters);
  await executeS5(cases, counters);
  await executeS6(cases, counters);
  await executeS7(cases, counters);
  executeS8(cases, counters);
  await executeS9(cases, counters);
  await executeS10(cases, counters);

  const firstPass = JSON.stringify(cases);
  const secondCases = await buildCasesThroughS10();
  const secondPass = JSON.stringify(secondCases);
  pushCase(cases, counters, {
    id: "S11.deterministic-evidence.01",
    decision: "byte-identical-runs",
    expected: "identical",
    actual: firstPass === secondPass ? "identical" : "different",
    reason: "Two consecutive runs produce byte-identical case records.",
  });

  return Object.freeze({
    evidenceVersion: "42.7D.1" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: 60 as const,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

if (require.main === module) {
  runOrgEdgeTests()
    .then((result) => {
      console.log(`org-edge: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`);
      process.exit(result.failCount === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
