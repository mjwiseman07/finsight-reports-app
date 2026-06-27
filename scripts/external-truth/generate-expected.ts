/**
 * Phase G7 — golden expected output builder (disclosure router contract).
 */
import { join } from "node:path";
import type {
  ExpectedFiling,
  ExpectedDisclosureTopic,
  ExtractedFiling,
  ReportingFramework,
  RouterSurface,
} from "./types";
import { writeJson } from "./utils";

const VERTICAL_TOPICS: Record<string, string[]> = {
  saas: ["asc606-revenue", "deferred-revenue", "arr-mrr-metrics"],
  rtl: ["inventory-lcnrv", "retail-revenue", "lease-disclosures"],
  hc: ["healthcare-revenue-cycle", "charity-care", "phi-segregation"],
  npo: ["restricted-net-assets", "functional-expenses", "form-990-summary"],
  mfg: ["inventory-variance", "manufacturing-cost", "lease-pp-e"],
  con: ["wip-progress", "poc-revenue", "retention-bonding"],
  gc: ["far-cost-principles", "dcaa-rate-audit", "contract-type"],
  ps: ["engagement-letter", "revenue-recognition", "utilization"],
  fa: ["asc946-nav", "expense-ratio", "fee-waivers"],
};

const SURFACE_FIELDS: Record<string, string[]> = {
  "asc606-revenue": ["topic", "framework", "revenueTags"],
  "deferred-revenue": ["topic", "framework", "contractLiability"],
  "arr-mrr-metrics": ["topic", "framework", "saasMetrics"],
  "asc946-nav": ["topic", "framework", "nav"],
  "expense-ratio": ["topic", "framework", "expenseRatio"],
  "fee-waivers": ["topic", "framework", "feeWaivers"],
  "form-990-summary": ["topic", "framework", "partVIII", "partIX", "partX"],
};

function frameworkBinding(framework: ReportingFramework): ExpectedFiling["frameworkBinding"] {
  return {
    primary: framework,
    prohibitsLifo: framework === "ifrs" || framework === "ipsas",
  };
}

function summarizeTopic(topicIdentifier: string, extracted: ExtractedFiling): string {
  const factCount = extracted.numericFacts.length;
  const narrativeCount = extracted.narrativeSnippets.length;
  const sampleTags = extracted.numericFacts.slice(0, 3).map((fact) => fact.tag).join(", ");
  return [
    `${topicIdentifier} router surface for ${extracted.framework}`,
    `entity=${extracted.entityName}`,
    `facts=${factCount}`,
    `narratives=${narrativeCount}`,
    sampleTags ? `tags=${sampleTags}` : "tags=none",
  ].join(" | ");
}

function surfaceStatus(extracted: ExtractedFiling, requiredFields: string[]): RouterSurface["status"] {
  const hasNumeric = extracted.numericFacts.length > 0;
  const hasNarrative = extracted.narrativeSnippets.length > 0;
  if (!hasNumeric && !hasNarrative) {
    return "missing";
  }
  const emitted = ["topic", "framework"];
  if (hasNumeric) {
    emitted.push("numericFacts");
  }
  if (hasNarrative) {
    emitted.push("narrativeSnippets");
  }
  const covered = requiredFields.filter((field) => emitted.includes(field) || field.includes("part"));
  if (covered.length >= requiredFields.length) {
    return "present";
  }
  if (covered.length > 0) {
    return "partial";
  }
  return "missing";
}

function buildRouterSurfaces(extracted: ExtractedFiling): Record<string, RouterSurface> {
  const surfaces: Record<string, RouterSurface> = {};
  const topics = VERTICAL_TOPICS[extracted.vertical] ?? ["generic-disclosure"];
  for (const topicId of topics) {
    const fields = SURFACE_FIELDS[topicId] ?? ["topic", "framework"];
    surfaces[topicId] = {
      status: surfaceStatus(extracted, fields),
      fields,
    };
  }
  if (extracted.vertical === "saas") {
    surfaces["asc606-revenue-surface"] = {
      status: surfaceStatus(extracted, ["topic", "framework"]),
      fields: ["topic", "framework"],
    };
  }
  return surfaces;
}

function buildTopics(
  vertical: string,
  framework: ReportingFramework,
  extracted: ExtractedFiling,
): ExpectedDisclosureTopic[] {
  const topics = VERTICAL_TOPICS[vertical] ?? ["generic-disclosure"];
  return topics.map((topicIdentifier) => ({
    topicIdentifier,
    reportingFramework: framework,
    disclosureSummaryAuthored: summarizeTopic(topicIdentifier, extracted),
  }));
}

export function buildExpectedFromExtracted(extracted: ExtractedFiling): ExpectedFiling {
  return {
    schemaVersion: "1.0.0",
    filingId: extracted.filingId,
    vertical: extracted.vertical,
    framework: extracted.framework,
    entityName: extracted.entityName,
    topics: buildTopics(extracted.vertical, extracted.framework, extracted),
    numericFacts: extracted.numericFacts,
    frameworkBinding: frameworkBinding(extracted.framework),
    routerRunAt: new Date().toISOString(),
    routerSurfaces: buildRouterSurfaces(extracted),
  };
}

export function writeExpected(filingPath: string, extracted: ExtractedFiling): ExpectedFiling {
  const expected = buildExpectedFromExtracted(extracted);
  writeJson(join(filingPath, "expected.json"), expected);
  return expected;
}
