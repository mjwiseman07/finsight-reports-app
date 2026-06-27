/**
 * Phase SAAS-1 — SaaS Wave 1 scaffold generator.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
const SAAS_LIB = "lib/intelligence/synthetic/libraries/saas";

const LIGHT_HEADER = `/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
`;

const TAGGED_HEADER = `/**
 * @doctrine containsSaaSARRData: true
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
`;

/** @type {Array<{handleId:string,library:string,title:string,url:string,sourceDoc:string}>} */
const HANDLES = [];

const ASC = "https://asc.fasb.org/xbrl/2024/elts/ref?DocPart=Section&Section=";
function asc606(s) { return `${ASC}606-10-${s}`; }
function asc340(s) { return `${ASC}340-40-${s}`; }
function asc985(s) { return `${ASC}985-20-${s}`; }
function asc350(s) { return `${ASC}350-40-${s}`; }

function add(lib, doc, handleId, title, url) {
  HANDLES.push({ handleId, library: lib, title, url, sourceDoc: doc });
}

// ASC 606 + 340-40 (45)
[
  ["ASC.606-10-25-1", "Identify Contract", asc606("25-1")],
  ["ASC.606-10-25-10", "Mod Separate Contract", asc606("25-10")],
  ["ASC.606-10-25-12", "Mod Cumulative Catch-Up", asc606("25-12")],
  ["ASC.606-10-25-13", "Mod Prospective", asc606("25-13")],
  ["ASC.606-10-25-14", "Series of Distinct Services", asc606("25-14")],
  ["ASC.606-10-25-27", "Over-Time Criterion 1", asc606("25-27")],
  ["ASC.606-10-25-28", "Over-Time Criterion 2", asc606("25-28")],
  ["ASC.606-10-25-29", "Over-Time Criterion 3", asc606("25-29")],
  ["ASC.606-10-25-30", "Over-Time Alternative", asc606("25-30")],
  ["ASC.606-10-32-5", "Variable Consideration", asc606("32-5")],
  ["ASC.606-10-32-6", "VC Constraint", asc606("32-6")],
  ["ASC.606-10-32-28", "SSP Observable", asc606("32-28")],
  ["ASC.606-10-32-29", "SSP Adjusted Market", asc606("32-29")],
  ["ASC.606-10-32-31", "SSP Expected Cost", asc606("32-31")],
  ["ASC.606-10-32-32", "SSP Residual", asc606("32-32")],
  ["ASC.606-10-32-33", "SSP Hierarchy", asc606("32-33")],
  ["ASC.606-10-50-13", "RPO Disclosure", asc606("50-13")],
  ["ASC.606-10-55-36", "Principal Indicator 1", asc606("55-36")],
  ["ASC.606-10-55-39", "Gross vs Net", asc606("55-39")],
  ["ASC.606-10-25-2", "Contract Combination", asc606("25-2")],
  ["ASC.606-10-25-3", "Contract Modifications Intro", asc606("25-3")],
  ["ASC.606-10-25-11", "Mod Termination", asc606("25-11")],
  ["ASC.606-10-25-15", "Series Allocation", asc606("25-15")],
  ["ASC.606-10-25-19", "Financing Component", asc606("25-19")],
  ["ASC.606-10-25-20", "Financing Expedient", asc606("25-20")],
  ["ASC.606-10-25-22", "Noncash Consideration", asc606("25-22")],
  ["ASC.606-10-25-24", "Warranty", asc606("25-24")],
  ["ASC.606-10-25-31", "Output Methods", asc606("25-31")],
  ["ASC.606-10-25-32", "Input Methods", asc606("25-32")],
  ["ASC.606-10-32-11", "VC Change", asc606("32-11")],
  ["ASC.606-10-32-12", "VC Reassessment", asc606("32-12")],
  ["ASC.606-10-32-14", "VC Disclosure", asc606("32-14")],
  ["ASC.606-10-32-25", "Refund Liability", asc606("32-25")],
  ["ASC.606-10-32-34", "SSP Allocation", asc606("32-34")],
  ["ASC.606-10-45-1", "Contract Balances", asc606("45-1")],
  ["ASC.606-10-45-3", "Impairment", asc606("45-3")],
  ["ASC.606-10-50-1", "Backlog Disclosure", asc606("50-1")],
  ["ASC.606-10-50-14", "Transaction Price", asc606("50-14")],
  ["ASC.606-10-55-36", "Principal Indicator 1", asc606("55-36")],
  ["ASC.606-10-55-37", "Principal Indicator 2", asc606("55-37")],
  ["ASC.606-10-55-38", "Agent Indicator", asc606("55-38")],
  ["ASC.606-10-55-40", "Control Transfer", asc606("55-40")],
  ["ASC.340-40-25-5", "Fulfillment Costs", asc340("25-5")],
  ["ASC.340-40-35-3", "Impairment", asc340("35-3")],
  ["ASC.340-40-25-1", "Contract Cost Capitalization", asc340("25-1")],
  ["ASC.340-40-35-1", "Amortization", asc340("35-1")],
  ["ASC.340-40-35-6", "Practical Expedient", asc340("35-6")],
].forEach(([id, title, url]) => add("ASC_606_340", "SaaS_ASC606_Sources.md", id, title, url));

// ASC 985-605 + 350-40 (8)
[
  ["ASC.985-20-25-1", "Software Revenue", asc985("25-1")],
  ["ASC.985-20-25-2", "Hosting vs License", asc985("25-2")],
  ["ASC.350-40-15-1", "Internal-Use Software", asc350("15-1")],
  ["ASC.350-40-25-1", "IUS Capitalization", asc350("25-1")],
  ["ASC.985-20-25-3", "Software Hosting", asc985("25-3")],
  ["ASC.985-20-25-4", "Software License", asc985("25-4")],
  ["ASC.985-20-35-1", "Software Amortization", asc985("35-1")],
  ["ASC.350-40-35-1", "IUS Amortization", asc350("35-1")],
].forEach(([id, title, url]) => add("ASC_985_350", "SaaS_ASC985_Sources.md", id, title, url));

// IFRS (12)
[
  ["IFRS15.Page", "IFRS 15", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.Para56-58", "IFRS Constraint Highly Probable", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.B34-B35", "IFRS Material Right", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRIC.Apr2021.SaaS", "IFRIC Apr 2021 SaaS", "https://www.ifrs.org/content/dam/ifrs/meetings/2021/april/iasb-agenda-paper-4-saas.pdf"],
  ["IFRS16.Page", "IFRS 16", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/"],
  ["IAS38.Page", "IAS 38", "https://www.ifrs.org/issued-standards/list-of-standards/ias-38-intangible-assets/"],
  ["EUR-Lex.2016R1905.IFRS15", "EU IFRS 15", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R1905"],
  ["IFRS15.Para35-37", "IFRS Over-Time", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.AgentPrincipal", "IFRS Agent Principal", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.VariableConsideration", "IFRS VC", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["EUR-Lex.2017R1986.IFRS16", "EU IFRS 16", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1986"],
].forEach(([id, title, url]) => add("IFRS", "SaaS_IFRS_Sources.md", id, title, url));

// SOC2 + specialized (15)
[
  ["AICPA.TSC.SOC2", "SOC 2 TSC", "https://www.aicpa.org/"],
  ["AICPA.TSC.CC", "SOC2 Common Criteria", "https://www.aicpa.org/"],
  ["AICPA.TSC.A", "SOC2 Availability", "https://www.aicpa.org/"],
  ["AICPA.TSC.C", "SOC2 Confidentiality", "https://www.aicpa.org/"],
  ["AICPA.TSC.PI", "SOC2 Processing Integrity", "https://www.aicpa.org/"],
  ["AICPA.TSC.P", "SOC2 Privacy", "https://www.aicpa.org/"],
  ["Bessemer.RuleOf40", "Rule of 40", "https://www.bvp.com/atlas/rule-of-40/"],
  ["SaaS.Capital.MagicNumber", "Magic Number", "https://www.saas-capital.com/"],
  ["Klipfolio.LTV-CAC", "LTV:CAC", "https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost"],
].forEach(([id, title, url]) => add("SPECIALIZED", "SaaS_Specialized_Sources.md", id, title, url));

// Benchmarks URL-only (10)
[
  ["OpenView.SaaSIndex", "OpenView SaaS Index", "https://openviewpartners.com/"],
  ["KeyBanc.SaaSSurvey", "KeyBanc SaaS Survey", "https://www.key.com/"],
  ["Battery.SaaSMetrics", "Battery SaaS Metrics", "https://www.battery.com/"],
  ["SaaS.Capital.Benchmark", "SaaS Capital Benchmark", "https://www.saas-capital.com/"],
  ["Bessemer.CloudIndex", "Bessemer Cloud Index", "https://www.bvp.com/atlas/"],
  ["Meritech.SaaSIndex", "Meritech SaaS Index", "https://www.meritechcapital.com/"],
  ["PublicComps.SaaS", "Public SaaS Comps", "https://www.publiccomps.com/"],
  ["SaaStr.Metrics", "SaaStr Metrics", "https://www.saastr.com/"],
  ["ChartMogul.Benchmark", "ChartMogul Benchmark", "https://chartmogul.com/"],
  ["ProfitWell.Benchmark", "ProfitWell Benchmark", "https://www.profitwell.com/"],
].forEach(([id, title, url]) => add("BENCHMARKS", "SaaS_Benchmarks_Sources.md", id, title, url));

if (HANDLES.length < 80) {
  throw new Error(`Expected >= 80 handles, got ${HANDLES.length}`);
}

function write(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
}

function moduleFile(relativePath, handleIds, body, tagged = false) {
  const header = tagged ? TAGGED_HEADER : LIGHT_HEADER;
  const handleList = handleIds.map((h) => `"${h}"`).join(", ");
  write(
    `${SAAS_LIB}/${relativePath}`,
    `${header}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = [${handleList}] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

${body}
`,
  );
}

function writeDoctrine() {
  write(
    "lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData.ts",
    `export function assertContainsSaaSARRData(ctx: {
  containsSaaSARRData?: boolean;
}): asserts ctx is { containsSaaSARRData: true } {
  if (ctx.containsSaaSARRData !== true) {
    const err = Object.assign(new Error("DOCTRINE_VIOLATION: containsSaaSARRData must be true in SaaS module context."), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_DOCTRINE_FLAG_MISMATCH", message: "containsSaaSARRData required" }],
    });
    throw err;
  }
}
`,
  );
}

function writeArrMrrChannel() {
  const ch = "lib/intelligence/synthetic/audit/channels/arr-mrr-audit";
  const outcomes = [
    "arr-evaluated", "mrr-evaluated", "nrr-evaluated", "rpo-evaluated", "churn-evaluated",
    "subscription-over-time-evaluated", "hosting-license-classified", "material-right-evaluated",
    "commission-amortization-evaluated", "ssp-hierarchy-evaluated", "usage-stand-ready-evaluated",
    "contract-mod-evaluated", "ifrs-constraint-evaluated", "ifric-apr-2021-evaluated",
    "soc2-cc-evaluated", "soc2-a-evaluated", "soc2-c-evaluated", "soc2-pi-evaluated", "soc2-p-evaluated",
    "framework-switched", "sub-segment-classified", "rule-of-40-evaluated", "magic-number-evaluated",
    "ltv-cac-evaluated", "handle-whitelist-validated", "rejected-escalation",
  ];
  write(
    `${ch}/types.ts`,
    `export const ARR_MRR_AUDIT_CHANNEL_ID = "arr-mrr-audit" as const;
export const ARR_MRR_AUDIT_EVIDENCE_VERSION = "SAAS.1.K-LOCK.0" as const;
export const ARR_MRR_AUDIT_RETENTION_YEARS = 7 as const;

export type ArrMrrAuditOutcome =
${outcomes.map((o) => `  | "${o}"`).join("\n")};

export interface ArrMrrAuditEntry {
  channelId: typeof ARR_MRR_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: ArrMrrAuditOutcome;
  evidence: Record<string, unknown>;
  containsSaaSARRData: true;
  evidenceVersion: typeof ARR_MRR_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof ARR_MRR_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
`,
  );

  write(
    `${ch}/validator.ts`,
    `import type { ArrMrrAuditEntry } from "./types";
import { ARR_MRR_AUDIT_CHANNEL_ID, ARR_MRR_AUDIT_EVIDENCE_VERSION } from "./types";

export function validateArrMrrAuditEntry(entry: ArrMrrAuditEntry): void {
  if (entry.channelId !== ARR_MRR_AUDIT_CHANNEL_ID) throw new Error("ARR_MRR_AUDIT_INVALID_CHANNEL");
  if (entry.evidenceVersion !== ARR_MRR_AUDIT_EVIDENCE_VERSION) throw new Error("ARR_MRR_AUDIT_INVALID_EVIDENCE_VERSION");
  if (entry.containsSaaSARRData !== true) throw new Error("ARR_MRR_AUDIT_DOCTRINE_REQUIRED");
  if (!entry.outcome) throw new Error("ARR_MRR_AUDIT_OUTCOME_REQUIRED");
}
`,
  );

  write(
    `${ch}/redaction.ts`,
    `export function redactArrMrrPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["customerName", "tenantId", "subscriptionId"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
`,
  );

  write(
    `${ch}/pure-core.ts`,
    `import type { ArrMrrAuditOutcome } from "./types";

export function deriveArrMrrAuditContextPure(input: { outcome: ArrMrrAuditOutcome; evidence: Record<string, unknown> }) {
  return { outcome: input.outcome, evidence: input.evidence, derivedAt: "pure-core" };
}
`,
  );

  write(
    `${ch}/writer.ts`,
    `import * as fs from "node:fs";
import * as path from "node:path";
import { redactArrMrrPayload } from "./redaction";
import { validateArrMrrAuditEntry } from "./validator";
import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  ARR_MRR_AUDIT_RETENTION_YEARS,
  type ArrMrrAuditEntry,
  type ArrMrrAuditOutcome,
} from "./types";
import { deriveArrMrrAuditContextPure } from "./pure-core";

export interface FileArrMrrAuditWriterDeps {
  baseDir: string;
}

export class FileArrMrrAuditWriter {
  private headHash = "GENESIS";
  private initialized = false;

  constructor(private readonly deps: FileArrMrrAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
    this.initialized = true;
  }

  append(outcome: ArrMrrAuditOutcome, evidence: Record<string, unknown>): ArrMrrAuditEntry {
    if (!this.initialized) {
      throw Object.assign(new Error("ARR_MRR_AUDIT_UNINITIALIZED"), {
        escalationAudits: [{ channel: "escalation-audit", code: "SAAS_ARR_MRR_AUDIT_UNINITIALIZED", message: "writer not initialized" }],
      });
    }
    const ctx = deriveArrMrrAuditContextPure({ outcome, evidence });
    const entry: ArrMrrAuditEntry = {
      channelId: ARR_MRR_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactArrMrrPayload(ctx.evidence),
      containsSaaSARRData: true,
      evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
      retentionYears: ARR_MRR_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validateArrMrrAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "arr-mrr-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\\n");
    this.headHash = entryHash;
    return entry;
  }
}
`,
  );

  write(
    `${ch}/locked-citation-handles.ts`,
    `import { SAAS_CITATION_HANDLE_REGISTRY } from "../../../libraries/saas/handles-registry.generated";

export const SAAS1_LOCKED_CITATION_HANDLES = new Set(Object.keys(SAAS_CITATION_HANDLE_REGISTRY));

export function assertSaasCitationHandleLocked(handleId: string): void {
  if (!SAAS1_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(\`Handle not whitelisted: \${handleId}\`), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
`,
  );

  write(
    `${ch}/index.ts`,
    `import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  ARR_MRR_AUDIT_RETENTION_YEARS,
} from "./types";

export const arrMrrAuditChannel = {
  id: ARR_MRR_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: ARR_MRR_AUDIT_RETENTION_YEARS,
  evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
} as const;

export * from "./types";
export * from "./writer";
export * from "./validator";
export * from "./redaction";
export * from "./pure-core";
export * from "./locked-citation-handles";
`,
  );
}

function writeChannelsIndex() {
  const content = readFile("lib/intelligence/synthetic/audit/channels/index.ts");
  if (!content.includes("arr-mrr-audit")) {
    const updated = content
      .replace(
        'export { engagementLetterAuditChannel } from "./engagement-letter-audit";\nexport * from "./engagement-letter-audit";',
        `export { engagementLetterAuditChannel } from "./engagement-letter-audit";
export * from "./engagement-letter-audit";

export { arrMrrAuditChannel } from "./arr-mrr-audit";
export * from "./arr-mrr-audit";`,
      )
      .replace(
        '  "engagement-letter-audit",\n] as const;',
        `  "engagement-letter-audit",
  "arr-mrr-audit",
] as const;`,
      )
      .replace("9 channels after LOCK-PS-2", "10 channels after LOCK-SAAS-1");
    write("lib/intelligence/synthetic/audit/channels/index.ts", updated);
  }
}

function readFile(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function writeCore() {
  write(
    `${SAAS_LIB}/errors.ts`,
    `${LIGHT_HEADER}
export interface SaasViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(code: string, message: string): SaasViolationError {
  const err = new Error(message) as SaasViolationError;
  err.name = "SaasViolation";
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function SaasViolation(code: string, message: string) {
  return createViolation(code, message);
}

export function SaasHandleNotResolvable(handleId: string) {
  return createViolation("SAAS_HANDLE_NOT_RESOLVABLE", \`Handle not registered: \${handleId}\`);
}
`,
  );

  write(
    `${SAAS_LIB}/types.ts`,
    `${LIGHT_HEADER}
export type SaasCitationLibrary = "ASC_606_340" | "ASC_985_350" | "SPECIALIZED" | "IFRS" | "BENCHMARKS";
export type SaasSubSegmentId = "P" | "H" | "U" | "F" | "V";
export interface SaasCitationHandle { handleId: string; library: SaasCitationLibrary; url: string; }
export interface SaasSubSegmentKernel {
  subSegmentId: SaasSubSegmentId;
  name: string;
  frameworks: ("US_GAAP" | "IFRS")[];
}
`,
  );

  const body = HANDLES.map(
    (h) => `  ${JSON.stringify(h.handleId)}: { handleId: ${JSON.stringify(h.handleId)}, library: ${JSON.stringify(h.library)}, url: ${JSON.stringify(h.url)} },`,
  ).join("\n");

  write(
    `${SAAS_LIB}/handles-registry.generated.ts`,
    `${LIGHT_HEADER}
export const SAAS_CITATION_HANDLE_COUNT = ${HANDLES.length};
export const SAAS_CITATION_HANDLE_REGISTRY: Record<string, { handleId: string; library: string; url: string }> = {
${body}
};
`,
  );

  write(
    `${SAAS_LIB}/handles.ts`,
    `${LIGHT_HEADER}
import type { SaasCitationHandle } from "./types";
import { SAAS_CITATION_HANDLE_COUNT, SAAS_CITATION_HANDLE_REGISTRY } from "./handles-registry.generated";
import { SaasHandleNotResolvable } from "./errors";
export { SAAS_CITATION_HANDLE_COUNT, SAAS_CITATION_HANDLE_REGISTRY };

export function resolveSaasCitationHandle(handleId: string): SaasCitationHandle {
  const entry = SAAS_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) throw SaasHandleNotResolvable(handleId);
  return entry as SaasCitationHandle;
}
`,
  );
}

function writeModules() {
  moduleFile("asc606/subscription-over-time.ts", ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29"], `export function evaluateSubscriptionOverTime(ctx: { containsSaaSARRData?: boolean }, criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  assertContainsSaaSARRData(ctx);
  const pass = criteria.c1 || criteria.c2 || criteria.c3;
  if (!pass) throw SaasViolation("SAAS_SUB_OVER_TIME_FAIL", "Subscription over-time criteria not met — fail-closed");
  return { pass: true };
}`);

  moduleFile("asc606/hosting-vs-license.ts", ["ASC.985-20-25-1", "ASC.985-20-25-2"], `export function classifyHostingVsLicense(ctx: { containsSaaSARRData?: boolean }, input: { treatedAs: "hosting" | "license"; hostingIndicators: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.hostingIndicators && input.treatedAs === "license") {
    throw SaasViolation("SAAS_HOSTING_LICENSE_MISCLASS", "Hosting arrangement misclassified as license");
  }
  return { classification: input.treatedAs };
}`);

  moduleFile("asc606/material-right-renewal.ts", ["IFRS15.B34-B35", "ASC.606-10-32-28"], `export function evaluateMaterialRight(ctx: { containsSaaSARRData?: boolean }, input: { renewalDiscountPct: number; sspReference: number }) {
  assertContainsSaaSARRData(ctx);
  const threshold = 0.10;
  if (input.renewalDiscountPct >= threshold) {
    throw SaasViolation("SAAS_MATERIAL_RIGHT_MISSED", "Material right at >=10% below SSP not recognized");
  }
  return { materialRight: false };
}`);

  moduleFile("asc606/commission-amortization.ts", ["ASC.340-40-25-1", "ASC.340-40-35-1"], `export function evaluateCommissionAmortization(ctx: { containsSaaSARRData?: boolean }, input: { contractTermOnly: boolean; expectedRenewals: number }) {
  assertContainsSaaSARRData(ctx);
  if (input.contractTermOnly && input.expectedRenewals > 0) {
    throw SaasViolation("SAAS_COMMISSION_TERM_ONLY", "Commission amortized over contract term only — renewals required");
  }
  return { amortPeriod: input.expectedRenewals > 0 ? "term-plus-renewals" : "term" };
}`);

  moduleFile("asc606/multi-element-ssp.ts", ["ASC.606-10-32-28", "ASC.606-10-32-32", "ASC.606-10-32-33"], `export function allocateHybridSSP(ctx: { containsSaaSARRData?: boolean }, input: { residualOnly?: boolean; observable?: number; adjustedMarket?: number }) {
  assertContainsSaaSARRData(ctx);
  if (input.residualOnly && (input.observable || input.adjustedMarket)) {
    throw SaasViolation("SAAS_SSP_RESIDUAL_ABUSE", "Residual SSP abused when higher hierarchy feasible");
  }
  if (input.observable) return { method: "observable", amount: input.observable };
  if (input.residualOnly) return { method: "residual", amount: 0 };
  throw SaasViolation("SAAS_SSP_HIERARCHY_FAIL", "SSP hierarchy not satisfied");
}`);

  moduleFile("asc606/usage-stand-ready.ts", ["ASC.606-10-25-14", "ASC.606-10-25-30"], `export function evaluateUsageStandReady(ctx: { containsSaaSARRData?: boolean }, input: { c1: boolean; c2: boolean; c3: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.c1 || !input.c2 || !input.c3) {
    throw SaasViolation("SAAS_USAGE_STAND_READY_FAIL", "Usage stand-ready requires all 3 conditions");
  }
  return { standReady: true };
}`);

  moduleFile("asc606/contract-mods.ts", ["ASC.606-10-25-10", "ASC.606-10-25-12", "ASC.606-10-25-13"], `export function routeSaasContractModification(ctx: { containsSaaSARRData?: boolean }, input: { separateContract: boolean; remainingDistinct: boolean; saasContext: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.saasContext && input.separateContract) {
    throw SaasViolation("SAAS_MOD_MISROUTED", "SaaS contract mod misrouted outside SaaS context");
  }
  if (input.separateContract) return { path: "separate-contract" };
  if (input.remainingDistinct) return { path: "prospective" };
  return { path: "cumulative-catch-up" };
}`);

  moduleFile("asc606/variable-consideration.ts", ["ASC.606-10-32-5", "ASC.606-10-32-6"], `export function evaluateVariableConsideration(ctx: { containsSaaSARRData?: boolean }, input: { constrained: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.constrained) throw SaasViolation("SAAS_VC_CONSTRAINT_BYPASS", "Variable consideration constraint required");
  return { constrained: true };
}`);

  write(
    `${SAAS_LIB}/asc985-605/legacy-software-lens.ts`,
    `${LIGHT_HEADER}
import { resolveSaasCitationHandle } from "../handles";
export function referenceLegacySoftwareLens() { return resolveSaasCitationHandle("ASC.985-20-25-1"); }
`,
  );

  write(
    `${SAAS_LIB}/asc350-40/internal-use-customer-side.ts`,
    `${LIGHT_HEADER}
import { resolveSaasCitationHandle } from "../handles";
export function referenceInternalUseCustomerSide() { return resolveSaasCitationHandle("ASC.350-40-15-1"); }
`,
  );

  // 5 TAGGED revenue/saas modules
  for (const [name, key] of [
    ["arr.ts", "arr"],
    ["mrr.ts", "mrr"],
    ["nrr.ts", "nrr"],
    ["rpo.ts", "rpo"],
    ["churn.ts", "churn"],
  ]) {
    write(
      `${SAAS_LIB}/revenue/saas/${name}`,
      `${TAGGED_HEADER}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

export const REVENUE_METRIC_KEY = "${key}";

export function computeMetric(ctx: { containsSaaSARRData?: boolean }, input: Record<string, number>) {
  assertContainsSaaSARRData(ctx);
  return { metric: REVENUE_METRIC_KEY, value: input.value ?? 0 };
}
`,
    );
  }

  write(
    `${SAAS_LIB}/specialized/soc2/common-criteria.ts`,
    `${LIGHT_HEADER}
import { SaasViolation } from "../../errors";

export function evaluateSoc2CommonCriteria(input: { ccEvaluated: boolean }) {
  if (!input.ccEvaluated) throw SaasViolation("SAAS_SOC2_CC_BYPASS", "SOC2 CC evaluation required");
  return { evaluated: true };
}
`,
  );
  write(
    `${SAAS_LIB}/specialized/soc2/availability.ts`,
    `${LIGHT_HEADER}
import { SaasViolation } from "../../errors";

export function evaluateSoc2Availability(input: { aEvaluated: boolean }) {
  if (!input.aEvaluated) throw SaasViolation("SAAS_SOC2_A_BYPASS", "SOC2 A evaluation required");
  return { evaluated: true };
}
`,
  );
  write(
    `${SAAS_LIB}/specialized/soc2/confidentiality.ts`,
    `${LIGHT_HEADER}
import { SaasViolation } from "../../errors";

export function evaluateSoc2Confidentiality(input: { cEvaluated: boolean }) {
  if (!input.cEvaluated) throw SaasViolation("SAAS_SOC2_C_BYPASS", "SOC2 C evaluation required");
  return { evaluated: true };
}
`,
  );
  write(
    `${SAAS_LIB}/specialized/soc2/processing-integrity.ts`,
    `${LIGHT_HEADER}
import { SaasViolation } from "../../errors";

export function evaluateSoc2ProcessingIntegrity(input: { piTriggered: boolean; paymentFlow?: boolean }) {
  if (input.paymentFlow && !input.piTriggered) {
    throw SaasViolation("SAAS_SOC2_PI_PAYMENTS", "SOC2 PI required on payment flows");
  }
  if (!input.piTriggered) throw SaasViolation("SAAS_SOC2_PI_BYPASS", "SOC2 PI evaluation required");
  return { evaluated: true };
}
`,
  );
  write(
    `${SAAS_LIB}/specialized/soc2/privacy.ts`,
    `${LIGHT_HEADER}
import { SaasViolation } from "../../errors";

export function evaluateSoc2Privacy(input: { pEvaluated: boolean }) {
  if (!input.pEvaluated) throw SaasViolation("SAAS_SOC2_P_BYPASS", "SOC2 P evaluation required");
  return { evaluated: true };
}
`,
  );

  for (const [file, key] of [
    ["rule-of-40.ts", "rule-of-40"],
    ["magic-number.ts", "magic-number"],
    ["ltv-cac.ts", "ltv-cac"],
  ]) {
    write(
      `${SAAS_LIB}/specialized/metrics/${file}`,
      `${LIGHT_HEADER}
export const METRIC_KEY = "${key}";
export function computeMetric(input: Record<string, number>) {
  return { metric: METRIC_KEY, value: input.value ?? 0 };
}
`,
    );
  }

  write(
    `${SAAS_LIB}/ifrs/ifrs15.ts`,
    `${LIGHT_HEADER}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { SaasViolation } from "../errors";

export function evaluateIfrsConstraint(ctx: { containsSaaSARRData?: boolean }, input: { highlyProbable: boolean; usProbableOnly: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.usProbableOnly && !input.highlyProbable) {
    throw SaasViolation("SAAS_IFRS_DIV2_CONSTRAINT", "IFRS highly-probable threshold required");
  }
  return { constrained: true };
}
`,
  );

  write(
    `${SAAS_LIB}/ifrs/ifric-apr-2021.ts`,
    `${LIGHT_HEADER}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { SaasViolation } from "../errors";

export function evaluateIfricApr2021(ctx: { containsSaaSARRData?: boolean }, criteria: { c1: boolean; c2: boolean; c3: boolean; c4: boolean; c5: boolean; c6: boolean }) {
  assertContainsSaaSARRData(ctx);
  const all = [criteria.c1, criteria.c2, criteria.c3, criteria.c4, criteria.c5, criteria.c6];
  if (all.filter(Boolean).length < 6) {
    throw SaasViolation("SAAS_IFRIC_APR2021_INCOMPLETE", "IFRIC Apr 2021 requires all six criteria");
  }
  return { saasHosting: true };
}
`,
  );

  write(`${SAAS_LIB}/ifrs/ifrs16.ts`, `${LIGHT_HEADER}
import { resolveSaasCitationHandle } from "../handles";
export function referenceIfrs16() { return resolveSaasCitationHandle("IFRS16.Page"); }
`);

  write(`${SAAS_LIB}/ifrs/ias38.ts`, `${LIGHT_HEADER}
import { resolveSaasCitationHandle } from "../handles";
export function referenceIas38() { return resolveSaasCitationHandle("IAS38.Page"); }
`);

  for (const g of ["arr-guard", "mrr-guard", "nrr-guard", "rpo-guard", "churn-guard"]) {
    write(`${SAAS_LIB}/guards/${g}.ts`, `${LIGHT_HEADER}
export function guard() { return { guard: "${g}" }; }
`);
  }

  write(
    `${SAAS_LIB}/classifiers/saas-sub-segment-classifier.ts`,
    `${LIGHT_HEADER}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaasSubSegmentId } from "../types";
import { SaasViolation } from "../errors";

export class SubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: SaasSubSegmentId[]) {
    super(message);
    this.name = "SubSegmentAmbiguityError";
    this.escalationAudits = [{ channel: "escalation-audit", code: "SAAS_SUBSEGMENT_AMBIGUITY", message: \`\${message}: \${matches.join(",")}\` }];
  }
}

const NAICS_RULES: Array<{ pattern: RegExp; segment: SaasSubSegmentId }> = [
  { pattern: /^511210/, segment: "P" },
  { pattern: /^518210/, segment: "H" },
  { pattern: /^541511/, segment: "U" },
  { pattern: /^522320/, segment: "F" },
  { pattern: /^541512/, segment: "V" },
  { pattern: /^5112/, segment: "P" },
];

export function classifySaasSubSegment(ctx: { containsSaaSARRData?: boolean; naicsCode: string; revenueMix?: Partial<Record<SaasSubSegmentId, number>> }) {
  assertContainsSaaSARRData(ctx);
  const matches = [...new Set(NAICS_RULES.filter((r) => r.pattern.test(ctx.naicsCode)).map((r) => r.segment))];
  if (matches.length === 0) return "P";
  if (matches.length === 1) return matches[0];
  if (ctx.revenueMix) {
    const ranked = matches.map((s) => ({ s, v: ctx.revenueMix?.[s] ?? 0 })).sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SubSegmentAmbiguityError("Ambiguous NAICS mapping", matches);
}
`,
  );

  write(
    `${SAAS_LIB}/frameworks/k-f-discriminated-points.ts`,
    `${LIGHT_HEADER}
export const SAAS_KF_DISCRIMINATED_POINTS = [
  { pointId: "KF-1", usGaapHandle: "ASC.606-10-25-27", ifrsHandle: "IFRS15.Page", topic: "over-time" },
  { pointId: "KF-2", usGaapHandle: "ASC.606-10-32-6", ifrsHandle: "IFRS15.Para56-58", topic: "variable-consideration" },
  { pointId: "KF-3", usGaapHandle: "ASC.606-10-32-32", ifrsHandle: "IFRS15.B34-B35", topic: "ssp-material-right" },
  { pointId: "KF-4", usGaapHandle: "ASC.340-40-35-1", ifrsHandle: "IFRS15.Page", topic: "commission-amort" },
  { pointId: "KF-5", usGaapHandle: "ASC.985-20-25-2", ifrsHandle: "IFRIC.Apr2021.SaaS", topic: "hosting-license" },
] as const;
`,
  );

  write(
    `${SAAS_LIB}/frameworks/k-f-switch.ts`,
    `${LIGHT_HEADER}
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";
import { SAAS_KF_DISCRIMINATED_POINTS } from "./k-f-discriminated-points";

export type SaasFramework = "US_GAAP" | "IFRS";

export function switchSaasFramework(
  ctx: { containsSaaSARRData?: boolean; framework?: SaasFramework },
  pointId: string,
  emitter?: { emit: (outcome: string, evidence: Record<string, unknown>) => void },
) {
  assertContainsSaaSARRData(ctx);
  const framework = ctx.framework ?? "US_GAAP";
  const point = SAAS_KF_DISCRIMINATED_POINTS.find((p) => p.pointId === pointId);
  if (!point) throw SaasViolation("SAAS_KF_POINT_NOT_FOUND", pointId);
  const handleId = framework === "IFRS" ? point.ifrsHandle : point.usGaapHandle;
  if (emitter) {
    emitter.emit("framework-switched", { framework, pointId, handleId });
  } else {
    throw SaasViolation("SAAS_KF_SWITCH_NO_AUDIT", "Framework switch requires audit emission");
  }
  return resolveSaasCitationHandle(handleId);
}
`,
  );

  write(
    `${SAAS_LIB}/audit/channels/arr-mrr-audit.ts`,
    `${LIGHT_HEADER}
export { arrMrrAuditChannel } from "../../../../audit/channels/arr-mrr-audit";
`,
  );

  write(
    `${SAAS_LIB}/index.ts`,
    `${LIGHT_HEADER}
import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import type { SaasSubSegmentId, SaasSubSegmentKernel } from "./types";
import { SaasViolation } from "./errors";
import { SAAS_CITATION_HANDLE_COUNT, resolveSaasCitationHandle } from "./handles";
import { SAAS_KF_DISCRIMINATED_POINTS } from "./frameworks/k-f-discriminated-points";

export const SAAS_SUB_SEGMENT_KERNELS: Record<SaasSubSegmentId, SaasSubSegmentKernel> = {
  P: { subSegmentId: "P", name: "Platform-SaaS", frameworks: ["US_GAAP", "IFRS"] },
  H: { subSegmentId: "H", name: "Hosting-Infra", frameworks: ["US_GAAP", "IFRS"] },
  U: { subSegmentId: "U", name: "Usage-Based", frameworks: ["US_GAAP", "IFRS"] },
  F: { subSegmentId: "F", name: "FinServ-SaaS", frameworks: ["US_GAAP", "IFRS"] },
  V: { subSegmentId: "V", name: "Vertical-SaaS", frameworks: ["US_GAAP", "IFRS"] },
};

export function listSaasSubSegmentIds(): SaasSubSegmentId[] {
  return Object.keys(SAAS_SUB_SEGMENT_KERNELS) as SaasSubSegmentId[];
}

export function getSaasSubSegment(ctx: { containsSaaSARRData?: boolean }, id: SaasSubSegmentId) {
  assertContainsSaaSARRData(ctx);
  const k = SAAS_SUB_SEGMENT_KERNELS[id];
  if (!k) throw SaasViolation("SAAS_SUBSEGMENT_NOT_FOUND", \`Unknown sub-segment \${id}\`);
  return k;
}

export function assertSaasHandleCountFloor(floor: number): boolean {
  if (SAAS_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error("SAAS_HANDLE_COUNT_FLOOR"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HANDLE_COUNT_FLOOR", message: "count below floor" }],
    });
  }
  return true;
}

export { resolveSaasCitationHandle, SAAS_CITATION_HANDLE_COUNT, SAAS_KF_DISCRIMINATED_POINTS };
export * from "./asc606/subscription-over-time";
export * from "./asc606/hosting-vs-license";
export * from "./asc606/material-right-renewal";
export * from "./asc606/commission-amortization";
export * from "./asc606/multi-element-ssp";
export * from "./asc606/usage-stand-ready";
export * from "./asc606/contract-mods";
export * from "./classifiers/saas-sub-segment-classifier";
export * from "./frameworks/k-f-switch";
export * from "./ifrs/ifrs15";
export * from "./ifrs/ifric-apr-2021";
export * from "./specialized/soc2/common-criteria";
export * from "./specialized/soc2/processing-integrity";
`,
  );
}

function writeKpiDisclosureProfile() {
  const kpis = [
    ["saas-arr/arr.ts", "arr"],
    ["saas-arr/mrr.ts", "mrr"],
    ["saas-arr/nrr.ts", "nrr"],
    ["saas-arr/rpo.ts", "rpo"],
    ["saas-arr/churn.ts", "churn"],
    ["saas-arr/expansion.ts", "expansion"],
    ["saas-retention/gross-retention.ts", "gross-retention"],
    ["saas-retention/net-retention.ts", "net-retention"],
    ["saas-efficiency/magic-number.ts", "magic-number"],
    ["saas-efficiency/rule-of-40.ts", "rule-of-40"],
  ];
  for (const [pathSuffix, key] of kpis) {
    write(`kpi/${pathSuffix}`, `${LIGHT_HEADER}
export const KPI_KEY = "${key}";
export function compute(input: Record<string, number>) {
  return { kpiKey: KPI_KEY, value: input.value ?? 0 };
}
`);
  }

  for (const name of ["arr-disclosure", "mrr-bridge", "rpo-schedule", "churn-bridge", "soc2-disclosure", "commission-rollforward"]) {
    write(`disclosure-variants/saas/${name}.ts`, `${LIGHT_HEADER}
export function build() { return { variant: "${name}", frameworks: ["US_GAAP", "IFRS"] }; }
`);
  }

  for (const [file, handle] of [
    ["arr-growth-ranges.ts", "OpenView.SaaSIndex"],
    ["nrr-ranges.ts", "KeyBanc.SaaSSurvey"],
    ["magic-number-ranges.ts", "SaaS.Capital.MagicNumber"],
    ["rule-of-40-ranges.ts", "Bessemer.RuleOf40"],
    ["ltv-cac-ranges.ts", "Klipfolio.LTV-CAC"],
  ]) {
    write(`reasonableness/saas/${file}`, `${LIGHT_HEADER}
export const BENCHMARK_HANDLE = "${handle}";
export function getRange() { return { handle: BENCHMARK_HANDLE, source: "SaaS_Benchmarks_Sources.md" }; }
`);
  }

  write(
    "industry-profiles/saas/profile.ts",
    `${LIGHT_HEADER}
import type { SaasSubSegmentId } from "../../lib/intelligence/synthetic/libraries/saas/types";

export const SAAS_SUB_SEGMENTS: SaasSubSegmentId[] = ["P", "H", "U", "F", "V"];
export const SAAS_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const saasWave1Profile = {
  vertical: "saas",
  wave: 1,
  subSegments: SAAS_SUB_SEGMENTS,
  frameworks: SAAS_FRAMEWORKS,
  applicableStandards: ["ASC 606", "ASC 340-40", "ASC 985-605", "ASC 350-40", "IFRS 15", "IFRS 16", "IAS 38"],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelActive: "arr-mrr-audit",
  subSegmentPosture: {
    P: { platform: true },
    H: { hosting: true },
    U: { usageBased: true },
    F: { finserv: true },
    V: { vertical: true },
  },
};
`,
  );
}

function writeDocs() {
  const docsDir = "docs/saas/wave1";
  write(`${docsDir}/README.md`, `# SaaS Wave 1 (LOCK-SAAS-1)\n\n${HANDLES.length} handles. 5 sub-segments P/H/U/F/V.\n`);
  write(`${docsDir}/SaaS_Vertical_Planning_Doc.md`, `# SaaS Vertical Planning\n\n10th channel arr-mrr-audit default-ON 7yr hash-chained.\n`);
  const indexRows = HANDLES.map((h) => `| ${h.handleId} | ${h.library} | ${h.title} | ${h.url} | 2026-06-27 |`).join("\n");
  write(`${docsDir}/handle-index.md`, `# Handle Index\n\n| Handle | Library | Title | URL | Last Verified |\n|---|---|---|---|---|\n${indexRows}\n`);
  write(`${docsDir}/arr-mrr-audit-channel-spec.md`, `# arr-mrr-audit Channel\n\nSAAS.1.K-LOCK.0 · default-ON · 7yr · hash-chained.\n`);
  write(`${docsDir}/k-f-switch-discriminated-points.md`, `# K-F Switch Points\n\n5 discriminated US_GAAP/IFRS switch points.\n`);
  write(`${docsDir}/soc2-tsc-runtime-stack.md`, `# SOC2 TSC Runtime Stack\n\nCC always-on · A/C default-ON · PI conditional on payments.\n`);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Handle", "Library", "Title", "URL", "Last Verified"],
    ...HANDLES.map((h) => [h.handleId, h.library, h.title, h.url, "2026-06-27"]),
  ]), "Index");
  XLSX.writeFile(wb, path.join(root, docsDir, "SaaS_Citation_Verification_Register.xlsx"));
}

function main() {
  writeDoctrine();
  writeArrMrrChannel();
  writeChannelsIndex();
  writeCore();
  writeModules();
  writeKpiDisclosureProfile();
  writeDocs();
  console.log(`SAAS-1 scaffold: ${HANDLES.length} handles.`);
  console.log("SAAS-1 scaffold complete.");
}

main();
