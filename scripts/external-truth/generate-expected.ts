/**
 * Phase G7 — golden expected output builder (disclosure router contract).
 */
import { join } from "node:path";
import type { ExpectedFiling, ExpectedDisclosureTopic, ExtractedFiling, ReportingFramework } from "./types";
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

function frameworkBinding(framework: ReportingFramework): ExpectedFiling["frameworkBinding"] {
  return {
    primary: framework,
    prohibitsLifo: framework === "ifrs" || framework === "ipsas",
  };
}

function buildTopics(
  vertical: string,
  framework: ReportingFramework,
): ExpectedDisclosureTopic[] {
  const topics = VERTICAL_TOPICS[vertical] ?? ["generic-disclosure"];
  return topics.map((topicIdentifier) => ({
    topicIdentifier,
    reportingFramework: framework,
    disclosureSummaryAuthored: `${topicIdentifier} disclosure surface for ${framework} (metadata-only router output)`,
  }));
}

export function buildExpectedFromExtracted(extracted: ExtractedFiling): ExpectedFiling {
  const expected: ExpectedFiling = {
    schemaVersion: "1.0.0",
    filingId: extracted.filingId,
    vertical: extracted.vertical,
    framework: extracted.framework,
    entityName: extracted.entityName,
    topics: buildTopics(extracted.vertical, extracted.framework),
    numericFacts: extracted.numericFacts,
    frameworkBinding: frameworkBinding(extracted.framework),
  };
  return expected;
}

export function writeExpected(filingPath: string, extracted: ExtractedFiling): ExpectedFiling {
  const expected = buildExpectedFromExtracted(extracted);
  writeJson(join(filingPath, "expected.json"), expected);
  return expected;
}
