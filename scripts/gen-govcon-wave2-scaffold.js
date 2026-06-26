/**
 * Generates GC-2 Wave 2 industry/govcon scaffold:
 * - FAR 31.205 modules (52 subsections)
 * - CAS modules (8 in-scope)
 * - Sub-segment modules (6)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const farDir = path.join(root, "lib/intelligence/synthetic/industry/govcon/far-31-205");
const casDir = path.join(root, "lib/intelligence/synthetic/industry/govcon/cas");
const segDir = path.join(root, "lib/intelligence/synthetic/industry/govcon/sub-segments");
const farSources = path.join(root, "docs/govcon/wave1/GovCon_FAR31_Sources.md");

const HEADER = `/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */
`;

function parseFar205Handles() {
  const registryPath = path.join(root, "lib/intelligence/synthetic/standards/govcon/handles-registry.generated.ts");
  const registry = fs.readFileSync(registryPath, "utf8");
  const handles = new Map();
  const re = /"(FAR_31_205_[^"]+)"/g;
  let m;
  while ((m = re.exec(registry)) !== null) {
    const handleId = m[1];
    const numMatch = handleId.match(/FAR_31_205_(\d+)/);
    if (numMatch) handles.set(numMatch[1], handleId);
  }
  for (const n of ["2", "5", "9", "24", "45", "50"]) {
    if (!handles.has(n)) handles.set(n, "FAR_31_SUBPART_2");
  }
  return [...handles.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
}

function farModuleContent(subsection, handleId) {
  if (subsection === "6" || subsection === "46") return null;
  const fn = `evaluateAllowability_31_205_${subsection}`;
  const file = `evaluate-31-205-${subsection}.ts`;
  const body = `${HEADER}
import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";

export function ${fn}(
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  const handle = resolveGovConCitationHandle("${handleId}");
  if (!input.structuralPreconditionsMet) {
    const escalation = emitEscalationAudit(emitter, {
      code: "GOVCON_FAR_PRECONDITION_FAIL",
      message: \`FAR 31.205-${subsection} structural preconditions failed\`,
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "far-31-205-allowability",
      evidence: { subsection: "${subsection}", url: handle.url },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    return { allowed: false, handleId: handle.handleId, escalationAudits: [escalation.message] };
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "far-31-205-allowability",
    evidence: { subsection: "${subsection}", url: handle.url, costCategory: input.costCategory },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { allowed: true, handleId: handle.handleId, escalationAudits: [] };
}
`;
  return { file, body, fn, subsection, handleId };
}

function writeFarModules() {
  fs.mkdirSync(farDir, { recursive: true });
  const handles = parseFar205Handles();
  const exports = [];
  for (const [subsection, handleId] of handles) {
    const mod = farModuleContent(subsection, handleId);
    if (!mod) continue;
    const { file, body, fn } = mod;
    fs.writeFileSync(path.join(farDir, file), body, "utf8");
    exports.push({ fn, file: file.replace(/\.ts$/, ""), subsection, handleId });
  }
  const dispatchBody = `${HEADER}
import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
${exports.map((e) => `import { ${e.fn} } from "./${e.file}";`).join("\n")}
import { evaluateAllowability_31_205_6 } from "./evaluate-31-205-6";
import { evaluateAllowability_31_205_46 } from "./evaluate-31-205-46";

export const FAR_31_205_SUBSECTION_COUNT = ${exports.length};

const DISPATCH: Record<string, (input: AllowabilityInput, emitter: GcAuditEmitter) => AllowabilityResult> = {
${exports.map((e) => `  "${e.subsection}": ${e.fn},`).join("\n")}
};

export function evaluateFar31205Allowability(
  subsection: string,
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  if (subsection === "6") return evaluateAllowability_31_205_6(input, emitter);
  if (subsection === "46") return evaluateAllowability_31_205_46(input, emitter);
  const evaluator = DISPATCH[subsection];
  if (!evaluator) {
    throw Object.assign(new Error(\`Unknown FAR 31.205 subsection: \${subsection}\`), {
      code: "GOVCON_FAR_UNKNOWN_SUBSECTION",
      escalationAudits: [{ channel: "escalation-audit", code: "GOVCON_FAR_UNKNOWN_SUBSECTION", message: \`Unknown subsection \${subsection}\` }],
    });
  }
  return evaluator(input, emitter);
}

export { evaluateAllowability_31_205_6 };
`;
  fs.writeFileSync(path.join(farDir, "index.ts"), dispatchBody, "utf8");
  console.log(`Wrote ${exports.length} FAR 31.205 modules`);
  return exports.length;
}

const CAS_MODULES = [
  { id: "401", handle: "CAS_401_CONSISTENCY_ESTIMATING", file: "cas-401.ts", fn: "evaluateCas401" },
  { id: "402", handle: "CAS_402_CONSISTENCY_ALLOCATING", file: "cas-402.ts", fn: "evaluateCas402" },
  { id: "403", handle: "CAS_403_HOME_OFFICE_ALLOC", file: "cas-403.ts", fn: "evaluateCas403" },
  { id: "405", handle: "CAS_405_UNALLOWABLE", file: "cas-405.ts", fn: "evaluateCas405" },
  { id: "406", handle: "CAS_406_ACCOUNTING_PERIOD", file: "cas-406.ts", fn: "evaluateCas406" },
  { id: "410", handle: "CAS_410_GA_ALLOCATION", file: "cas-410.ts", fn: "evaluateCas410" },
  { id: "418", handle: "CAS_418_DIRECT_INDIRECT", file: "cas-418.ts", fn: "evaluateCas418" },
  { id: "420", handle: "CAS_420_IRAD_BP", file: "cas-420.ts", fn: "evaluateCas420" },
];

function casModuleContent(mod) {
  return `${HEADER}
import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { CasEvaluationInput, CasEvaluationResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";

export function ${mod.fn}(input: CasEvaluationInput, emitter: GcAuditEmitter): CasEvaluationResult {
  const handle = resolveGovConCitationHandle("${mod.handle}");
  if (!input.structuralPreconditionsMet) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_CAS_PRECONDITION_FAIL",
      message: \`CAS ${mod.id} structural preconditions failed\`,
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "cas-application",
      evidence: { casId: "${mod.id}", url: handle.url },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    return { compliant: false, handleId: handle.handleId };
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "cas-application",
    evidence: { casId: "${mod.id}", url: handle.url },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { compliant: true, handleId: handle.handleId };
}
`;
}

function writeCasModules() {
  fs.mkdirSync(casDir, { recursive: true });
  for (const mod of CAS_MODULES) {
    fs.writeFileSync(path.join(casDir, mod.file), casModuleContent(mod), "utf8");
  }
  const ds1 = `${HEADER}
import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { CasEvaluationInput } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { evaluateCas401 } from "./cas-401";

export function reconcileDs1Disclosure(
  input: CasEvaluationInput & { disclosedPractice: string; resolvedPractice: string; contractAwardUsd: number },
  emitter: GcAuditEmitter,
): { reconciled: boolean } {
  const handle = resolveGovConCitationHandle("CASB_DS_1_FORM");
  const requiresFull = input.contractAwardUsd >= 50_000_000;
  const requiresModified = input.contractAwardUsd >= 7_500_000;
  if (!requiresModified) {
    emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { ds1: "below-threshold" }, outcome: "allowed", handleId: handle.handleId });
    return { reconciled: true };
  }
  const cas401 = evaluateCas401(input, emitter);
  if (!cas401.compliant) return { reconciled: false };
  if (input.disclosedPractice !== input.resolvedPractice) {
    emitEscalationAudit(emitter, { code: "GOVCON_DS1_MISMATCH", message: "DS-1 disclosed practice mismatch", subSegmentId: "C", handleId: handle.handleId });
    emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { mismatch: true, requiresFull }, outcome: "rejected-escalation", handleId: handle.handleId });
    return { reconciled: false };
  }
  emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { ds1: "reconciled", requiresFull }, outcome: "allowed", handleId: handle.handleId });
  return { reconciled: true };
}
`;
  const ds2stub = `${HEADER}
/** DS-2 (educational institutions) — handle stub only; enforcement deferred to GC-3 per Q6=A */
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";

export function getDs2HandleUrl(): string {
  return resolveGovConCitationHandle("CASB_DS_2_FORM").url;
}
`;
  fs.writeFileSync(path.join(casDir, "ds1-reconciliation.ts"), ds1, "utf8");
  fs.writeFileSync(path.join(casDir, "ds2-stub.ts"), ds2stub, "utf8");
  const index = `${HEADER}
${CAS_MODULES.map((m) => `export { ${m.fn} } from "./${m.file.replace(".ts", "")}";`).join("\n")}
export { reconcileDs1Disclosure } from "./ds1-reconciliation";
export { getDs2HandleUrl } from "./ds2-stub";
export const CAS_IN_SCOPE_COUNT = ${CAS_MODULES.length};
`;
  fs.writeFileSync(path.join(casDir, "index.ts"), index, "utf8");
  console.log(`Wrote ${CAS_MODULES.length} CAS modules + DS-1/DS-2 stub`);
}

const SEGMENTS = [
  { id: "C", file: "c-cas-covered.ts", export: "activateCasCoveredSubSegment" },
  { id: "N", file: "n-non-cas.ts", export: "activateNonCasSubSegment" },
  { id: "S", file: "s-small-business.ts", export: "activateSmallBusinessSubSegment" },
  { id: "R", file: "r-rd-sbir.ts", export: "activateRdSbirSubSegment" },
  { id: "F", file: "f-ffp-heavy.ts", export: "activateFfpHeavySubSegment" },
  { id: "T", file: "t-tm.ts", export: "activateTmSubSegment" },
];

function segmentModule(seg) {
  const sbirNote = seg.id === "R" ? "\n  /** SBIR Phase I/II/III attributed inside R per Q9=A */\n  sbirPhase?: \"I\" | \"II\" | \"III\";" : "";
  return `${HEADER}
import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import { getGovConSubSegmentKernel } from "../../../standards/govcon";

export interface SubSegmentActivationInput {
  entityId: string;
  subSegmentId: "${seg.id}";${sbirNote}
}

export function ${seg.export}(input: SubSegmentActivationInput, emitter: GcAuditEmitter) {
  const kernel = getGovConSubSegmentKernel("${seg.id}");
  emitter.emitDcaaRateAudit({
    subSegmentId: "${seg.id}",
    decisionType: "rate-resolution",
    evidence: { entityId: input.entityId, scope: kernel.description },
    outcome: "allowed",
    handleId: "FAR_31_SUBPART_2",
  });
  return { active: true, kernel };
}
`;
}

function writeSegments() {
  fs.mkdirSync(segDir, { recursive: true });
  for (const seg of SEGMENTS) {
    fs.writeFileSync(path.join(segDir, seg.file), segmentModule(seg), "utf8");
  }
  const index = `${HEADER}
${SEGMENTS.map((s) => `export { ${s.export} } from "./${s.file.replace(".ts", "")}";`).join("\n")}
export const GOVCON_SUB_SEGMENT_COUNT = ${SEGMENTS.length};
`;
  fs.writeFileSync(path.join(segDir, "index.ts"), index, "utf8");
  console.log(`Wrote ${SEGMENTS.length} sub-segment modules`);
}

writeFarModules();
writeCasModules();
writeSegments();
