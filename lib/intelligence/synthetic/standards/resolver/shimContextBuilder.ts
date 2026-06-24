// Synchronous TreatmentContext synthesizer for legacy vertical shims.
//
// The Phase 42.7A `resolveTreatment` outer wrapper is async (reads memory).
// Existing locked call sites (MFG `9d3afb5`, RTL `d09b31c`) invoke
// `resolveReportingFramework(reportingBasis)` synchronously. To bridge,
// this module builds a minimal `TreatmentContext` from the legacy
// `reportingBasis` string + an industry hint, then the shim hands it
// directly to `resolveTreatmentPure` (which is sync and pure).
//
// This builder is the ONLY place where legacy basis strings get mapped to
// the new resolver input shape. New (non-shim) call sites should use the
// async memory-aware wrapper instead.

import type { ReportingBasis } from "../contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../contracts/StandardsContracts";
import precedenceTableJson from "./treatment-precedence-table.json";
import { lookupSyncElection } from "./syncElectionRegistry";
import type {
  FrameworkCode,
  IndustryHandle,
  ResolveTreatmentInput,
  TreatmentContext,
  TreatmentPrecedenceTable,
} from "./types";

// Legacy reporting-basis strings used by Phase 41.5 / Phase 42.5 verticals.
// These are the *input* surface, not the output. They map to a jurisdiction
// hint via the table below.
export type LegacyReportingBasis =
  | "us_gaap_fasb"
  | "ifrs_iasb"
  | "ifrs_sme"
  | "asc842_candidate";

const LEGACY_BASIS_TO_COUNTRY: Record<LegacyReportingBasis, string> = {
  us_gaap_fasb: "US",
  ifrs_iasb: "GB",
  ifrs_sme: "GB",
  asc842_candidate: "US",
};

const SHIM_PERIOD_KEY = "SHIM_SYNC_CONTEXT";
const SHIM_FISCAL_YEAR_END = "2026-12-31";

export function normalizeToLegacyBasis(
  reportingBasis: LegacyReportingBasis | ReportingBasis,
): LegacyReportingBasis {
  if (reportingBasis === "US_GAAP") {
    return "us_gaap_fasb";
  }
  if (reportingBasis === "IFRS") {
    return "ifrs_iasb";
  }
  return reportingBasis;
}

export function frameworkCodeToStandardsReportingFramework(
  code: FrameworkCode,
): StandardsReportingFramework {
  switch (code) {
    case "US_GAAP":
      return "us_gaap";
    case "IFRS":
      return "ifrs_iasb";
    case "IFRS_SME":
      return "ifrs_for_smes";
    default:
      throw new Error(
        `shimContextBuilder: unsupported FrameworkCode "${code}" for legacy shim`,
      );
  }
}

/**
 * Build a minimal synchronous TreatmentContext for legacy vertical shims.
 *
 * The returned context contains NO memory-derived signals (all historical*
 * fields are null / "unknown") because shims run in a sync, no-I/O path.
 * The pure core treats null historical fields as "no prior signal" and
 * falls through to the curated precedence table.
 */
export function buildShimTreatmentContext(args: {
  reportingBasis: LegacyReportingBasis;
  industry: IndustryHandle["industryCode"];
  companyId?: string;
}): TreatmentContext {
  const country = LEGACY_BASIS_TO_COUNTRY[args.reportingBasis];
  if (!country) {
    throw new Error(
      `shimContextBuilder: unknown legacy reportingBasis "${args.reportingBasis}"`,
    );
  }

  const orgElection = lookupSyncElection(args.companyId);

  const input: ResolveTreatmentInput = {
    orgElection,
    companyMemoryHandle: {
      companyId: args.companyId ?? "00000000-0000-0000-0000-000000000000",
      asOfPeriodKey: SHIM_PERIOD_KEY,
      memoryGroupId: "shim",
      snapshotDeterminismHash: "shim-no-memory",
    },
    knowledgePackageHandle: {
      packageId: `shim-${args.industry.toLowerCase()}`,
      boundPhase37SnapshotHash: "shim-no-binding",
      industry: { industryCode: args.industry, subIndustryCode: null },
    },
    industry: { industryCode: args.industry, subIndustryCode: null },
    jurisdiction: { country, region: null },
    reportingPeriod: {
      periodKey: SHIM_PERIOD_KEY,
      fiscalYearEnd: SHIM_FISCAL_YEAR_END,
    },
  };

  return {
    input,
    precedenceTable: precedenceTableJson as TreatmentPrecedenceTable,
    historicalAttestedFramework: null,
    historicalInferredFramework: null,
    historicalInferredConfidence: "unknown",
    contextDeterminismHash: `shim:${args.industry}:${args.reportingBasis}:${args.companyId ?? "no-company"}`,
  };
}
