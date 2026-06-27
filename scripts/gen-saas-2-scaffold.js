/**
 * Phase SAAS-2 — SaaS Wave 2 scaffold generator (Commit 1 BUILD).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const SAAS_LIB = "lib/intelligence/synthetic/libraries/saas";
const SAAS_INDUSTRY = "lib/intelligence/synthetic/industry/saas";
const created = [];

const FAILURE_OUTCOMES = [
  "commission-expensed-no-justification",
  "commission-amortization-period-mismatch",
  "material-right-not-detected",
  "ssp-residual-bypass",
  "usage-stand-ready-misclassified",
  "usage-measure-of-progress-misclassified",
  "contract-mod-misroute",
  "ramp-deal-no-bifurcation",
  "hosting-distinct-from-license-failure",
  "ifric-march-2019-bypass",
  "ifric-april-2021-bypass",
  "ias38-criterion-1-fail",
  "ias38-criterion-2-fail",
  "ias38-criterion-3-fail",
  "ias38-criterion-4-fail",
  "ias38-criterion-5-fail",
  "ias38-criterion-6-fail",
  "arr-fabrication",
  "mrr-fabrication",
  "nrr-fabrication",
  "grr-fabrication",
  "sub-segment-ambiguity",
  "framework-cross-blend",
  "soc2-tsc-cc-violation",
  "soc2-tsc-availability-violation",
  "soc2-tsc-confidentiality-violation",
];

const SUCCESS_OUTCOMES = [
  "arr-recognized",
  "mrr-recognized",
  "nrr-computed",
  "grr-computed",
  "commission-capitalized",
  "material-right-detected",
  "ssp-hierarchy-applied",
  "usage-classified-stand-ready",
  "usage-classified-measure-of-progress",
  "contract-mod-treated",
  "ramp-deal-bifurcated",
  "hosting-distinct-from-license",
  "over-time-criterion-met",
  "over-time-criterion-rejected",
  "ifric-march-2019-applied",
  "ifric-april-2021-applied",
  "ias38-criterion-all-pass",
  "framework-switched",
  "sub-segment-classified",
  "soc2-tsc-cc-asserted",
  "soc2-tsc-availability-asserted",
  "soc2-tsc-confidentiality-asserted",
  "soc2-tsc-processing-integrity-asserted",
  "soc2-tsc-privacy-asserted",
  "vertical-saas-overlay-applied",
  "rejected-escalation",
];

const ALL_OUTCOMES = [...FAILURE_OUTCOMES, ...SUCCESS_OUTCOMES];

function readFile(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  created.push(relativePath);
}

function industryModule(relativePath, imports, body) {
  write(
    `${SAAS_INDUSTRY}/${relativePath}`,
    `import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
${imports}

${body}
`,
  );
}

function libraryModule(relativePath, imports, body) {
  write(`${SAAS_LIB}/${relativePath}`, `${imports}

${body}
`);
}

write(
  "lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData.ts",
  `export function assertContainsSaaSARRData(ctx: {
  containsSaaSARRData?: boolean;
}): asserts ctx is { containsSaaSARRData: true } {
  if (ctx.containsSaaSARRData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsSaaSARRData must be true in saas module context.",
    );
  }
}
`,
);

const arrChannel = "lib/intelligence/synthetic/audit/channels/arr-mrr-audit";

write(
  `${arrChannel}/types.ts`,
  `export const ARR_MRR_AUDIT_CHANNEL_ID = "arr-mrr-audit" as const;
export const ARR_MRR_AUDIT_EVIDENCE_VERSION = "SAAS.2.K-LOCK.0" as const;
export const ARR_MRR_AUDIT_RETENTION_YEARS = 7 as const;

export type ArrMrrAuditOutcome =
${ALL_OUTCOMES.map((o) => `  | "${o}"`).join("\n")};

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
  `${arrChannel}/validator.ts`,
  `import type { ArrMrrAuditEntry } from "./types";
import { ARR_MRR_AUDIT_CHANNEL_ID, ARR_MRR_AUDIT_EVIDENCE_VERSION } from "./types";

export function validateArrMrrAuditEntry(entry: ArrMrrAuditEntry): void {
  if (entry.channelId !== ARR_MRR_AUDIT_CHANNEL_ID) {
    throw new Error("ARR_MRR_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== ARR_MRR_AUDIT_EVIDENCE_VERSION) {
    throw new Error("ARR_MRR_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsSaaSARRData !== true) {
    throw new Error("ARR_MRR_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("ARR_MRR_AUDIT_OUTCOME_REQUIRED");
  }
}
`,
);

write(
  `${arrChannel}/redaction.ts`,
  `export function redactArrMrrPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["customerName", "tenantId", "subscriptionId", "customerId", "rollupId"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
`,
);

write(
  `${arrChannel}/pure-core.ts`,
  `import type { ArrMrrAuditOutcome } from "./types";

export function deriveArrMrrAuditContextPure(input: {
  outcome: ArrMrrAuditOutcome;
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
  `${arrChannel}/writer.ts`,
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
  private sequence = 0;

  constructor(private readonly deps: FileArrMrrAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: ArrMrrAuditOutcome, evidence: Record<string, unknown>): ArrMrrAuditEntry {
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
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("ARR_MRR_AUDIT_FAIL_CLOSED");
  }
}
`,
);

write(
  `${arrChannel}/locked-citation-handles.ts`,
  `import { SAAS_CITATION_HANDLE_REGISTRY } from "../../../libraries/saas/handles-registry.generated";

export const SAAS2_LOCKED_CITATION_HANDLES = new Set(Object.keys(SAAS_CITATION_HANDLE_REGISTRY));

export function assertSaasCitationHandleLocked(handleId: string): void {
  if (!SAAS2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(\`Handle not whitelisted: \${handleId}\`), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
`,
);

write(
  `${arrChannel}/index.ts`,
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

write(
  "lib/intelligence/synthetic/audit/channels/index.ts",
  `/**
 * Audit channel registry — 10 channels after LOCK-SAAS-2.
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

export { engagementLetterAuditChannel } from "./engagement-letter-audit";
export * from "./engagement-letter-audit";

export { arrMrrAuditChannel } from "./arr-mrr-audit";
export * from "./arr-mrr-audit";

export const AUDIT_CHANNEL_REGISTRY = [
  "treatment-resolver-audit",
  "memory-framework-dimension",
  "escalation-audit",
  "panel-decision-audit",
  "org-edge-audit",
  "phi-access-audit",
  "dcaa-rate-audit",
  "poc-progress-audit",
  "engagement-letter-audit",
  "arr-mrr-audit",
] as const;

export type RegisteredAuditChannel = (typeof AUDIT_CHANNEL_REGISTRY)[number];
export const AUDIT_CHANNEL_COUNT = AUDIT_CHANNEL_REGISTRY.length;

export function assertAuditChannelCount(expected: number): boolean {
  if (AUDIT_CHANNEL_COUNT !== expected) {
    throw new Error(\`Expected \${expected} audit channels, got \${AUDIT_CHANNEL_COUNT}\`);
  }
  return true;
}
`,
);

industryModule(
  "audit/saas-audit-emitter.ts",
  `import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  type ArrMrrAuditOutcome,
} from "../../../audit/channels/arr-mrr-audit";
import type { SaaSSubSegment } from "../sub-segment-classifier/types";`,
  `export interface SaasAuditEmitter {
  emitArrMrr(outcome: ArrMrrAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getArrMrrEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createSaasAuditEmitter(): SaasAuditEmitter {
  const arr: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitArrMrr(outcome, evidence) {
      arr.push({
        channel: ARR_MRR_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
        containsSaaSARRData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getArrMrrEvents() { return [...arr]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: SaasAuditEmitter,
  params: { code: string; message: string; subSegment?: SaaSSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitArrMrr("rejected-escalation", params);
}
`,
);

industryModule(
  "sub-segment-classifier/types.ts",
  ``,
  `export type SaaSSubSegment = "P" | "H" | "U" | "F" | "V";

export class SaaSSubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: SaaSSubSegment[]) {
    super(message);
    this.name = "SaaSSubSegmentAmbiguityError";
    this.escalationAudits = [{
      channel: "escalation-audit",
      code: "SAAS_SUBSEGMENT_AMBIGUITY",
      message: \`\${message}: \${matches.join(",")}\`,
    }];
  }
}

export interface SaaSSubSegmentClassifierInput {
  naicsCode?: string;
  hostingOnly?: boolean;
  subscriptionPricing?: boolean;
  onPremLicense?: boolean;
  professionalServicesPct?: number;
  billingModel?: "subscription" | "consumption" | "metered" | "freemium";
  freeTier?: boolean;
  paidConversionPath?: boolean;
  verticalSignal?: "health" | "accounting" | "legal" | "none";
  revenueMix?: Partial<Record<SaaSSubSegment, number>>;
  containsSaaSARRData?: boolean;
}
`,
);

industryModule(
  "sub-segment-classifier/rules.ts",
  `import type { SaaSSubSegmentClassifierInput, SaaSSubSegment } from "./types";
import { SaaSSubSegmentAmbiguityError } from "./types";`,
  `const NAICS_RULES: Array<{ pattern: RegExp; segment: SaaSSubSegment }> = [
  { pattern: /^511210/, segment: "P" },
  { pattern: /^518210/, segment: "H" },
  { pattern: /^541511/, segment: "U" },
  { pattern: /^522320/, segment: "F" },
  { pattern: /^541512/, segment: "V" },
];

export function matchSubSegments(input: SaaSSubSegmentClassifierInput): SaaSSubSegment[] {
  const matches = new Set<SaaSSubSegment>();
  if (input.naicsCode) {
    for (const rule of NAICS_RULES) {
      if (rule.pattern.test(input.naicsCode)) matches.add(rule.segment);
    }
  }
  if (input.hostingOnly && input.subscriptionPricing && !input.onPremLicense) matches.add("P");
  if (input.onPremLicense || (input.professionalServicesPct ?? 0) > 0.15) matches.add("H");
  if (input.billingModel === "consumption" || input.billingModel === "metered") matches.add("U");
  if (input.freeTier && input.paidConversionPath) matches.add("F");
  if (input.verticalSignal && input.verticalSignal !== "none") matches.add("V");
  return [...matches];
}

export function applyClassifierRules(input: SaaSSubSegmentClassifierInput): SaaSSubSegment {
  const matches = matchSubSegments(input);
  if (matches.length === 0) return "P";
  if (matches.length === 1) return matches[0];
  if (input.revenueMix) {
    const ranked = matches
      .map((s) => ({ s, v: input.revenueMix?.[s] ?? 0 }))
      .sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SaaSSubSegmentAmbiguityError("Ambiguous SaaS sub-segment mapping", matches);
}
`,
);

industryModule(
  "sub-segment-classifier/pure-core.ts",
  `import type { SaaSSubSegmentClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";`,
  `export function classifySaaSSubSegmentPure(input: SaaSSubSegmentClassifierInput) {
  return applyClassifierRules(input);
}
`,
);

industryModule(
  "sub-segment-classifier/index.ts",
  `import type { SaaSSubSegmentClassifierInput, SaaSSubSegment } from "./types";
import { classifySaaSSubSegmentPure } from "./pure-core";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function classifySaaSSubSegment(
  ctx: SaaSSubSegmentClassifierInput,
  emitter = createSaasAuditEmitter(),
): SaaSSubSegment {
  assertContainsSaaSARRData(ctx);
  const segment = classifySaaSSubSegmentPure(ctx);
  emitter.emitArrMrr("sub-segment-classified", { segment, input: ctx });
  return segment;
}

export * from "./types";
export * from "./pure-core";
export * from "./rules";
`,
);

industryModule(
  "framework-router/cross-blend-types.ts",
  ``,
  `export type SaaSFramework = "US_GAAP" | "IFRS";

export interface SaaSCrossBlendBasisType {
  framework: SaaSFramework;
  basisType: string;
  handleId: string;
  switchPointId: "SP-1" | "SP-2" | "SP-3" | "SP-4" | "SP-5";
}

export const SAAS_CROSS_BLEND_BASIS_TYPES: SaaSCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-recognition", handleId: "ASC.606-10-25-27", switchPointId: "SP-1" },
  { framework: "IFRS", basisType: "over-time-recognition", handleId: "IFRS15.Para35-37", switchPointId: "SP-1" },
  { framework: "US_GAAP", basisType: "hosting-license-bifurcation", handleId: "ASC.606-10-25-19", switchPointId: "SP-2" },
  { framework: "IFRS", basisType: "hosting-license-bifurcation", handleId: "IFRS15.Para35-37", switchPointId: "SP-2" },
  { framework: "US_GAAP", basisType: "customer-impl-cost", handleId: "ASC.350-40-25-1", switchPointId: "SP-3" },
  { framework: "IFRS", basisType: "customer-impl-cost", handleId: "IAS38.Page", switchPointId: "SP-3" },
  { framework: "US_GAAP", basisType: "config-customization", handleId: "ASC.985-20-25-2", switchPointId: "SP-4" },
  { framework: "IFRS", basisType: "config-customization", handleId: "IFRIC.Apr2021.SaaS", switchPointId: "SP-4" },
  { framework: "US_GAAP", basisType: "cloud-arrangement-classification", handleId: "ASC.606-10-25-1", switchPointId: "SP-5" },
  { framework: "IFRS", basisType: "cloud-arrangement-classification", handleId: "IFRIC.Apr2021.SaaS", switchPointId: "SP-5" },
];
`,
);

industryModule(
  "framework-router/parity-map.ts",
  ``,
  `export const ASC_IFRS_SAAS_PARITY_MAP: Array<{ asc: string; ifrs: string; switchPointId: string }> = [
  { asc: "ASC.606-10-25-27", ifrs: "IFRS15.Para35-37", switchPointId: "SP-1" },
  { asc: "ASC.606-10-25-19", ifrs: "IFRS15.Para35-37", switchPointId: "SP-2" },
  { asc: "ASC.350-40-25-1", ifrs: "IAS38.Page", switchPointId: "SP-3" },
  { asc: "ASC.985-20-25-2", ifrs: "IFRIC.Apr2021.SaaS", switchPointId: "SP-4" },
  { asc: "ASC.606-10-25-1", ifrs: "IFRIC.Apr2021.SaaS", switchPointId: "SP-5" },
];
`,
);

industryModule(
  "framework-router/switch-points.ts",
  `export { SAAS_CROSS_BLEND_BASIS_TYPES } from "./cross-blend-types";
export { ASC_IFRS_SAAS_PARITY_MAP } from "./parity-map";`,
  `export const SAAS_FRAMEWORK_SWITCH_POINT_COUNT = 5 as const;
`,
);

industryModule(
  "framework-router/back-compat-shim.ts",
  `import type { SaaSFramework } from "./cross-blend-types";`,
  `export function defaultFramework(input?: { framework?: SaaSFramework }): SaaSFramework {
  return input?.framework ?? "US_GAAP";
}
`,
);

industryModule(
  "framework-router/index.ts",
  `import type { SaaSCrossBlendBasisType, SaaSFramework } from "./cross-blend-types";
import { ASC_IFRS_SAAS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveSaasCitationHandle } from "../../../libraries/saas/handles";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function routeByFramework(
  ctx: { containsSaaSARRData?: boolean; framework?: SaaSFramework },
  basis: SaaSCrossBlendBasisType,
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitArrMrr("framework-cross-blend", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("SAAS_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("SAAS_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  emitter.emitArrMrr("framework-switched", { handleId: basis.handleId, framework, switchPointId: basis.switchPointId });
  return resolveSaasCitationHandle(basis.handleId);
}

export { ASC_IFRS_SAAS_PARITY_MAP, defaultFramework, SAAS_FRAMEWORK_SWITCH_POINT_COUNT } from "./switch-points";
export * from "./cross-blend-types";
export * from "./switch-points";
`,
);

function evaluateModule(relativePath, fnName, outcome) {
  industryModule(
    relativePath,
    `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
    `export function ${fnName}(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  emitter.emitArrMrr("${outcome}", { module: "${relativePath.replace(/\//g, "-").replace(/\.ts$/, "")}", input });
  return { ok: true };
}`,
  );
}

industryModule(
  "asc606-saas-over-time/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function recognizeOverTime(
  ctx: { containsSaaSARRData?: boolean },
  input: { standReady: boolean; c1?: boolean; c2?: boolean; c3?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const pass = input.standReady && (input.c1 || input.c2 || input.c3);
  emitter.emitArrMrr(pass ? "over-time-criterion-met" : "over-time-criterion-rejected", input);
  if (!pass) {
    throw Object.assign(new Error("SAAS_OVER_TIME_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_OVER_TIME_FAIL", message: "over-time" }],
    });
  }
  return { recognized: true };
}
`,
);

industryModule(
  "asc606-saas-over-time/bifurcation.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function bifurcateRampDeal(
  ctx: { containsSaaSARRData?: boolean },
  input: { rampEscalation: boolean; bifurcated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.rampEscalation && !input.bifurcated) {
    emitter.emitArrMrr("ramp-deal-no-bifurcation", input);
    throw Object.assign(new Error("SAAS_RAMP_NO_BIFURCATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_RAMP_NO_BIFURCATION", message: "ramp" }],
    });
  }
  emitter.emitArrMrr("ramp-deal-bifurcated", input);
  return { bifurcated: true };
}
`,
);

industryModule(
  "asc606-saas-over-time/hosting-license-criteria.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function evaluateHostingLicenseCriteria(
  ctx: { containsSaaSARRData?: boolean },
  input: { separatelyIdentifiable: boolean; distinctInContext: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const pass = input.separatelyIdentifiable && input.distinctInContext;
  emitter.emitArrMrr(pass ? "hosting-distinct-from-license" : "hosting-distinct-from-license-failure", input);
  if (!pass) {
    throw Object.assign(new Error("SAAS_HOSTING_LICENSE_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HOSTING_LICENSE_FAIL", message: "bifurcation" }],
    });
  }
  return { distinct: true };
}
`,
);

industryModule(
  "material-rights/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function detectMaterialRight(
  ctx: { containsSaaSARRData?: boolean },
  input: { renewalDiscountPct: number; threshold?: number },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const threshold = input.threshold ?? 0.1;
  const detected = input.renewalDiscountPct >= threshold;
  emitter.emitArrMrr(detected ? "material-right-detected" : "material-right-not-detected", input);
  return { detected };
}
`,
);

industryModule(
  "material-rights/ssp-allocation.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function allocateMaterialRightSSP(
  ctx: { containsSaaSARRData?: boolean },
  input: { materialRightDetected: boolean; sspAllocated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.materialRightDetected && !input.sspAllocated) {
    emitter.emitArrMrr("material-right-not-detected", input);
    throw Object.assign(new Error("SAAS_MATERIAL_RIGHT_SSP_MISSING"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_MATERIAL_RIGHT_SSP_MISSING", message: "ssp" }],
    });
  }
  emitter.emitArrMrr("ssp-hierarchy-applied", input);
  return { allocated: true };
}
`,
);

industryModule(
  "asc340-40-commission/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function capitalizeCommission(
  ctx: { containsSaaSARRData?: boolean },
  input: { incremental: boolean; expensedInPeriod?: boolean; justification?: string },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.expensedInPeriod && !input.justification) {
    emitter.emitArrMrr("commission-expensed-no-justification", input);
    throw Object.assign(new Error("SAAS_COMMISSION_EXPENSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_COMMISSION_EXPENSED", message: "commission" }],
    });
  }
  emitter.emitArrMrr("commission-capitalized", input);
  return { capitalized: true };
}
`,
);

industryModule(
  "asc340-40-commission/amortization-period.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function evaluateAmortizationPeriod(
  ctx: { containsSaaSARRData?: boolean },
  input: { contractTermOnly: boolean; includesRenewals: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.contractTermOnly && !input.includesRenewals) {
    emitter.emitArrMrr("commission-amortization-period-mismatch", input);
    throw Object.assign(new Error("SAAS_COMMISSION_AMORT_MISMATCH"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_COMMISSION_AMORT_MISMATCH", message: "amort" }],
    });
  }
  return { period: "customer-life" };
}
`,
);

industryModule(
  "asc340-40-commission/practical-expedient.ts",
  ``,
  `export function applyPracticalExpedient(
  ctx: { containsSaaSARRData?: boolean },
  input: { periodMonths: number },
) {
  assertContainsSaaSARRData(ctx);
  if (input.periodMonths > 12) {
    throw new Error("SAAS_COMMISSION_EXPEDIENT_EXCEEDED");
  }
  return { expedientApplied: true, logged: true };
}
`,
);

industryModule(
  "ssp-hierarchy/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function applySSPHierarchy(
  ctx: { containsSaaSARRData?: boolean },
  input: { observable?: number; adjustedMarket?: number; residual?: number },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.observable) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "observable", ...input });
    return { tier: "observable", amount: input.observable };
  }
  if (input.adjustedMarket) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "adjusted-market", ...input });
    return { tier: "adjusted-market", amount: input.adjustedMarket };
  }
  if (input.residual !== undefined) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "residual", ...input });
    return { tier: "residual", amount: input.residual };
  }
  emitter.emitArrMrr("ssp-residual-bypass", input);
  throw Object.assign(new Error("SAAS_SSP_HIERARCHY_FAIL"), {
    escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SSP_HIERARCHY_FAIL", message: "ssp" }],
  });
}
`,
);

industryModule(
  "ssp-hierarchy/residual-gate.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function assertResidualGate(
  ctx: { containsSaaSARRData?: boolean },
  input: { observableExists: boolean; useResidual: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.observableExists && input.useResidual) {
    emitter.emitArrMrr("ssp-residual-bypass", input);
    throw Object.assign(new Error("SAAS_SSP_RESIDUAL_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SSP_RESIDUAL_BYPASS", message: "residual" }],
    });
  }
  return { gatePassed: true };
}
`,
);

industryModule(
  "usage-based-variable-consideration/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
  `export function classifyUsage(
  ctx: { containsSaaSARRData?: boolean },
  input: { standReady?: boolean; measureOfProgress?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.standReady === input.measureOfProgress) {
    throw Object.assign(new Error("SAAS_USAGE_UNDECIDABLE"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_USAGE_UNDECIDABLE", message: "usage" }],
    });
  }
  if (input.standReady) {
    emitter.emitArrMrr("usage-classified-stand-ready", input);
    return { classification: "stand-ready" };
  }
  emitter.emitArrMrr("usage-classified-measure-of-progress", input);
  return { classification: "measure-of-progress" };
}
`,
);

for (const [file, fn, outcome] of [
  ["stand-ready.ts", "evaluateStandReady", "usage-classified-stand-ready"],
  ["measure-of-progress.ts", "evaluateMeasureOfProgress", "usage-classified-measure-of-progress"],
  ["constraint.ts", "evaluateUsageConstraint", "usage-classified-stand-ready"],
  ["reassessment.ts", "reassessUsageConsideration", "usage-classified-measure-of-progress"],
]) {
  evaluateModule(`usage-based-variable-consideration/${file}`, fn, outcome);
}

for (const [file, fn, assertOutcome, violationOutcome] of [
  ["common-criteria.ts", "assertSoc2CommonCriteria", "soc2-tsc-cc-asserted", "soc2-tsc-cc-violation"],
  ["availability.ts", "assertSoc2Availability", "soc2-tsc-availability-asserted", "soc2-tsc-availability-violation"],
  ["confidentiality.ts", "assertSoc2Confidentiality", "soc2-tsc-confidentiality-asserted", "soc2-tsc-confidentiality-violation"],
  ["processing-integrity.ts", "assertSoc2ProcessingIntegrity", "soc2-tsc-processing-integrity-asserted", "soc2-tsc-cc-violation"],
  ["privacy.ts", "assertSoc2Privacy", "soc2-tsc-privacy-asserted", "soc2-tsc-cc-violation"],
]) {
  industryModule(
    `soc2-tsc-runtime/${file}`,
    `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
    `export function ${fn}(
  ctx: { containsSaaSARRData?: boolean },
  input: { attested: boolean; paymentFlow?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.attested) {
    emitter.emitArrMrr("${violationOutcome}", input);
    throw Object.assign(new Error("SAAS_SOC2_TSC_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SOC2_TSC_VIOLATION", message: "${file}" }],
    });
  }
  emitter.emitArrMrr("${assertOutcome}", input);
  return { attested: true };
}
`,
  );
}

industryModule(
  "vertical-saas-overlay/vertical-detector.ts",
  ``,
  `export function detectVerticalFamily(input: { verticalSignal?: "health" | "accounting" | "legal" | "none" }) {
  if (!input.verticalSignal || input.verticalSignal === "none") {
    throw Object.assign(new Error("SAAS_VERTICAL_AMBIGUOUS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_AMBIGUOUS", message: "vertical" }],
    });
  }
  return input.verticalSignal;
}
`,
);

for (const [file, fn] of [
  ["health-saas.ts", "applyHealthSaaSOverlay"],
  ["accounting-saas.ts", "applyAccountingSaaSOverlay"],
  ["legal-saas.ts", "applyLegalSaaSOverlay"],
]) {
  industryModule(
    `vertical-saas-overlay/${file}`,
    `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";`,
    `export function ${fn}(
  ctx: { containsSaaSARRData?: boolean; containsPHI?: boolean },
  input: { evidencePresent: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.evidencePresent) {
    throw Object.assign(new Error("SAAS_VERTICAL_OVERLAY_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_OVERLAY_FAIL", message: "${file}" }],
    });
  }
  emitter.emitArrMrr("vertical-saas-overlay-applied", { overlay: "${file}", ...input });
  return { applied: true };
}
`,
  );
}

industryModule(
  "vertical-saas-overlay/index.ts",
  `import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";
import { detectVerticalFamily } from "./vertical-detector";
import { applyHealthSaaSOverlay } from "./health-saas";
import { applyAccountingSaaSOverlay } from "./accounting-saas";
import { applyLegalSaaSOverlay } from "./legal-saas";`,
  `export function applyVerticalSaaSOverlay(
  ctx: { containsSaaSARRData?: boolean; containsPHI?: boolean },
  input: { subSegment: "V"; verticalSignal: "health" | "accounting" | "legal" },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const family = detectVerticalFamily(input);
  if (family === "health") return applyHealthSaaSOverlay(ctx, { evidencePresent: true }, emitter);
  if (family === "accounting") return applyAccountingSaaSOverlay(ctx, { evidencePresent: true }, emitter);
  return applyLegalSaaSOverlay(ctx, { evidencePresent: true }, emitter);
}

export * from "./vertical-detector";
export * from "./health-saas";
export * from "./accounting-saas";
export * from "./legal-saas";
`,
);

for (const guard of [
  "commission-amortization-period-guard",
  "material-right-detector",
  "ssp-multi-element-saas-guard",
  "usage-based-stand-ready-classifier",
  "ias-38-cloud-customer-cost-gate",
]) {
  const fnName = `run${guard.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}`;
  industryModule(
    `runtime-guards/structural/${guard}.ts`,
    `import { createSaasAuditEmitter } from "../../audit/saas-audit-emitter";`,
    `export function ${fnName}(
  ctx: { containsSaaSARRData?: boolean },
  input: { violation?: boolean },
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.violation) {
    emitter.emitArrMrr("rejected-escalation", { guard: "${guard}", input });
    throw Object.assign(new Error("SAAS_GUARD_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_GUARD_VIOLATION", message: "${guard}" }],
    });
  }
  return { guard: "${guard}", ok: true };
}
`,
  );
}

write(
  `${SAAS_INDUSTRY}/index.ts`,
  `export * from "./audit/saas-audit-emitter";
export * from "./sub-segment-classifier";
export * from "./framework-router";
export * from "./asc606-saas-over-time";
export * from "./material-rights";
export * from "./asc340-40-commission";
export * from "./ssp-hierarchy";
export * from "./usage-based-variable-consideration";
export * from "./soc2-tsc-runtime";
export * from "./vertical-saas-overlay";
export * from "./runtime-guards/structural/commission-amortization-period-guard";
export * from "./runtime-guards/structural/material-right-detector";
export * from "./runtime-guards/structural/ssp-multi-element-saas-guard";
export * from "./runtime-guards/structural/usage-based-stand-ready-classifier";
export * from "./runtime-guards/structural/ias-38-cloud-customer-cost-gate";

export const SAAS_INDUSTRY_WAVE = 2 as const;
`,
);

libraryModule(
  "asc985-605-legacy-lens/index.ts",
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import { resolveSaasCitationHandle } from "../handles";`,
  `export function applyLegacyLens(
  ctx: { containsSaaSARRData?: boolean },
  input: { subSegment: "H" | string; bifurcated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.subSegment === "H" && !input.bifurcated) {
    emitter.emitArrMrr("hosting-distinct-from-license-failure", input);
    throw Object.assign(new Error("SAAS_LEGACY_LENS_BIFURCATION_REQUIRED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_LEGACY_LENS_BIFURCATION_REQUIRED", message: "H" }],
    });
  }
  return { handle: resolveSaasCitationHandle("ASC.985-20-25-1"), applied: true };
}
`,
);

libraryModule(
  "asc985-605-legacy-lens/legacy-rev-rec.ts",
  `import { resolveSaasCitationHandle } from "../handles";`,
  `export function referenceLegacyRevRec() {
  return resolveSaasCitationHandle("ASC.985-20-25-2");
}
`,
);

libraryModule(
  "asc985-605-legacy-lens/bifurcation-bridge.ts",
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";`,
  `export function bridgeToOverTime(ctx: { containsSaaSARRData?: boolean }, input: { hybrid: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.hybrid) return { bridge: "asc606-over-time" };
  return { bridge: "none" };
}
`,
);

write(
  `${SAAS_LIB}/ifrs/ifrs15-saas.ts`,
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export const IFRS15_SAAS_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B34-B35"] as const;

export function evaluateIfrs15SaasConstraint(
  ctx: { containsSaaSARRData?: boolean },
  input: { highlyProbable: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.highlyProbable) {
    emitter.emitArrMrr("framework-cross-blend", input);
    throw Object.assign(new Error("SAAS_IFRS_CONSTRAINT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRS_CONSTRAINT_FAIL", message: "ifrs15" }],
    });
  }
  return { handle: resolveSaasCitationHandle("IFRS15.Para56-58"), constrained: true };
}

export function resolveIfrs15SaasHandles() {
  return IFRS15_SAAS_HANDLES.map((h) => resolveSaasCitationHandle(h));
}
`,
);

write(
  `${SAAS_LIB}/ifrs/ifric-march-2019-config-customization.ts`,
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export function evaluateIfricMarch2019(
  ctx: { containsSaaSARRData?: boolean },
  input: { ias38Met: boolean; expensedWithoutTest?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.expensedWithoutTest) {
    emitter.emitArrMrr("ifric-march-2019-bypass", input);
    throw Object.assign(new Error("SAAS_IFRIC_MARCH2019_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRIC_MARCH2019_BYPASS", message: "march2019" }],
    });
  }
  emitter.emitArrMrr("ifric-march-2019-applied", input);
  return { capitalized: input.ias38Met };
}
`,
);

write(
  `${SAAS_LIB}/ifrs/ifric-april-2021-cloud-customer.ts`,
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export function evaluateIfricApril2021(
  ctx: { containsSaaSARRData?: boolean },
  input: { serviceContract: boolean; bypassed?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.bypassed) {
    emitter.emitArrMrr("ifric-april-2021-bypass", input);
    throw Object.assign(new Error("SAAS_IFRIC_APR2021_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRIC_APR2021_BYPASS", message: "apr2021" }],
    });
  }
  emitter.emitArrMrr("ifric-april-2021-applied", input);
  return { serviceContract: input.serviceContract };
}
`,
);

write(
  `${SAAS_LIB}/ifrs/ias38-internally-generated.ts`,
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export const IAS38_SIX_CRITERIA = [
  "technicalFeasibility",
  "intentionToComplete",
  "abilityToUseOrSell",
  "futureEconomicBenefits",
  "availabilityOfResources",
  "reliableCostMeasurement",
] as const;

export function evaluateIas38Capitalization(
  ctx: { containsSaaSARRData?: boolean },
  criteria: Record<(typeof IAS38_SIX_CRITERIA)[number], boolean>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  IAS38_SIX_CRITERIA.forEach((key, index) => {
    if (criteria[key] !== true) {
      emitter.emitArrMrr(\`ias38-criterion-\${index + 1}-fail\`, { criterion: key, criteria });
    }
  });
  const pass = IAS38_SIX_CRITERIA.every((k) => criteria[k] === true);
  if (!pass) {
    throw Object.assign(new Error("SAAS_IAS38_CAPITALIZATION_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IAS38_CAPITALIZATION_REFUSED", message: "ias38" }],
    });
  }
  emitter.emitArrMrr("ias38-criterion-all-pass", { criteria, handle: resolveSaasCitationHandle("IAS38.Page") });
  return { capitalized: true };
}
`,
);

for (const oldIfrs of ["ifrs15.ts", "ifric-apr-2021.ts", "ias38.ts"]) {
  const oldPath = path.join(root, SAAS_LIB, "ifrs", oldIfrs);
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
    created.push(`${SAAS_LIB}/ifrs/${oldIfrs} (deleted)`);
  }
}

for (const stale of [
  "finserv-controls/index.ts",
  "soc2-stack-gate/index.ts",
  "arr-metric/index.ts",
  "vertical-saas-controls/index.ts",
]) {
  const stalePath = path.join(root, SAAS_INDUSTRY, stale);
  if (fs.existsSync(stalePath)) {
    fs.unlinkSync(stalePath);
    created.push(`${SAAS_INDUSTRY}/${stale} (deleted)`);
  }
}

libraryModule(
  "asc350-40-customer-side/index.ts",
  `import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import { resolveSaasCitationHandle } from "../handles";`,
  `export function applyCustomerSideCapGate(
  ctx: { containsSaaSARRData?: boolean },
  input: { serviceContractEvidence: boolean },
  _emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.serviceContractEvidence) {
    throw Object.assign(new Error("SAAS_ASC350_CUSTOMER_SIDE_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_ASC350_CUSTOMER_SIDE_FAIL", message: "350-40" }],
    });
  }
  return { handle: resolveSaasCitationHandle("ASC.350-40-25-1"), capitalized: true };
}
`,
);

libraryModule(
  "asc350-40-customer-side/asu-2018-15-alignment.ts",
  `import { resolveSaasCitationHandle } from "../handles";`,
  `export function referenceAsu201815() {
  return resolveSaasCitationHandle("ASC.350-40-15-1");
}
`,
);

for (const [pathSuffix, key] of [
  ["saas-revenue/arr.ts", "arr"],
  ["saas-revenue/mrr.ts", "mrr"],
  ["saas-revenue/nrr.ts", "nrr"],
  ["saas-revenue/grr.ts", "grr"],
  ["saas-margin/gross-margin-by-subsegment.ts", "gross-margin-by-subsegment"],
  ["saas-margin/cac-payback.ts", "cac-payback"],
  ["saas-margin/rule-of-40.ts", "rule-of-40"],
  ["saas-working-capital/dso-by-subsegment.ts", "dso-by-subsegment"],
  ["saas-engagement/magic-number.ts", "magic-number"],
  ["saas-engagement/burn-multiple.ts", "burn-multiple"],
]) {
  write(
    `kpi/${pathSuffix}`,
    `import { assertContainsSaaSARRData } from "../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export const KPI_KEY = "${key}";
export function compute(ctx: { containsSaaSARRData?: boolean }, input: Record<string, number>) {
  assertContainsSaaSARRData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? input.value ?? 0) / Math.max(input.denominator ?? 1, 1) };
}`,
  );
}

for (const name of [
  "arr-disclosure",
  "mrr-disclosure",
  "nrr-grr-disclosure",
  "commission-capitalization-disclosure",
  "material-right-disclosure",
  "usage-based-disclosure",
  "hosting-license-bifurcation-disclosure",
  "soc2-tsc-disclosure",
  "ifrs-overlay-disclosure",
]) {
  write(
    `disclosure-variants/saas/${name}.ts`,
    `import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export function build(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { variant: "${name}", frameworks: ["US_GAAP", "IFRS"] };
}`,
  );
}

for (const [file, handle] of [
  ["arr-growth-rate-bounds.ts", "OpenView.SaaSIndex"],
  ["nrr-bounds.ts", "KeyBanc.SaaSSurvey"],
  ["grr-bounds.ts", "SaaS.Capital.Benchmark"],
  ["cac-payback-bounds.ts", "Battery.SaaSMetrics"],
  ["rule-of-40-bounds.ts", "Bessemer.RuleOf40"],
  ["gross-margin-bounds.ts", "Meritech.SaaSIndex"],
]) {
  write(
    `reasonableness/saas/${file}`,
    `import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export const BENCHMARK_HANDLE = "${handle}";
export function bounds(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "SaaS_Benchmarks_Sources.md" };
}`,
  );
}

const DOCTRINE_IMPORT =
  'import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";';
const DOCTRINE_LINE = "@doctrine containsSaaSARRData: true";

function listTsFiles(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(rel);
    return entry.name.endsWith(".ts") ? [rel] : [];
  });
}

function liftLibraryFile(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return;
  let src = fs.readFileSync(absolute, "utf8");

  const infraOnly = ["errors.ts", "handles.ts", "handles-registry.generated.ts", "types.ts"].some((suffix) =>
    relativePath.replace(/\\/g, "/").endsWith(suffix),
  );

  src = src.replace(new RegExp(` \\* ${DOCTRINE_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n`, "g"), "");
  src = src.replace(new RegExp(`${DOCTRINE_LINE}\\n`, "g"), "");

  if (infraOnly) {
    src = src.replace(`${DOCTRINE_IMPORT}\n`, "");
    src = src.replace(`${DOCTRINE_IMPORT}\n\n`, "");
    fs.writeFileSync(absolute, src, "utf8");
    if (!created.includes(relativePath)) created.push(relativePath);
    return;
  }

  if (!src.includes(DOCTRINE_LINE) && src.includes("assertContainsSaaSARRData")) {
    fs.writeFileSync(absolute, src, "utf8");
    if (!created.includes(relativePath)) created.push(relativePath);
    return;
  }

  if (!src.includes("assertContainsSaaSARRData") && !relativePath.endsWith("types.ts")) {
    if (!src.includes(DOCTRINE_IMPORT)) {
      const headerEnd = src.indexOf("*/");
      if (headerEnd !== -1) {
        src = `${src.slice(0, headerEnd + 2)}\n${DOCTRINE_IMPORT}${src.slice(headerEnd + 2)}`;
      } else {
        src = `${DOCTRINE_IMPORT}\n${src}`;
      }
    }

    src = src.replace(/export function (\w+)\(([^)]*)\)\s*\{/g, (match, _name, params) => {
      if (match.includes("assertContainsSaaSARRData")) return match;
      if (params.includes("ctx:") || params.startsWith("ctx,") || params === "ctx") {
        return `${match.slice(0, -1)}\n  assertContainsSaaSARRData(ctx);\n`;
      }
      return match;
    });
  }

  fs.writeFileSync(absolute, src, "utf8");
  if (!created.includes(relativePath)) created.push(relativePath);
}

for (const rel of listTsFiles(SAAS_LIB)) {
  liftLibraryFile(rel);
}

const libIndexPath = `${SAAS_LIB}/index.ts`;
let libIndex = readFile(libIndexPath);
libIndex = libIndex.replace(/export \* from "\.\/ifrs\/ifrs15";?\n?/g, "");
libIndex = libIndex.replace(/export \* from "\.\/ifrs\/ifric-apr-2021";?\n?/g, "");
libIndex = libIndex.replace(/export \* from "\.\/ifrs\/ias38";?\n?/g, "");
for (const exp of [
  'export * from "./ifrs/ifrs15-saas";',
  'export * from "./ifrs/ifric-march-2019-config-customization";',
  'export * from "./ifrs/ifric-april-2021-cloud-customer";',
  'export * from "./ifrs/ias38-internally-generated";',
  'export * from "./asc985-605-legacy-lens";',
  'export * from "./asc350-40-customer-side";',
]) {
  if (!libIndex.includes(exp)) {
    libIndex = `${libIndex.trimEnd()}\n${exp}\n`;
  }
}
fs.writeFileSync(path.join(root, libIndexPath), libIndex, "utf8");
if (!created.includes(libIndexPath)) created.push(libIndexPath);

const memDim = readFile("lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts");
if (!memDim.includes("SAAS_DUAL_FRAMEWORK")) {
  write(
    "lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts",
    memDim.replace(
      `"PROF_SERVICES_DUAL_FRAMEWORK";`,
      `"PROF_SERVICES_DUAL_FRAMEWORK" | "SAAS_DUAL_FRAMEWORK";`,
    ),
  );
}

const profilePath = "industry-profiles/saas/profile.ts";
let profile = readFile(profilePath);
if (!profile.includes("resolveSaaSSubSegment")) {
  profile = `${profile}

import { classifySaaSSubSegment } from "../../lib/intelligence/synthetic/industry/saas/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (SAAS-2). */
export function resolveSaaSSubSegment(input: {
  naicsCode?: string;
  hostingOnly?: boolean;
  subscriptionPricing?: boolean;
  onPremLicense?: boolean;
  revenueMix?: Partial<Record<"P" | "H" | "U" | "F" | "V", number>>;
  containsSaaSARRData?: boolean;
}) {
  return classifySaaSSubSegment({ ...input, containsSaaSARRData: true });
}
`;
  fs.writeFileSync(path.join(root, profilePath), profile, "utf8");
  created.push(profilePath);
}

const ccPath = "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts";
let cc = readFile(ccPath);
if (!cc.includes("saas_item — routed via SAAS-2")) {
  cc = cc.replace(
    `  /** saas_item — routed via SAAS-1 industry kernel (LOCK-SAAS-1). */
  | "saas_item"`,
    `  /** saas_item — routed via SAAS-2 industry kernel (LOCK-SAAS-2). */
  | "saas_item"`,
  );
  fs.writeFileSync(path.join(root, ccPath), cc, "utf8");
  created.push(ccPath);
}

console.log("SAAS-2 scaffold complete.");
console.log(`Failure outcomes: ${FAILURE_OUTCOMES.length}`);
console.log(`Total audit outcomes: ${ALL_OUTCOMES.length}`);
console.log(`Files created/updated: ${created.length}`);
