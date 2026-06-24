import { hashTreatmentDeterminism } from "../hashTreatmentDeterminism";
import { resolveTreatmentPure } from "../resolveTreatmentPure";
import curatedPrecedenceTable from "../treatment-precedence-table.json";
import type {
  ResolveTreatmentInput,
  TreatmentContext,
  TreatmentPrecedenceTable,
  TreatmentResolution,
} from "../types";

const REQUIRED_RULE_FIELDS = [
  "ruleId",
  "industryFilter",
  "jurisdictionFilter",
  "orgElectionRequired",
  "produces",
  "precedenceWeight",
  "citationRef",
  "reason",
] as const;

function canonicalJson(value: unknown): string {
  const canonicalize = (entry: unknown): unknown => {
    if (entry === undefined) {
      return undefined;
    }
    if (entry === null || typeof entry !== "object") {
      return entry;
    }
    if (Array.isArray(entry)) {
      return entry.map((item) => canonicalize(item));
    }
    const record = entry as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const canonical: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const nested = canonicalize(record[key]);
      if (nested !== undefined) {
        canonical[key] = nested;
      }
    }
    return canonical;
  };
  return JSON.stringify(canonicalize(value));
}

function assertEqualJson(actual: unknown, expected: unknown, label: string): void {
  const actualJson = canonicalJson(actual);
  const expectedJson = canonicalJson(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}\nExpected: ${expectedJson}\nActual:   ${actualJson}`);
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

function buildContext(
  input: ResolveTreatmentInput,
  precedenceTable: TreatmentPrecedenceTable,
): TreatmentContext {
  const contextDeterminismHash = hashTreatmentDeterminism({
    input,
    precedenceTable,
    historicalAttestedFramework: null,
    historicalInferredFramework: null,
    historicalInferredConfidence: "unknown",
  });

  return {
    input,
    precedenceTable,
    historicalAttestedFramework: null,
    historicalInferredFramework: null,
    historicalInferredConfidence: "unknown",
    contextDeterminismHash,
  };
}

function expectedResolution(
  context: TreatmentContext,
  partial: Omit<TreatmentResolution, "treatmentDeterminismHash">,
): TreatmentResolution {
  return {
    ...partial,
    treatmentDeterminismHash: hashTreatmentDeterminism({
      contextDeterminismHash: context.contextDeterminismHash,
      chosenFramework: partial.chosenFramework,
      matchedRules: partial.matchedRules,
      unresolvedConflicts: partial.unresolvedConflicts,
    }),
  };
}

function runGoldenFixture(
  fixtureId: string,
  context: TreatmentContext,
  expected: Omit<TreatmentResolution, "treatmentDeterminismHash">,
): void {
  const actual = resolveTreatmentPure(context);
  const expectedFull = expectedResolution(context, expected);
  assertEqualJson(actual, expectedFull, fixtureId);
}

export function runResolveTreatmentPureGoldenTests(): number {
  const emptyTable: TreatmentPrecedenceTable = {
    schemaVersion: "0.1.0-placeholder",
    generatedBy: "human_curated",
    curatedAt: "2026-06-23T00:00:00Z",
    rules: [],
  };

  const realRulesFromJson = curatedPrecedenceTable as TreatmentPrecedenceTable;
  const rule001 = realRulesFromJson.rules.find((rule) => rule.ruleId === "RULE-001");
  const rule010 = realRulesFromJson.rules.find((rule) => rule.ruleId === "RULE-010");
  if (!rule001 || !rule010) {
    throw new Error("Curated precedence table missing RULE-001 or RULE-010");
  }

  const g01Input = baseInput();
  const g01Context = buildContext(g01Input, emptyTable);
  runGoldenFixture("G01_empty_table", g01Context, {
    chosenFramework: null,
    applicableBasisRef: "basisOf:null:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "precedence_table_empty",
    matchedRules: [],
    unresolvedConflicts: [
      {
        conflictId: "conflict:precedence_table_empty",
        competingFrameworks: [],
        reason: "precedence_table_empty",
        escalationRequired: true,
      },
    ],
    generatedAt: "2026-06-30",
  });

  const g02Table: TreatmentPrecedenceTable = {
    ...emptyTable,
    rules: [
      {
        ruleId: "RULE-001",
        industryFilter: ["MANUFACTURING"],
        jurisdictionFilter: { countries: ["US"] },
        orgElectionRequired: false,
        produces: "US_GAAP",
        precedenceWeight: 100,
        citationRef: "cite:rule-001",
        reason: "",
      },
    ],
  };
  const g02Context = buildContext(g01Input, g02Table);
  runGoldenFixture("G02_single_us_gaap_rule_mfg", g02Context, {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "cite:rule-001",
    matchedRules: ["RULE-001"],
    unresolvedConflicts: [],
    generatedAt: "2026-06-30",
  });

  const g03Table: TreatmentPrecedenceTable = {
    ...emptyTable,
    rules: [
      {
        ruleId: "RULE-001",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: false,
        produces: "IFRS",
        precedenceWeight: 100,
        citationRef: "cite:ifrs-default",
        reason: "",
      },
      {
        ruleId: "RULE-002",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: true,
        produces: "US_GAAP",
        precedenceWeight: 100,
        citationRef: "cite:us-gaap-election",
        reason: "",
      },
    ],
  };
  const g03Input = baseInput({
    orgElection: {
      electedFramework: "US_GAAP",
      electedAt: "2026-01-01T00:00:00Z",
      electedBy: "user-test",
      electionScope: "company",
      electionEvidenceRef: "gov:election-001",
    },
  });
  const g03Context = buildContext(g03Input, g03Table);
  runGoldenFixture("G03_org_election_overrides", g03Context, {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "cite:us-gaap-election",
    matchedRules: ["RULE-002"],
    unresolvedConflicts: [],
    generatedAt: "2026-06-30",
  });

  const g04Table: TreatmentPrecedenceTable = {
    ...emptyTable,
    rules: [
      {
        ruleId: "RULE-001",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: false,
        produces: "US_GAAP",
        precedenceWeight: 200,
        citationRef: "cite:gaap",
        reason: "",
      },
      {
        ruleId: "RULE-002",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: false,
        produces: "IFRS",
        precedenceWeight: 200,
        citationRef: "cite:ifrs",
        reason: "",
      },
    ],
  };
  const g04Context = buildContext(g01Input, g04Table);
  runGoldenFixture("G04_tied_weights_different_frameworks", g04Context, {
    chosenFramework: null,
    applicableBasisRef: "basisOf:null:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "cite:gaap|cite:ifrs",
    matchedRules: [],
    unresolvedConflicts: [
      {
        conflictId: "conflict:tied_weights:IFRS:US_GAAP",
        competingFrameworks: ["IFRS", "US_GAAP"],
        reason: "cite:gaap|cite:ifrs",
        escalationRequired: true,
      },
    ],
    generatedAt: "2026-06-30",
  });

  const g05Table: TreatmentPrecedenceTable = {
    ...emptyTable,
    rules: [
      {
        ruleId: "RULE-002",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: false,
        produces: "US_GAAP",
        precedenceWeight: 150,
        citationRef: "cite:gaap-b",
        reason: "",
      },
      {
        ruleId: "RULE-001",
        industryFilter: "ANY",
        jurisdictionFilter: "ANY",
        orgElectionRequired: false,
        produces: "US_GAAP",
        precedenceWeight: 150,
        citationRef: "cite:gaap-a",
        reason: "",
      },
    ],
  };
  const g05Context = buildContext(g01Input, g05Table);
  runGoldenFixture("G05_tied_weights_same_framework", g05Context, {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "cite:gaap-a",
    matchedRules: ["RULE-001", "RULE-002"],
    unresolvedConflicts: [],
    generatedAt: "2026-06-30",
  });

  const g06Table: TreatmentPrecedenceTable = {
    ...emptyTable,
    rules: [
      {
        ruleId: "RULE-EU",
        industryFilter: "ANY",
        jurisdictionFilter: { countries: ["EU"] },
        orgElectionRequired: false,
        produces: "IFRS",
        precedenceWeight: 100,
        citationRef: "cite:eu-ifrs",
        reason: "",
      },
    ],
  };
  const g06Context = buildContext(g01Input, g06Table);
  runGoldenFixture("G06_jurisdiction_filter_excludes", g06Context, {
    chosenFramework: null,
    applicableBasisRef: "basisOf:null:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: "no_matching_rules",
    matchedRules: [],
    unresolvedConflicts: [
      {
        conflictId: "conflict:no_matching_rules",
        competingFrameworks: [],
        reason: "no_matching_rules",
        escalationRequired: true,
      },
    ],
    generatedAt: "2026-06-30",
  });

  const g07Input = baseInput({
    industry: { industryCode: "MANUFACTURING", subIndustryCode: null },
    jurisdiction: { country: "US", region: null },
    orgElection: null,
  });
  const g07Context = buildContext(g07Input, realRulesFromJson);
  runGoldenFixture("G07_populated_table_us_mfg", g07Context, {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: rule001.reason,
    matchedRules: ["RULE-001"],
    unresolvedConflicts: [],
    generatedAt: "2026-06-30",
  });

  const g08Input = baseInput({
    industry: { industryCode: "MANUFACTURING", subIndustryCode: null },
    jurisdiction: { country: "CA", region: null },
    orgElection: null,
  });
  const g08Context = buildContext(g08Input, realRulesFromJson);
  runGoldenFixture("G08_populated_table_ca_mfg", g08Context, {
    chosenFramework: "IFRS",
    applicableBasisRef: "basisOf:IFRS:2026-Q2",
    effectiveDate: "2026-06-30",
    precedenceReasoning: rule010.reason,
    matchedRules: ["RULE-010"],
    unresolvedConflicts: [],
    generatedAt: "2026-06-30",
  });

  return 8;
}

if (require.main === module) {
  try {
    const count = runResolveTreatmentPureGoldenTests();
    console.log(`PASS resolveTreatmentPure.golden (${count} fixtures)`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
