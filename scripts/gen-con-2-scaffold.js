/**
 * Phase CON-2 — Construction Wave 2 scaffold generator.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readFile(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
}

function industryModule(relativePath, imports, body) {
  write(
    `lib/intelligence/synthetic/industry/construction/${relativePath}`,
    `import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";
${imports}

${body}
`,
  );
}

function libraryRuntime(relativePath, imports, body) {
  write(
    `lib/intelligence/synthetic/libraries/construction/${relativePath}`,
    `${imports}

${body}
`,
  );
}

// --- Doctrine ---
write(
  "lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData.ts",
  `export function assertContainsConstructionContractData(ctx: {
  containsConstructionContractData?: boolean;
}): asserts ctx is { containsConstructionContractData: true } {
  if (ctx.containsConstructionContractData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsConstructionContractData must be true in construction module context.",
    );
  }
}
`,
);

// --- POC Progress Audit Channel ---
const pocChannel = `lib/intelligence/synthetic/audit/channels/poc-progress-audit`;

write(
  `${pocChannel}/types.ts`,
  `export const POC_PROGRESS_AUDIT_CHANNEL_ID = "poc-progress-audit" as const;
export const POC_PROGRESS_AUDIT_EVIDENCE_VERSION = "CON.2.K-LOCK.0" as const;
export const POC_PROGRESS_AUDIT_RETENTION_YEARS = 7 as const;

export type POCProgressAuditOutcome =
  | "progress-measured"
  | "change-order-evaluated"
  | "claim-evaluated"
  | "retention-classified"
  | "uninstalled-materials-evaluated"
  | "jv-consolidation-evaluated"
  | "framework-switched"
  | "over-time-criteria-evaluated"
  | "sub-segment-classified"
  | "rejected-escalation";

export interface POCProgressAuditEntry {
  channelId: typeof POC_PROGRESS_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: POCProgressAuditOutcome;
  evidence: Record<string, unknown>;
  containsConstructionContractData: true;
  evidenceVersion: typeof POC_PROGRESS_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof POC_PROGRESS_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
`,
);

write(
  `${pocChannel}/validator.ts`,
  `import type { POCProgressAuditEntry } from "./types";
import { POC_PROGRESS_AUDIT_CHANNEL_ID, POC_PROGRESS_AUDIT_EVIDENCE_VERSION } from "./types";

export function validatePOCProgressAuditEntry(entry: POCProgressAuditEntry): void {
  if (entry.channelId !== POC_PROGRESS_AUDIT_CHANNEL_ID) {
    throw new Error("POC_PROGRESS_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== POC_PROGRESS_AUDIT_EVIDENCE_VERSION) {
    throw new Error("POC_PROGRESS_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsConstructionContractData !== true) {
    throw new Error("POC_PROGRESS_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("POC_PROGRESS_AUDIT_OUTCOME_REQUIRED");
  }
}
`,
);

write(
  `${pocChannel}/redaction.ts`,
  `export function redactPOCProgressPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["customerName", "contractNumber", "projectName", "ownerName"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
`,
);

write(
  `${pocChannel}/pure-core.ts`,
  `import type { POCProgressAuditOutcome } from "./types";

export function derivePOCProgressAuditContextPure(input: {
  outcome: POCProgressAuditOutcome;
  evidence: Record<string, unknown>;
}) {
  return {
    outcome: input.outcome,
    evidence: input.evidence,
    derivedAt: "pure-core",
  };
}
`,
);

write(
  `${pocChannel}/writer.ts`,
  `import * as fs from "node:fs";
import * as path from "node:path";
import { redactPOCProgressPayload } from "./redaction";
import { validatePOCProgressAuditEntry } from "./validator";
import {
  POC_PROGRESS_AUDIT_CHANNEL_ID,
  POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
  POC_PROGRESS_AUDIT_RETENTION_YEARS,
  type POCProgressAuditEntry,
  type POCProgressAuditOutcome,
} from "./types";
import { derivePOCProgressAuditContextPure } from "./pure-core";

export interface FilePOCProgressAuditWriterDeps {
  baseDir: string;
}

export class FilePOCProgressAuditWriter {
  private headHash = "GENESIS";
  private sequence = 0;

  constructor(private readonly deps: FilePOCProgressAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: POCProgressAuditOutcome, evidence: Record<string, unknown>): POCProgressAuditEntry {
    const ctx = derivePOCProgressAuditContextPure({ outcome, evidence });
    const entry: POCProgressAuditEntry = {
      channelId: POC_PROGRESS_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactPOCProgressPayload(ctx.evidence),
      containsConstructionContractData: true,
      evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
      retentionYears: POC_PROGRESS_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validatePOCProgressAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "poc-progress-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\\n");
    this.headHash = entryHash;
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("POC_PROGRESS_AUDIT_FAIL_CLOSED");
  }
}
`,
);

write(
  `${pocChannel}/locked-citation-handles.ts`,
  `import { CONSTRUCTION_CITATION_HANDLE_REGISTRY } from "../../libraries/construction/handles-registry.generated";

export const CON2_LOCKED_CITATION_HANDLES = new Set(Object.keys(CONSTRUCTION_CITATION_HANDLE_REGISTRY));

export function assertConCitationHandleLocked(handleId: string): void {
  if (!CON2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(\`Handle not whitelisted: \${handleId}\`), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
`,
);

write(
  `${pocChannel}/index.ts`,
  `import {
  POC_PROGRESS_AUDIT_CHANNEL_ID,
  POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
  POC_PROGRESS_AUDIT_RETENTION_YEARS,
} from "./types";

export const pocProgressAuditChannel = {
  id: POC_PROGRESS_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: POC_PROGRESS_AUDIT_RETENTION_YEARS,
  evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
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

// Update channels index
const channelsIndex = `/**
 * Audit channel registry — 8 channels after LOCK-CON-2.
 */

export {
  DCAA_RATE_AUDIT_CHANNEL_ID,
  DCAA_RATE_AUDIT_EVIDENCE_VERSION,
  DCAA_RATE_AUDIT_RETENTION_YEARS,
  createDcaaRateAuditEvent,
} from "./dcaa-rate-audit";
export type {
  DcaaRateAuditEvent,
  DcaaRateAuditDecisionType,
  DcaaRateAuditOutcome,
} from "./dcaa-rate-audit";

export { pocProgressAuditChannel } from "./poc-progress-audit";
export * from "./poc-progress-audit";

export const AUDIT_CHANNEL_REGISTRY = [
  "treatment-resolver-audit",
  "memory-framework-dimension",
  "escalation-audit",
  "panel-decision-audit",
  "org-edge-audit",
  "phi-access-audit",
  "dcaa-rate-audit",
  "poc-progress-audit",
] as const;

export type RegisteredAuditChannel = (typeof AUDIT_CHANNEL_REGISTRY)[number];
export const AUDIT_CHANNEL_COUNT = AUDIT_CHANNEL_REGISTRY.length;

export function assertAuditChannelCount(expected: number): boolean {
  if (AUDIT_CHANNEL_COUNT !== expected) {
    throw new Error(\`Expected \${expected} audit channels, got \${AUDIT_CHANNEL_COUNT}\`);
  }
  return true;
}
`;
write("lib/intelligence/synthetic/audit/channels/index.ts", channelsIndex);

// --- Industry audit emitter ---
industryModule(
  "audit/con-audit-emitter.ts",
  `import { POC_PROGRESS_AUDIT_CHANNEL_ID, POC_PROGRESS_AUDIT_EVIDENCE_VERSION, type POCProgressAuditOutcome } from "../../audit/channels/poc-progress-audit";
import type { ConstructionSubSegment } from "../sub-segment-classifier/types";`,
  `export interface ConAuditEmitter {
  emitPocProgress(outcome: POCProgressAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getPocEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createConAuditEmitter(): ConAuditEmitter {
  const poc: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitPocProgress(outcome, evidence) {
      poc.push({
        channel: POC_PROGRESS_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
        containsConstructionContractData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getPocEvents() { return [...poc]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: ConAuditEmitter,
  params: { code: string; message: string; subSegment?: ConstructionSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitPocProgress("rejected-escalation", params);
}
`,
);

// --- Sub-segment classifier ---
industryModule(
  "sub-segment-classifier/types.ts",
  ``,
  `export type ConstructionSubSegment = "G" | "S" | "R" | "C" | "H" | "D";

export interface ConstructionClassifierInput {
  naicsCode: string;
  backlogUsd?: number;
  designBuildEngagement?: boolean;
  containsConstructionContractData?: boolean;
}
`,
);

industryModule(
  "sub-segment-classifier/rules.ts",
  `import type { ConstructionClassifierInput, ConstructionSubSegment } from "./types";`,
  `export function applyClassifierRules(input: ConstructionClassifierInput): ConstructionSubSegment {
  const naics = input.naicsCode;
  if (/^236115|^236117/.test(naics)) return "R";
  if (/^237/.test(naics)) return "H";
  if (/^238/.test(naics)) return "S";
  if (/^541330/.test(naics) && input.designBuildEngagement) return "D";
  if (/^236220/.test(naics)) {
    return (input.backlogUsd ?? 0) >= 50_000_000 ? "C" : "G";
  }
  return "G";
}
`,
);

industryModule(
  "sub-segment-classifier/pure-core.ts",
  `import type { ConstructionClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";`,
  `export function classifyConstructionSubSegmentPure(input: ConstructionClassifierInput) {
  return applyClassifierRules(input);
}
`,
);

industryModule(
  "sub-segment-classifier/index.ts",
  `import type { ConstructionClassifierInput, ConstructionSubSegment } from "./types";
import { classifyConstructionSubSegmentPure } from "./pure-core";
import { createConAuditEmitter } from "../audit/con-audit-emitter";
import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";`,
  `export function classifyConstructionSubSegment(
  ctx: ConstructionClassifierInput,
  emitter = createConAuditEmitter(),
): ConstructionSubSegment {
  assertContainsConstructionContractData(ctx);
  const segment = classifyConstructionSubSegmentPure(ctx);
  emitter.emitPocProgress("sub-segment-classified", { naicsCode: ctx.naicsCode, segment });
  return segment;
}

export * from "./types";
export * from "./pure-core";
`,
);

// --- Framework router ---
industryModule(
  "framework-router/cross-blend-types.ts",
  ``,
  `export type ConstructionFramework = "US_GAAP" | "IFRS";

export interface ConstructionCrossBlendBasisType {
  framework: ConstructionFramework;
  basisType: string;
  handleId: string;
}

export const CON_CROSS_BLEND_BASIS_TYPES: ConstructionCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-criteria", handleId: "ASC.606-10-25-27" },
  { framework: "IFRS", basisType: "over-time-criteria", handleId: "IFRS15.Para35-37" },
  { framework: "US_GAAP", basisType: "progress-method", handleId: "ASC.606-10-25-33" },
  { framework: "IFRS", basisType: "progress-method", handleId: "IFRS15.B14-B19" },
  { framework: "US_GAAP", basisType: "uninstalled-materials", handleId: "ASC.606-10-25-23B" },
  { framework: "IFRS", basisType: "uninstalled-materials", handleId: "IFRS15.B14-B19" },
  { framework: "US_GAAP", basisType: "lease-scope", handleId: "ASC.842-10-15-3" },
  { framework: "IFRS", basisType: "lease-scope", handleId: "IFRS16.Page" },
  { framework: "US_GAAP", basisType: "jv-proportionate", handleId: "ASC.810-30-45-1" },
  { framework: "IFRS", basisType: "jv-proportionate", handleId: "IFRIC12.Page" },
];
`,
);

industryModule(
  "framework-router/parity-map.ts",
  ``,
  `export const ASC_IFRS_PARITY_MAP: Array<{ asc: string; ifrs: string }> = [
  { asc: "ASC.606-10-25-27", ifrs: "IFRS15.Para35-37" },
  { asc: "ASC.606-10-25-33", ifrs: "IFRS15.B14-B19" },
  { asc: "ASC.606-10-25-23B", ifrs: "IFRS15.B14-B19" },
  { asc: "ASC.842-10-15-3", ifrs: "IFRS16.Page" },
  { asc: "ASC.842-20-25-1", ifrs: "IFRS16.Page" },
  { asc: "ASC.810-30-45-1", ifrs: "IFRIC12.Page" },
  { asc: "ASC.980-605", ifrs: "IFRIC12.Page" },
];
`,
);

industryModule(
  "framework-router/back-compat-shim.ts",
  `import type { ConstructionFramework } from "./cross-blend-types";`,
  `export function defaultFramework(input?: { framework?: ConstructionFramework }): ConstructionFramework {
  return input?.framework ?? "US_GAAP";
}
`,
);

industryModule(
  "framework-router/index.ts",
  `import type { ConstructionCrossBlendBasisType, ConstructionFramework } from "./cross-blend-types";
import { ASC_IFRS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveConstructionCitationHandle } from "../../libraries/construction/handles";
import { createConAuditEmitter } from "../audit/con-audit-emitter";
import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";`,
  `export function routeByFramework(
  ctx: { containsConstructionContractData?: boolean; framework?: ConstructionFramework },
  basis: ConstructionCrossBlendBasisType,
  emitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitPocProgress("framework-switched", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("CON_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("CON_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  return resolveConstructionCitationHandle(basis.handleId);
}

export { ASC_IFRS_PARITY_MAP, defaultFramework };
export * from "./cross-blend-types";
`,
);

// --- JV runtime guard ---
libraryRuntime(
  "asc810/jv-runtime-guard.ts",
  `import type { ConstructionSubSegment } from "../../industry/construction/sub-segment-classifier/types";
import { createConAuditEmitter } from "../../industry/construction/audit/con-audit-emitter";`,
  `const PROPORTIONATE_CONSOLIDATION_PERMITTED = new Set([
  "CONSTRUCTION:G", "CONSTRUCTION:S", "CONSTRUCTION:C",
  "CONSTRUCTION:H", "CONSTRUCTION:D", "EXTRACTIVE",
]);

export function assertProportionateConsolidationPermitted(
  industry: string,
  subSegment: ConstructionSubSegment | null,
  emitter = createConAuditEmitter(),
) {
  const key = subSegment ? \`\${industry}:\${subSegment}\` : industry;
  if (!PROPORTIONATE_CONSOLIDATION_PERMITTED.has(key)) {
    emitter.emitEscalation("CON_JV_PROPORTIONATE_REFUSED", \`Refused for \${key}\`);
    emitter.emitPocProgress("jv-consolidation-evaluated", { verdict: "refused", key });
    throw Object.assign(new Error("CON_JV_PROPORTIONATE_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_JV_PROPORTIONATE_REFUSED", message: key }],
    });
  }
  emitter.emitPocProgress("jv-consolidation-evaluated", { verdict: "allowed", key });
  return { allowed: true };
}
`,
);

write(
  "lib/intelligence/synthetic/libraries/construction/asc810/jv-runtime-guard.test.ts",
  `import { assertProportionateConsolidationPermitted } from "./jv-runtime-guard";

const refused = ["MFG", "RTL", "FA", "HC", "GC", "SaaS", "Nonprofit", "IFRS-SME"];
for (const ind of refused) {
  try {
    assertProportionateConsolidationPermitted(ind, null);
    throw new Error("should refuse");
  } catch (e) {
    if (!String(e.message).includes("REFUSED")) throw e;
  }
}
try {
  assertProportionateConsolidationPermitted("CONSTRUCTION", "R");
  throw new Error("R should refuse");
} catch (e) {
  if (!String(e.message).includes("REFUSED")) throw e;
}
`,
);

// --- ASC 606 runtime modules ---
const asc606Runtime = [
  ["change-orders.ts", "change-order-evaluated", `export function evaluateChangeOrder(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  if (input.separateContract) {
    emitter.emitPocProgress("change-order-evaluated", { path: "separate-contract", reasoning: input });
    return { path: "separate-contract" };
  }
  if (input.remainingDistinct) {
    emitter.emitPocProgress("change-order-evaluated", { path: "prospective", reasoning: input });
    return { path: "prospective" };
  }
  emitter.emitPocProgress("change-order-evaluated", { path: "cumulative-catch-up", reasoning: input });
  return { path: "cumulative-catch-up" };
}`],
  ["claims.ts", "claim-evaluated", `export function evaluateClaimConstraint(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  const pass = input.probable && input.reliablyEstimable && input.collectionProbable;
  if (!pass) {
    emitter.emitEscalation("CON_CLAIM_CONSTRAINT_FAIL", "claim constraint failed");
    emitter.emitPocProgress("rejected-escalation", { reasoning: input });
    throw Object.assign(new Error("CON_CLAIM_CONSTRAINT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_CLAIM_CONSTRAINT_FAIL", message: "claim" }],
    });
  }
  emitter.emitPocProgress("claim-evaluated", { reasoning: input });
  return { recognized: true };
}`],
  ["unpriced-change-orders.ts", "change-order-evaluated", `export function evaluateUnpricedChangeOrder(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  if (!input.enforceableRight || !input.constraintPass) {
    emitter.emitEscalation("CON_UNPRICED_CO_REFUSED", "unpriced CO");
    emitter.emitPocProgress("rejected-escalation", { input });
    throw Object.assign(new Error("CON_UNPRICED_CO_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_UNPRICED_CO_REFUSED", message: "co" }],
    });
  }
  emitter.emitPocProgress("change-order-evaluated", { input });
  return { recognized: true };
}`],
  ["claim-vs-change-order.ts", "claim-evaluated", `export function discriminateClaimVsChangeOrder(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  const kind = input.kind === "claim" ? "claim" : "change-order";
  emitter.emitPocProgress(kind === "claim" ? "claim-evaluated" : "change-order-evaluated", {
    reasoningChain: input,
    costBreakdown: input.costBreakdown ?? {},
    constraintTest: input.constraintTest ?? {},
    enforceableRight: input.enforceableRight ?? false,
  });
  return { kind };
}`],
  ["uninstalled-materials-runtime-guard.ts", "uninstalled-materials-evaluated", `export function evaluateUninstalledMaterialsRuntime(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  const carveOut = !input.customized && input.customerControlledBeforeInstall && input.transferDistinctFromInstall;
  if (!carveOut) {
    emitter.emitPocProgress("uninstalled-materials-evaluated", { includedInPoc: true, gate: "forced-inclusion", input });
    return { includedInPoc: true, carveOut: false };
  }
  emitter.emitPocProgress("uninstalled-materials-evaluated", { includedInPoc: false, carveOut: true, input });
  return { includedInPoc: false, carveOut: true };
}`],
];

for (const [file, outcome, fnBody] of asc606Runtime) {
  libraryRuntime(
    `asc606/${file}`,
    `import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../industry/construction/audit/con-audit-emitter";`,
    `${fnBody}
`,
  );
}

// --- Retention ---
libraryRuntime(
  "retention/maturity-ladder.ts",
  `import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../industry/construction/audit/con-audit-emitter";`,
  `export function classifyRetentionMaturity(ctx, monthsToMaturity, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  let bucket: "current" | "12-24-mo" | "24-plus-mo" = "current";
  if (monthsToMaturity > 24) bucket = "24-plus-mo";
  else if (monthsToMaturity > 12) bucket = "12-24-mo";
  emitter.emitPocProgress("retention-classified", { monthsToMaturity, bucket });
  return { bucket };
}`,
);

libraryRuntime(
  "retention/financing-component.ts",
  `import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../industry/construction/audit/con-audit-emitter";`,
  `export function evaluateFinancingComponent(ctx, input, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  if (input.retentionMonths > 12 && input.interestRate > input.treasuryYield) {
    emitter.emitEscalation("CON_FINANCING_COMPONENT_FAIL", "significant financing");
    emitter.emitPocProgress("rejected-escalation", { input });
    throw Object.assign(new Error("CON_FINANCING_COMPONENT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_FINANCING_COMPONENT_FAIL", message: "financing" }],
    });
  }
  return { significantFinancing: false };
}`,
);

libraryRuntime(
  "retention/state-rules.ts",
  `import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";`,
  `export const RETENTION_STATE_CAPS = { CA: 5, TX: "varies", FL: "tiered" } as const;
export function getStateRetentionCap(ctx, state: "CA" | "TX" | "FL") {
  assertContainsConstructionContractData(ctx);
  return RETENTION_STATE_CAPS[state];
}`,
);

// --- IFRS live libs ---
for (const [name, src, handles] of [
  ["ifrs15-construction.ts", "ifrs15.ts", ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.B14-B19"]],
  ["ifrs16-leases.ts", "ifrs16.ts", ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16"]],
  ["ifric12-service-concession.ts", "ifric12.ts", ["IFRIC12.Page"]],
]) {
  write(
    `lib/intelligence/synthetic/libraries/construction/ifrs/${name}`,
    `import { resolveConstructionCitationHandle } from "../handles";
export const IFRS_MODULE_HANDLES = ${JSON.stringify(handles)};
export function resolveIfrsConstructionHandles() {
  return IFRS_MODULE_HANDLES.map((h) => resolveConstructionCitationHandle(h));
}
export * from "./${src.replace(".ts", "")}";
`,
  );
}

// --- KPI modules ---
const kpis = [
  ["construction-revenue/billings-vs-costs.ts", "billings-vs-costs"],
  ["construction-revenue/backlog-coverage.ts", "backlog-coverage"],
  ["construction-revenue/wip-to-revenue.ts", "wip-to-revenue"],
  ["construction-cost/labor-burden.ts", "labor-burden"],
  ["construction-cost/equipment-utilization.ts", "equipment-utilization"],
  ["construction-margin/gross-margin-by-subsegment.ts", "gross-margin-by-subsegment"],
  ["construction-margin/poc-margin-volatility.ts", "poc-margin-volatility"],
  ["construction-working-capital/retention-days.ts", "retention-days"],
  ["construction-working-capital/days-billed-not-collected.ts", "days-billed-not-collected"],
  ["construction-bonding/capacity-utilization.ts", "capacity-utilization"],
  ["construction-retention/aging-buckets.ts", "aging-buckets"],
];
for (const [pathSuffix, key] of kpis) {
  write(
    `kpi/${pathSuffix}`,
    `import { assertContainsConstructionContractData } from "../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export const KPI_KEY = "${key}";
export function compute(ctx: { containsConstructionContractData?: boolean }, input: Record<string, number>) {
  assertContainsConstructionContractData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}`,
  );
}

// --- Disclosure variants ---
const disclosures = [
  "poc-method-disclosure", "retention-disclosure", "change-order-claims-disclosure", "backlog-disclosure",
  "jv-disclosure", "uninstalled-materials-disclosure", "bonding-disclosure", "cip-impairment-disclosure", "ifrs-overlay-disclosure",
];
for (const name of disclosures) {
  write(
    `disclosure-variants/construction/${name}.ts`,
    `import { assertContainsConstructionContractData } from "../../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export function build(ctx: { containsConstructionContractData?: boolean }) {
  assertContainsConstructionContractData(ctx);
  return { variant: "${name}", frameworks: ["US_GAAP", "IFRS"] };
}`,
  );
}

// --- Reasonableness ---
const reason = [
  ["gross-margin-bounds.ts", "CFMA.Benchmarker"],
  ["wip-to-revenue-bounds.ts", "CFMA.WIP.Turnover"],
  ["backlog-coverage-bounds.ts", "AGC.DataDigest"],
  ["retention-percent-bounds.ts", "CA.CivCode.8800"],
  ["bonding-capacity-bounds.ts", "NASBP.ThreeCs"],
  ["poc-margin-volatility-bounds.ts", "CFMA.Benchmarker"],
];
for (const [file, handle] of reason) {
  write(
    `reasonableness/construction/${file}`,
    `import { assertContainsConstructionContractData } from "../../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export const BENCHMARK_HANDLE = "${handle}";
export function bounds(ctx: { containsConstructionContractData?: boolean }) {
  assertContainsConstructionContractData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "Construction_Benchmarks_Sources.md" };
}`,
  );
}

// --- Industry index + promoted modules ---
const promotedModules = [
  "over-time-runtime.ts", "progress-runtime.ts", "retention-runtime.ts", "wip-runtime.ts",
  "bonding-runtime.ts", "backlog-runtime.ts", "lease-runtime.ts", "guarantee-runtime.ts",
  "cip-runtime.ts", "jv-runtime.ts", "ifrs-runtime.ts", "disclosure-runtime.ts",
];
for (const mod of promotedModules) {
  industryModule(
    `runtime/${mod}`,
    `import { createConAuditEmitter } from "../audit/con-audit-emitter";
import { assertContainsConstructionContractData } from "../../standards/doctrine/containsConstructionContractData";`,
    `export function evaluate(ctx: { containsConstructionContractData?: boolean }, input: Record<string, unknown>, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  emitter.emitPocProgress("progress-measured", { module: "${mod}", input });
  return { ok: true };
}`,
  );
}

industryModule(
  "index.ts",
  `export * from "./audit/con-audit-emitter";
export * from "./sub-segment-classifier";
export * from "./framework-router";
export * from "./runtime/over-time-runtime";
export * from "./runtime/progress-runtime";
export * from "./runtime/retention-runtime";
export * from "./runtime/wip-runtime";
export * from "./runtime/bonding-runtime";
export * from "./runtime/backlog-runtime";
export * from "./runtime/lease-runtime";
export * from "./runtime/guarantee-runtime";
export * from "./runtime/cip-runtime";
export * from "./runtime/jv-runtime";
export * from "./runtime/ifrs-runtime";
export * from "./runtime/disclosure-runtime";`,
  `export const CONSTRUCTION_INDUSTRY_WAVE = 2 as const;`,
);

// --- Memory framework dimension ---
const memDim = readFile("lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts");
write(
  "lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts",
  memDim.replace(
    `export type FrameworkScopedMemoryDimension = ReportingFrameworkIdentifier | "US_GAAP_ONLY";`,
    `export type FrameworkScopedMemoryDimension = ReportingFrameworkIdentifier | "US_GAAP_ONLY" | "CONSTRUCTION_DUAL_FRAMEWORK";`,
  ),
);

// --- Profile back-compat shim ---
const profilePath = "industry-profiles/construction/profile.ts";
const profile = fs.readFileSync(path.join(root, profilePath), "utf8");
write(
  profilePath,
  `${profile}

import { classifyConstructionSubSegment } from "../../lib/intelligence/synthetic/industry/construction/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (CON-2). */
export function resolveConstructionSubSegment(input: {
  naicsCode: string;
  backlogUsd?: number;
  designBuildEngagement?: boolean;
  containsConstructionContractData?: boolean;
}) {
  return classifyConstructionSubSegment({ ...input, containsConstructionContractData: true });
}
`,
);

// --- Command center ---
const ccPath = "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts";
let cc = fs.readFileSync(path.join(root, ccPath), "utf8");
if (!cc.includes("construction_item")) {
  cc = cc.replace(
    `  | "govcon_item"`,
    `  | "govcon_item"
  | "construction_item"`,
  );
  write(ccPath, cc);
}

console.log("CON-2 scaffold complete.");
