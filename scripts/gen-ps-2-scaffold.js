/**
 * Phase PS-2 — Professional Services Wave 2 scaffold generator.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const PS_LIB = "lib/intelligence/synthetic/libraries/prof-services";
const PS_INDUSTRY = "lib/intelligence/synthetic/industry/prof-services";
const created = [];

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
    `${PS_INDUSTRY}/${relativePath}`,
    `import { assertContainsProfessionalEngagementData } from "../../standards/doctrine/containsProfessionalEngagementData";
${imports}

${body}
`,
  );
}

function libraryRuntime(relativePath, imports, body) {
  write(`${PS_LIB}/${relativePath}`, `${imports}

${body}
`);
}

// --- Doctrine ---
write(
  "lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData.ts",
  `export function assertContainsProfessionalEngagementData(ctx: {
  containsProfessionalEngagementData?: boolean;
}): asserts ctx is { containsProfessionalEngagementData: true } {
  if (ctx.containsProfessionalEngagementData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsProfessionalEngagementData must be true in prof-services module context.",
    );
  }
}
`,
);

// --- Engagement Letter Audit Channel ---
const elChannel = "lib/intelligence/synthetic/audit/channels/engagement-letter-audit";

write(
  `${elChannel}/types.ts`,
  `export const ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID = "engagement-letter-audit" as const;
export const ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION = "PS.2.K-LOCK.0" as const;
export const ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS = 7 as const;

export type EngagementLetterAuditOutcome =
  | "engagement-letter-evaluated"
  | "engagement-letter-required-fields-validated"
  | "sub-segment-classified"
  | "framework-switched"
  | "over-time-criteria-evaluated"
  | "retainer-series-evaluated"
  | "variable-consideration-evaluated"
  | "ssp-hierarchy-evaluated"
  | "principal-vs-agent-evaluated"
  | "pe-seal-gate-evaluated"
  | "coi-registry-evaluated"
  | "independence-gate-evaluated"
  | "it-services-controls-evaluated"
  | "work-for-hire-evaluated"
  | "upl-boundary-evaluated"
  | "ias38-capitalization-evaluated"
  | "ias37-onerous-evaluated"
  | "ifrs-constraint-evaluated"
  | "contract-mod-evaluated"
  | "wip-unbilled-evaluated"
  | "backlog-evaluated"
  | "progress-method-evaluated"
  | "contingent-success-evaluated"
  | "contract-cost-evaluated"
  | "handle-whitelist-validated"
  | "rejected-escalation";

export interface EngagementLetterAuditEntry {
  channelId: typeof ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: EngagementLetterAuditOutcome;
  evidence: Record<string, unknown>;
  containsProfessionalEngagementData: true;
  evidenceVersion: typeof ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
`,
);

write(
  `${elChannel}/validator.ts`,
  `import type { EngagementLetterAuditEntry } from "./types";
import { ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID, ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION } from "./types";

export function validateEngagementLetterAuditEntry(entry: EngagementLetterAuditEntry): void {
  if (entry.channelId !== ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsProfessionalEngagementData !== true) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_OUTCOME_REQUIRED");
  }
}
`,
);

write(
  `${elChannel}/redaction.ts`,
  `export function redactEngagementLetterPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["clientName", "matterNumber", "engagementId", "partnerName", "clientContact"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
`,
);

write(
  `${elChannel}/pure-core.ts`,
  `import type { EngagementLetterAuditOutcome } from "./types";

export function deriveEngagementLetterAuditContextPure(input: {
  outcome: EngagementLetterAuditOutcome;
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
  `${elChannel}/writer.ts`,
  `import * as fs from "node:fs";
import * as path from "node:path";
import { redactEngagementLetterPayload } from "./redaction";
import { validateEngagementLetterAuditEntry } from "./validator";
import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
  type EngagementLetterAuditEntry,
  type EngagementLetterAuditOutcome,
} from "./types";
import { deriveEngagementLetterAuditContextPure } from "./pure-core";

export interface FileEngagementLetterAuditWriterDeps {
  baseDir: string;
}

export class FileEngagementLetterAuditWriter {
  private headHash = "GENESIS";
  private sequence = 0;

  constructor(private readonly deps: FileEngagementLetterAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: EngagementLetterAuditOutcome, evidence: Record<string, unknown>): EngagementLetterAuditEntry {
    const ctx = deriveEngagementLetterAuditContextPure({ outcome, evidence });
    const entry: EngagementLetterAuditEntry = {
      channelId: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactEngagementLetterPayload(ctx.evidence),
      containsProfessionalEngagementData: true,
      evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
      retentionYears: ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validateEngagementLetterAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "engagement-letter-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\\n");
    this.headHash = entryHash;
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_FAIL_CLOSED");
  }
}
`,
);

write(
  `${elChannel}/locked-citation-handles.ts`,
  `import { PROF_SERVICES_CITATION_HANDLE_REGISTRY } from "../../libraries/prof-services/handles-registry.generated";

export const PS2_LOCKED_CITATION_HANDLES = new Set(Object.keys(PROF_SERVICES_CITATION_HANDLE_REGISTRY));

export function assertPsCitationHandleLocked(handleId: string): void {
  if (!PS2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(\`Handle not whitelisted: \${handleId}\`), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
`,
);

write(
  `${elChannel}/index.ts`,
  `import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
} from "./types";

export const engagementLetterAuditChannel = {
  id: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
  evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
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

// --- Update channels index (9 channels) ---
write(
  "lib/intelligence/synthetic/audit/channels/index.ts",
  `/**
 * Audit channel registry — 9 channels after LOCK-PS-2.
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

// --- Industry audit emitter ---
industryModule(
  "audit/ps-audit-emitter.ts",
  `import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  type EngagementLetterAuditOutcome,
} from "../../audit/channels/engagement-letter-audit";
import type { ProfServicesSubSegment } from "../sub-segment-classifier/types";`,
  `export interface PsAuditEmitter {
  emitEngagementLetter(outcome: EngagementLetterAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getEngagementLetterEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createPsAuditEmitter(): PsAuditEmitter {
  const el: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitEngagementLetter(outcome, evidence) {
      el.push({
        channel: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
        containsProfessionalEngagementData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getEngagementLetterEvents() { return [...el]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: PsAuditEmitter,
  params: { code: string; message: string; subSegment?: ProfServicesSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitEngagementLetter("rejected-escalation", params);
}
`,
);

// --- Sub-segment classifier ---
industryModule(
  "sub-segment-classifier/types.ts",
  ``,
  `export type ProfServicesSubSegment = "L" | "A" | "M" | "I" | "E" | "K";

export class SubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: ProfServicesSubSegment[]) {
    super(message);
    this.name = "SubSegmentAmbiguityError";
    this.escalationAudits = [{
      channel: "escalation-audit",
      code: "PS_SUBSEGMENT_AMBIGUITY",
      message: \`\${message}: \${matches.join(",")}\`,
    }];
  }
}

export interface ProfServicesClassifierInput {
  naicsCode: string;
  revenueMix?: Partial<Record<ProfServicesSubSegment, number>>;
  containsProfessionalEngagementData?: boolean;
}
`,
);

industryModule(
  "sub-segment-classifier/rules.ts",
  `import type { ProfServicesClassifierInput, ProfServicesSubSegment } from "./types";
import { SubSegmentAmbiguityError } from "./types";`,
  `const NAICS_RULES: Array<{ pattern: RegExp; segment: ProfServicesSubSegment }> = [
  { pattern: /^5411(?:10|99)/, segment: "L" },
  { pattern: /^5412(?:11|13|14|19)/, segment: "A" },
  { pattern: /^5416(?:11|18)/, segment: "M" },
  { pattern: /^5415(?:12|13|19)/, segment: "I" },
  { pattern: /^5413(?:10|30|40|50)/, segment: "E" },
  { pattern: /^541(?:810|820|830|840|850|860|870|890|430|490)/, segment: "K" },
];

export function matchSubSegments(input: ProfServicesClassifierInput): ProfServicesSubSegment[] {
  const naics = input.naicsCode;
  const matches = NAICS_RULES.filter((r) => r.pattern.test(naics)).map((r) => r.segment);
  return [...new Set(matches)];
}

export function applyClassifierRules(input: ProfServicesClassifierInput): ProfServicesSubSegment {
  const matches = matchSubSegments(input);
  if (matches.length === 0) return "M";
  if (matches.length === 1) return matches[0];
  if (input.revenueMix) {
    const ranked = matches
      .map((s) => ({ s, v: input.revenueMix?.[s] ?? 0 }))
      .sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SubSegmentAmbiguityError("Ambiguous NAICS mapping", matches);
}
`,
);

industryModule(
  "sub-segment-classifier/pure-core.ts",
  `import type { ProfServicesClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";`,
  `export function classifyProfServicesSubSegmentPure(input: ProfServicesClassifierInput) {
  return applyClassifierRules(input);
}
`,
);

industryModule(
  "sub-segment-classifier/index.ts",
  `import type { ProfServicesClassifierInput, ProfServicesSubSegment } from "./types";
import { classifyProfServicesSubSegmentPure } from "./pure-core";
import { createPsAuditEmitter } from "../audit/ps-audit-emitter";`,
  `export function classifyProfServicesSubSegment(
  ctx: ProfServicesClassifierInput,
  emitter = createPsAuditEmitter(),
): ProfServicesSubSegment {
  assertContainsProfessionalEngagementData(ctx);
  const segment = classifyProfServicesSubSegmentPure(ctx);
  emitter.emitEngagementLetter("sub-segment-classified", { naicsCode: ctx.naicsCode, segment });
  return segment;
}

export * from "./types";
export * from "./pure-core";
`,
);

// --- Framework router (5 switch points) ---
industryModule(
  "framework-router/cross-blend-types.ts",
  ``,
  `export type ProfServicesFramework = "US_GAAP" | "IFRS";

export interface ProfServicesCrossBlendBasisType {
  framework: ProfServicesFramework;
  basisType: string;
  handleId: string;
}

export const PS_CROSS_BLEND_BASIS_TYPES: ProfServicesCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-criteria", handleId: "ASC.606-10-25-27" },
  { framework: "IFRS", basisType: "over-time-criteria", handleId: "IFRS15.Para35-37" },
  { framework: "US_GAAP", basisType: "variable-consideration-constraint", handleId: "ASC.606-10-32-6" },
  { framework: "IFRS", basisType: "variable-consideration-constraint", handleId: "IFRS15.Para56-58" },
  { framework: "US_GAAP", basisType: "ssp-hierarchy", handleId: "ASC.606-10-32-33" },
  { framework: "IFRS", basisType: "ssp-hierarchy", handleId: "IFRS15.78-79" },
  { framework: "US_GAAP", basisType: "lease-scope", handleId: "ASC.842-10-15-3" },
  { framework: "IFRS", basisType: "lease-scope", handleId: "IFRS16.Page" },
  { framework: "US_GAAP", basisType: "ias38-capitalization", handleId: "ASC.340-40-25-1" },
  { framework: "IFRS", basisType: "ias38-capitalization", handleId: "IAS38.Page" },
];
`,
);

industryModule(
  "framework-router/parity-map.ts",
  ``,
  `export const ASC_IFRS_PS_PARITY_MAP: Array<{ asc: string; ifrs: string }> = [
  { asc: "ASC.606-10-25-27", ifrs: "IFRS15.Para35-37" },
  { asc: "ASC.606-10-32-6", ifrs: "IFRS15.Para56-58" },
  { asc: "ASC.606-10-32-33", ifrs: "IFRS15.78-79" },
  { asc: "ASC.842-10-15-3", ifrs: "IFRS16.Page" },
  { asc: "ASC.340-40-25-1", ifrs: "IAS38.Page" },
  { asc: "ASC.606-10-55-39", ifrs: "IFRS15.AgentPrincipal" },
  { asc: "ASC.606-10-32-28", ifrs: "IFRS15.78-79" },
];
`,
);

industryModule(
  "framework-router/back-compat-shim.ts",
  `import type { ProfServicesFramework } from "./cross-blend-types";`,
  `export function defaultFramework(input?: { framework?: ProfServicesFramework }): ProfServicesFramework {
  return input?.framework ?? "US_GAAP";
}
`,
);

industryModule(
  "framework-router/index.ts",
  `import type { ProfServicesCrossBlendBasisType, ProfServicesFramework } from "./cross-blend-types";
import { ASC_IFRS_PS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveProfServicesCitationHandle } from "../../libraries/prof-services/handles";
import { createPsAuditEmitter } from "../audit/ps-audit-emitter";`,
  `export function routeByFramework(
  ctx: { containsProfessionalEngagementData?: boolean; framework?: ProfServicesFramework },
  basis: ProfServicesCrossBlendBasisType,
  emitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitEngagementLetter("framework-switched", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("PS_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("PS_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  emitter.emitEngagementLetter("handle-whitelist-validated", { handleId: basis.handleId, framework });
  return resolveProfServicesCitationHandle(basis.handleId);
}

export { ASC_IFRS_PS_PARITY_MAP, defaultFramework };
export * from "./cross-blend-types";
`,
);

// --- Industry runtime modules ---
const industryModules = [
  ["principal-vs-agent/index.ts", "principal-vs-agent-evaluated", "principal-vs-agent"],
  ["retainer/index.ts", "retainer-series-evaluated", "retainer"],
  ["ssp-hierarchy/index.ts", "ssp-hierarchy-evaluated", "ssp-hierarchy"],
  ["variable-consideration/index.ts", "variable-consideration-evaluated", "variable-consideration"],
  ["pe-seal-gate/index.ts", "pe-seal-gate-evaluated", "pe-seal-gate"],
  ["coi-registry/index.ts", "coi-registry-evaluated", "coi-registry"],
  ["it-services-controls/index.ts", "it-services-controls-evaluated", "it-services-controls"],
];

for (const [rel, outcome, moduleName] of industryModules) {
  const extra =
    moduleName === "coi-registry"
      ? `
  if ((input.subSegment === "L" || input.subSegment === "A") && !input.coiDisclosed) {
    emitDualAudit(emitter, { code: "PS_COI_STRUCTURAL_FAIL", message: "COI structural required for L+A" });
    throw Object.assign(new Error("PS_COI_STRUCTURAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_COI_STRUCTURAL_FAIL", message: "L+A" }],
    });
  }
  if (input.subSegment === "M" && input.highRiskMatter && !input.coiDisclosed) {
    emitDualAudit(emitter, { code: "PS_COI_CONDITIONAL_FAIL", message: "COI required for high-risk M" });
    throw Object.assign(new Error("PS_COI_CONDITIONAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_COI_CONDITIONAL_FAIL", message: "M" }],
    });
  }`
      : moduleName === "pe-seal-gate"
        ? `
  if (input.subSegment === "E" && !input.sealPresent) {
    emitDualAudit(emitter, { code: "PS_PE_SEAL_FAIL", message: "PE seal required for E" });
    throw Object.assign(new Error("PS_PE_SEAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_PE_SEAL_FAIL", message: "E" }],
    });
  }`
        : moduleName === "it-services-controls"
          ? `
  if (input.subSegment === "I" && (!input.soc2Type2 || !input.hipaaBaa || !input.gdprArt28)) {
    emitDualAudit(emitter, { code: "PS_IT_CONTROLS_FAIL", message: "SOC/HIPAA/GDPR stack required for I" });
    throw Object.assign(new Error("PS_IT_CONTROLS_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IT_CONTROLS_FAIL", message: "I" }],
    });
  }`
          : "";

  industryModule(
    rel,
    `import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";`,
    `export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  ${extra}
  emitter.emitEngagementLetter("${outcome}", { module: "${moduleName}", input });
  return { ok: true };
}`,
  );
}

industryModule(
  "index.ts",
  `export * from "./audit/ps-audit-emitter";
export * from "./sub-segment-classifier";
export * from "./framework-router";
export * from "./principal-vs-agent";
export * from "./retainer";
export * from "./ssp-hierarchy";
export * from "./variable-consideration";
export * from "./pe-seal-gate";
export * from "./coi-registry";
export * from "./it-services-controls";`,
  `export const PROF_SERVICES_INDUSTRY_WAVE = 2 as const;`,
);

// --- IFRS library updates ---
write(
  `${PS_LIB}/ifrs/ias38-internally-generated.ts`,
  `import { assertContainsProfessionalEngagementData } from "../../standards/doctrine/containsProfessionalEngagementData";
import { resolveProfServicesCitationHandle } from "../handles";
import { createPsAuditEmitter } from "../../industry/prof-services/audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../../industry/prof-services/audit/ps-audit-emitter";

export const IAS38_SIX_CRITERIA = [
  "identifiable",
  "controlled",
  "futureBenefits",
  "costReliablyMeasured",
  "probableFutureBenefits",
  "developmentPhase",
] as const;

export function evaluateIas38Capitalization(
  ctx: { containsProfessionalEngagementData?: boolean },
  criteria: Record<(typeof IAS38_SIX_CRITERIA)[number], boolean>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  const pass = IAS38_SIX_CRITERIA.every((k) => criteria[k] === true);
  if (!pass) {
    emitter.emitEscalation("PS_IAS38_CAPITALIZATION_REFUSED", "IAS38 six-criterion gate failed");
    emitter.emitEngagementLetter("rejected-escalation", { criteria });
    throw Object.assign(new Error("PS_IAS38_CAPITALIZATION_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IAS38_CAPITALIZATION_REFUSED", message: "ias38" }],
    });
  }
  emitter.emitEngagementLetter("ias38-capitalization-evaluated", { criteria, handle: resolveProfServicesCitationHandle("IAS38.Page") });
  return { capitalized: true };
}
`,
);

write(
  `${PS_LIB}/ifrs/ifrs15-prof-services.ts`,
  `import { resolveProfServicesCitationHandle } from "../handles";
export const IFRS15_PS_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B14-B19", "IFRS15.AgentPrincipal", "IFRS15.VariableConsideration"] as const;
export function resolveIfrs15ProfServicesHandles() {
  return IFRS15_PS_HANDLES.map((h) => resolveProfServicesCitationHandle(h));
}
export * from "./ifrs15";
`,
);

write(
  `${PS_LIB}/ifrs/ifrs16-office-leases.ts`,
  `import { resolveProfServicesCitationHandle } from "../handles";
export const IFRS16_OFFICE_HANDLES = ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16", "IFRS16.LesseeAccounting"] as const;
export function resolveIfrs16OfficeLeaseHandles() {
  return IFRS16_OFFICE_HANDLES.map((h) => resolveProfServicesCitationHandle(h));
}
export * from "./ifrs16";
`,
);

const ias38Stub = path.join(root, `${PS_LIB}/ifrs/ias38-stub.ts`);
if (fs.existsSync(ias38Stub)) {
  fs.unlinkSync(ias38Stub);
}

// --- KPI (10 files) ---
const kpis = [
  ["prof-services-revenue/realized-revenue.ts", "realized-revenue"],
  ["prof-services-revenue/backlog-to-revenue.ts", "backlog-to-revenue"],
  ["prof-services-revenue/retainer-revenue.ts", "retainer-revenue"],
  ["prof-services-margin/gross-margin-by-subsegment.ts", "gross-margin-by-subsegment"],
  ["prof-services-margin/effective-billing-rate.ts", "effective-billing-rate"],
  ["prof-services-working-capital/wip-to-revenue.ts", "wip-to-revenue"],
  ["prof-services-working-capital/days-wip-outstanding.ts", "days-wip-outstanding"],
  ["prof-services-working-capital/unbilled-receivable-days.ts", "unbilled-receivable-days"],
  ["prof-services-engagement/engagement-letter-compliance.ts", "engagement-letter-compliance"],
  ["prof-services-engagement/utilization-rate.ts", "utilization-rate"],
];
for (const [pathSuffix, key] of kpis) {
  write(
    `kpi/${pathSuffix}`,
    `import { assertContainsProfessionalEngagementData } from "../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export const KPI_KEY = "${key}";
export function compute(ctx: { containsProfessionalEngagementData?: boolean }, input: Record<string, number>) {
  assertContainsProfessionalEngagementData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}`,
  );
}

// --- Disclosure (9 new files) ---
const disclosures = [
  "engagement-letter-audit-disclosure",
  "coi-disclosure",
  "pe-seal-disclosure",
  "independence-disclosure",
  "it-services-compliance-disclosure",
  "variable-consideration-disclosure",
  "ssp-hierarchy-disclosure",
  "retainer-series-disclosure",
  "ifrs-dual-framework-disclosure",
];
for (const name of disclosures) {
  write(
    `disclosure-variants/prof-services/${name}.ts`,
    `import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export function build(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { variant: "${name}", frameworks: ["US_GAAP", "IFRS"] };
}`,
  );
}

// --- Reasonableness (6 new bounds) ---
const reason = [
  ["engagement-letter-compliance-bounds.ts", "ABA.EngagementLetter.Std"],
  ["variable-consideration-bounds.ts", "Rosenberg.Benchmark.109"],
  ["ssp-allocation-bounds.ts", "SPI.Benchmark.117"],
  ["pe-seal-compliance-bounds.ts", "NCEES.ModelRules.240.15"],
  ["it-services-control-bounds.ts", "AICPA.TSC.SOC2"],
  ["dual-framework-margin-bounds.ts", "SourceGlobal.Margin"],
];
for (const [file, handle] of reason) {
  write(
    `reasonableness/prof-services/${file}`,
    `import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export const BENCHMARK_HANDLE = "${handle}";
export function bounds(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "Prof_Services_Benchmarks_Sources.md" };
}`,
  );
}

// --- Library doctrine lift ---
const DOCTRINE_IMPORT =
  'import { assertContainsProfessionalEngagementData } from "../../standards/doctrine/containsProfessionalEngagementData";';
const DOCTRINE_LINE = "@doctrine containsProfessionalEngagementData: true";

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

  const infraOnly = [
    "errors.ts",
    "handles.ts",
    "handles-registry.generated.ts",
    "types.ts",
    path.join("audit", "channels", "_reserved-engagement-letter.ts"),
  ].some((suffix) => relativePath.replace(/\\/g, "/").endsWith(suffix));

  src = src.replace(new RegExp(` \\* ${DOCTRINE_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n`, "g"), "");
  src = src.replace(new RegExp(`${DOCTRINE_LINE}\\n`, "g"), "");

  if (infraOnly) {
    src = src.replace(`${DOCTRINE_IMPORT}\n`, "");
    src = src.replace(`${DOCTRINE_IMPORT}\n\n`, "");
    fs.writeFileSync(absolute, src, "utf8");
    if (!created.includes(relativePath)) created.push(relativePath);
    return;
  }

  if (!src.includes(DOCTRINE_LINE) && src.includes("assertContainsProfessionalEngagementData")) return;

  if (!src.includes("assertContainsProfessionalEngagementData") && !relativePath.endsWith("types.ts")) {
    if (!src.includes(DOCTRINE_IMPORT)) {
      const headerEnd = src.indexOf("*/");
      if (headerEnd !== -1) {
        src = `${src.slice(0, headerEnd + 2)}\n${DOCTRINE_IMPORT}${src.slice(headerEnd + 2)}`;
      } else {
        src = `${DOCTRINE_IMPORT}\n${src}`;
      }
    }

    src = src.replace(
      /export function (\w+)\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        if (match.includes("assertContainsProfessionalEngagementData")) return match;
        if (params.includes("ctx:") || params.startsWith("ctx,") || params === "ctx") {
          return `${match.slice(0, -1)}\n  assertContainsProfessionalEngagementData(ctx);\n`;
        }
        const trimmed = params.trim();
        const newParams = trimmed.length > 0
          ? `ctx: { containsProfessionalEngagementData?: boolean }, ${params}`
          : "ctx: { containsProfessionalEngagementData?: boolean }";
        return `export function ${name}(${newParams}) {\n  assertContainsProfessionalEngagementData(ctx);\n`;
      },
    );
  }

  fs.writeFileSync(absolute, src, "utf8");
  if (!created.includes(relativePath)) created.push(relativePath);
}

for (const rel of listTsFiles(PS_LIB)) {
  if (rel.includes("ias38-stub")) continue;
  liftLibraryFile(rel);
}

write(
  `${PS_LIB}/errors.ts`,
  `/**
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
export interface ProfServicesViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(code: string, message: string): ProfServicesViolationError {
  const err = new Error(message) as ProfServicesViolationError;
  err.name = "ProfServicesViolation";
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function ProfServicesViolation(code: string, message: string) {
  return createViolation(code, message);
}

export function ProfServicesHandleNotResolvable(handleId: string) {
  return createViolation("PS_HANDLE_NOT_RESOLVABLE", \`Handle not registered: \${handleId}\`);
}
`,
);

// Update library index exports for IFRS
const libIndexPath = `${PS_LIB}/index.ts`;
let libIndex = readFile(libIndexPath);
libIndex = libIndex.replace(/export \* from "\.\/ifrs\/ias38-stub";?\n?/g, "");
if (!libIndex.includes("ias38-internally-generated")) {
  libIndex = libIndex.trimEnd() + '\nexport * from "./ifrs/ias38-internally-generated";\nexport * from "./ifrs/ifrs15-prof-services";\nexport * from "./ifrs/ifrs16-office-leases";\n';
}
fs.writeFileSync(path.join(root, libIndexPath), libIndex, "utf8");
if (!created.includes(libIndexPath)) created.push(libIndexPath);

// --- Memory framework dimension ---
const memDim = readFile("lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts");
if (!memDim.includes("PROF_SERVICES_DUAL_FRAMEWORK")) {
  write(
    "lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts",
    memDim.replace(
      `export type FrameworkScopedMemoryDimension = ReportingFrameworkIdentifier | "US_GAAP_ONLY" | "CONSTRUCTION_DUAL_FRAMEWORK";`,
      `export type FrameworkScopedMemoryDimension = ReportingFrameworkIdentifier | "US_GAAP_ONLY" | "CONSTRUCTION_DUAL_FRAMEWORK" | "PROF_SERVICES_DUAL_FRAMEWORK";`,
    ),
  );
}

// --- Profile back-compat shim ---
const profilePath = "industry-profiles/prof-services/profile.ts";
const profile = fs.readFileSync(path.join(root, profilePath), "utf8");
if (!profile.includes("resolveProfServicesSubSegment")) {
  fs.writeFileSync(
    path.join(root, profilePath),
    `${profile}

import { classifyProfServicesSubSegment } from "../../lib/intelligence/synthetic/industry/prof-services/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (PS-2). */
export function resolveProfServicesSubSegment(input: {
  naicsCode: string;
  revenueMix?: Partial<Record<"L" | "A" | "M" | "I" | "E" | "K", number>>;
  containsProfessionalEngagementData?: boolean;
}) {
  return classifyProfServicesSubSegment({ ...input, containsProfessionalEngagementData: true });
}
`,
    "utf8",
  );
  created.push(profilePath);
}

// --- Command center ---
const ccPath = "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts";
let cc = fs.readFileSync(path.join(root, ccPath), "utf8");
if (!cc.includes("prof_services_item — routed via PS-2")) {
  cc = cc.replace(
    `  | "prof_services_item"`,
    `  /** prof_services_item — routed via PS-2 industry kernel (LOCK-PS-2). */
  | "prof_services_item"`,
  );
  fs.writeFileSync(path.join(root, ccPath), cc, "utf8");
  created.push(ccPath);
}

console.log("PS-2 scaffold complete.");
console.log(`Files created/updated: ${created.length}`);
for (const f of created.sort()) {
  console.log(`  ${f}`);
}
