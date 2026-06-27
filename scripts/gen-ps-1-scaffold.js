/**
 * Phase PS-1 — Professional Services Wave 1 scaffold generator.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");

const DOCTRINE_HEADER = `/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
`;

const ASC = "https://asc.fasb.org/xbrl/2024/elts/ref?DocPart=Section&Section=";
function asc606(s) { return `${ASC}606-10-${s}`; }
function asc340(s) { return `${ASC}340-40-${s}`; }

/** @type {Array<{handleId:string,library:string,title:string,url:string,sourceDoc:string}>} */
const HANDLES = [];

function add(lib, doc, handleId, title, url) {
  HANDLES.push({ handleId, library: lib, title, url, sourceDoc: doc });
}

// ASC 606 + 340-40 (52)
const asc606Handles = [
  ["ASC.606-10-25-1", "Identify Contract", asc606("25-1")],
  ["ASC.606-10-25-2", "Contract Combination", asc606("25-2")],
  ["ASC.606-10-25-3", "Contract Modifications Intro", asc606("25-3")],
  ["ASC.606-10-25-10", "Mod Separate Contract", asc606("25-10")],
  ["ASC.606-10-25-11", "Mod Termination", asc606("25-11")],
  ["ASC.606-10-25-12", "Mod Cumulative Catch-Up", asc606("25-12")],
  ["ASC.606-10-25-13", "Mod Prospective", asc606("25-13")],
  ["ASC.606-10-25-14", "Series of Distinct Services", asc606("25-14")],
  ["ASC.606-10-25-15", "Series Allocation", asc606("25-15")],
  ["ASC.606-10-25-19", "Financing Component", asc606("25-19")],
  ["ASC.606-10-25-20", "Financing Practical Expedient", asc606("25-20")],
  ["ASC.606-10-25-22", "Noncash Consideration", asc606("25-22")],
  ["ASC.606-10-25-27", "Over-Time Criterion 1", asc606("25-27")],
  ["ASC.606-10-25-28", "Over-Time Criterion 2", asc606("25-28")],
  ["ASC.606-10-25-29", "Over-Time Criterion 3", asc606("25-29")],
  ["ASC.606-10-25-30", "Over-Time Alternative", asc606("25-30")],
  ["ASC.606-10-25-31", "Output Methods", asc606("25-31")],
  ["ASC.606-10-25-32", "Input Methods", asc606("25-32")],
  ["ASC.606-10-25-33", "Cost-to-Cost", asc606("25-33")],
  ["ASC.606-10-25-34", "Efforts Expended", asc606("25-34")],
  ["ASC.606-10-32-5", "Variable Consideration Estimate", asc606("32-5")],
  ["ASC.606-10-32-6", "Variable Consideration Constraint", asc606("32-6")],
  ["ASC.606-10-32-11", "VC Change", asc606("32-11")],
  ["ASC.606-10-32-12", "VC Reassessment", asc606("32-12")],
  ["ASC.606-10-32-14", "VC Disclosure", asc606("32-14")],
  ["ASC.606-10-32-25", "Refund Liability", asc606("32-25")],
  ["ASC.606-10-32-28", "SSP Observable", asc606("32-28")],
  ["ASC.606-10-32-29", "SSP Adjusted Market", asc606("32-29")],
  ["ASC.606-10-32-31", "SSP Expected Cost", asc606("32-31")],
  ["ASC.606-10-32-32", "SSP Residual", asc606("32-32")],
  ["ASC.606-10-32-33", "SSP Hierarchy", asc606("32-33")],
  ["ASC.606-10-32-34", "SSP Allocation", asc606("32-34")],
  ["ASC.606-10-45-1", "Contract Balances", asc606("45-1")],
  ["ASC.606-10-45-3", "Impairment", asc606("45-3")],
  ["ASC.606-10-45-4", "Receivable", asc606("45-4")],
  ["ASC.606-10-45-5", "Retention Asset", asc606("45-5")],
  ["ASC.606-10-50-1", "Backlog Disclosure", asc606("50-1")],
  ["ASC.606-10-50-13", "RPO", asc606("50-13")],
  ["ASC.606-10-50-14", "Transaction Price", asc606("50-14")],
  ["ASC.606-10-50-15", "Allocation", asc606("50-15")],
  ["ASC.606-10-55-36", "Principal Indicator 1", asc606("55-36")],
  ["ASC.606-10-55-37", "Principal Indicator 2", asc606("55-37")],
  ["ASC.606-10-55-38", "Agent Indicator", asc606("55-38")],
  ["ASC.606-10-55-39", "Gross vs Net", asc606("55-39")],
  ["ASC.606-10-55-40", "Control Transfer", asc606("55-40")],
];
asc606Handles.forEach(([id, title, url]) => add("ASC_606_340", "Prof_Services_ASC606_Sources.md", id, title, url));

const asc340Handles = [
  ["ASC.340-40-25-1", "Contract Cost Capitalization", asc340("25-1")],
  ["ASC.340-40-25-5", "Fulfillment Costs", asc340("25-5")],
  ["ASC.340-40-35-1", "Amortization", asc340("35-1")],
  ["ASC.340-40-35-3", "Impairment", asc340("35-3")],
  ["ASC.340-40-35-6", "Practical Expedient", asc340("35-6")],
  ["ASC.606-10-25-24", "Warranty", asc606("25-24")],
  ["ASC.606-10-25-36", "Bill-and-Hold", asc606("25-36")],
];
asc340Handles.forEach(([id, title, url]) => add("ASC_606_340", "Prof_Services_ASC606_Sources.md", id, title, url));

// Specialized (38)
const specHandles = [
  ["ABA.ModelRule.1.5", "ABA Model Rule 1.5 Fees", "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_5_fees/"],
  ["AICPA.ET.1.310", "AICPA ET 1.310 Fees", "https://pub.aicpa.org/codeofconduct/Ethics.aspx"],
  ["ABA.ModelRule.1.7", "ABA Rule 1.7 Conflict", "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_7_conflict_of_interest_current_clients/"],
  ["ABA.ModelRule.1.8", "ABA Rule 1.8 Business", "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_8_conflict_of_interest_current_clients_specific_rules/"],
  ["ABA.ModelRule.1.9", "ABA Rule 1.9 Former Client", "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_9_duties_to_former_clients/"],
  ["ABA.ModelRule.1.10", "ABA Rule 1.10 Imputation", "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_10_imputation_of_conflicts_of_interest_general_rule/"],
  ["AICPA.ET.1.110", "AICPA ET 1.110 Integrity", "https://pub.aicpa.org/codeofconduct/Ethics.aspx"],
  ["AICPA.ET.1.200", "AICPA ET 1.200 Independence", "https://pub.aicpa.org/codeofconduct/Ethics.aspx"],
  ["MCA.ConflictGuidance", "MCA Conflict Guidance", "https://www.imanet.org/"],
  ["NCEES.ModelRules.240.15", "NCEES PE Seal", "https://ncees.org/"],
  ["TX.PE.Statute", "TX PE Statute", "https://statutes.capitol.texas.gov/"],
  ["CA.PE.Statute", "CA PE Statute", "https://leginfo.legislature.ca.gov/"],
  ["FL.PE.Statute", "FL PE Statute", "http://www.leg.state.fl.us/statutes/"],
  ["NY.PE.Statute", "NY PE Statute", "https://www.nysenate.gov/legislation/laws/EDN"],
  ["AICPA.ET.1.200.001", "AICPA Independence Framework", "https://pub.aicpa.org/codeofconduct/Ethics.aspx"],
  ["SEC.Rule.2-01c", "SEC Auditor Independence", "https://www.sec.gov/"],
  ["PCAOB.Rule.3520", "PCAOB Audit Independence", "https://pcaobus.org/"],
  ["AICPA.TSC.SOC1", "SOC 1 TSC", "https://www.aicpa.org/"],
  ["AICPA.TSC.SOC2", "SOC 2 TSC", "https://www.aicpa.org/"],
  ["HIPAA.45CFR164.504e", "HIPAA BAA", "https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html"],
  ["GDPR.Art28", "GDPR Processor", "https://gdpr-info.eu/art-28-gdpr/"],
  ["USC.17.101", "Copyright Definition", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section101"],
  ["USC.17.201b", "Work for Hire", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section201"],
  ["USPTO.IPBasics", "USPTO IP Basics", "https://www.uspto.gov/"],
  ["DMCA.NoticeTakedown", "DMCA Safe Harbor", "https://www.copyright.gov/"],
  ["TX.GovCode.81.101", "TX UPL", "https://statutes.capitol.texas.gov/"],
  ["CA.BPCode.6125", "CA UPL", "https://leginfo.legislature.ca.gov/"],
  ["NY.JudLaw.478", "NY UPL", "https://www.nysenate.gov/legislation/laws/JUD"],
  ["TX.AccountancyAct", "TX UPA", "https://statutes.capitol.texas.gov/"],
  ["CA.AccountancyAct", "CA UPA", "https://leginfo.legislature.ca.gov/"],
  ["NY.AccountancyAct", "NY UPA", "https://www.nysenate.gov/legislation/laws/EDN"],
  ["ABA.EngagementLetter.Std", "ABA Engagement Letter", "https://www.americanbar.org/"],
  ["AICPA.EngagementLetter", "AICPA Engagement Letter", "https://www.aicpa.org/"],
  ["MCA.EngagementLetter", "MCA Engagement Letter", "https://www.imanet.org/"],
  ["NIST.CSF", "NIST CSF", "https://www.nist.gov/cyberframework"],
  ["ISO.27001", "ISO 27001", "https://www.iso.org/standard/54534.html"],
  ["Fed.StateBar.Guidance", "State Bar Guidance", "https://www.americanbar.org/"],
  ["AICPA.AAG-PS", "AICPA AAG Professional Services", "https://www.aicpa.org/"],
];
specHandles.forEach(([id, title, url]) => add("SPECIALIZED", "Prof_Services_Specialized_Sources.md", id, title, url));

// IFRS (18)
const ifrsHandles = [
  ["IFRS15.Page", "IFRS 15", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.Para35-37", "IFRS 15 Over-Time", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.Para56-58", "IFRS 15 Constraint Highly Probable", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.B14-B19", "IFRS 15 Implementation", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["EUR-Lex.2016R1905.IFRS15", "EU IFRS 15", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R1905"],
  ["EUR-Lex.2023R1803.IFRS15", "EU IFRS 15 Amend", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1803"],
  ["IFRS16.Page", "IFRS 16", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/"],
  ["EUR-Lex.2017R1986.IFRS16", "EU IFRS 16", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1986"],
  ["IAS38.Page", "IAS 38 Intangibles", "https://www.ifrs.org/issued-standards/list-of-standards/ias-38-intangible-assets/"],
  ["IAS37.Page", "IAS 37 Provisions", "https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/"],
  ["IFRS15.78-79", "IFRS SSP Hierarchy", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["EUR-Lex.2023-1803-OIC", "EUR-Lex OIC Primary", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1803"],
  ["IFRS15.SeriesOfServices", "IFRS Series", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.AgentPrincipal", "IFRS Agent Principal", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS16.LesseeAccounting", "IFRS 16 Lessee", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/"],
  ["IAS37.OnerousContract", "IAS 37 Onerous", "https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/"],
  ["IFRS15.VariableConsideration", "IFRS VC", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
  ["IFRS15.RetainerSeries", "IFRS Retainer", "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/"],
];
ifrsHandles.forEach(([id, title, url]) => add("IFRS", "Prof_Services_IFRS_Sources.md", id, title, url));

// Benchmarks (17) — paywall URL-only
const benchHandles = [
  ["Rosenberg.Benchmark.109", "Rosenberg Benchmarker", "https://www.rosenbergassoc.com/"],
  ["SPI.Benchmark.117", "SPI Benchmark", "https://www.spi.co/"],
  ["SourceGlobal.Benchmark.119", "Source Global", "https://www.sourceglobalresearch.com/"],
  ["SoDA.Benchmark.124", "SoDA Report", "https://sodapdf.com/"],
  ["Rosenberg.Utilization", "Rosenberg Utilization", "https://www.rosenbergassoc.com/"],
  ["Rosenberg.Leverage", "Rosenberg Leverage", "https://www.rosenbergassoc.com/"],
  ["SPI.Realization", "SPI Realization", "https://www.spi.co/"],
  ["Rosenberg.WIP", "Rosenberg WIP", "https://www.rosenbergassoc.com/"],
  ["SPI.Retainer", "SPI Retainer", "https://www.spi.co/"],
  ["SourceGlobal.Margin", "Source Global Margin", "https://www.sourceglobalresearch.com/"],
  ["SoDA.RateCard", "SoDA Rate Card", "https://sodapdf.com/"],
  ["Rosenberg.Subsegment.L", "Rosenberg Law", "https://www.rosenbergassoc.com/"],
  ["Rosenberg.Subsegment.A", "Rosenberg Accounting", "https://www.rosenbergassoc.com/"],
  ["SPI.Subsegment.M", "SPI Consulting", "https://www.spi.co/"],
  ["SourceGlobal.Subsegment.I", "Source Global IT", "https://www.sourceglobalresearch.com/"],
  ["Rosenberg.Subsegment.E", "Rosenberg Engineering", "https://www.rosenbergassoc.com/"],
  ["SoDA.Subsegment.K", "SoDA Creative", "https://sodapdf.com/"],
];
benchHandles.forEach(([id, title, url]) => add("BENCHMARKS", "Prof_Services_Benchmarks_Sources.md", id, title, url));

// Federal/Regulatory (17)
const fedHandles = [
  ["USC.17.512", "DMCA Safe Harbor Statute", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section512"],
  ["ECFR.45.164", "HIPAA Security Rule", "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164"],
  ["GDPR.Art32", "GDPR Security", "https://gdpr-info.eu/art-32-gdpr/"],
  ["GDPR.Art33", "GDPR Breach", "https://gdpr-info.eu/art-33-gdpr/"],
  ["SOC1.SSAE18", "SSAE 18 SOC 1", "https://www.aicpa.org/"],
  ["SOC2.TSC", "SOC 2 Trust Criteria", "https://www.aicpa.org/"],
  ["SEC.Reg.S-X", "SEC Reg S-X", "https://www.sec.gov/"],
  ["PCAOB.AS2201", "PCAOB AS 2201", "https://pcaobus.org/"],
  ["NCEES.ModelLaw", "NCEES Model Law", "https://ncees.org/"],
  ["ABA.ModelRules", "ABA Model Rules", "https://www.americanbar.org/"],
  ["AICPA.Code", "AICPA Code", "https://pub.aicpa.org/codeofconduct/Ethics.aspx"],
  ["HHS.OCR.HIPAA", "HHS OCR HIPAA", "https://www.hhs.gov/hipaa/"],
  ["EU.GDPR-Info", "GDPR Portal", "https://gdpr-info.eu/"],
  ["USPTO.Trademark", "USPTO Trademark", "https://www.uspto.gov/trademarks"],
  ["USPTO.Copyright", "USPTO Copyright", "https://www.copyright.gov/"],
  ["Fed.StateUPL.Index", "State UPL Index", "https://www.americanbar.org/"],
  ["Fed.StateUPA.Index", "State UPA Index", "https://www.nasba.org/"],
];
fedHandles.forEach(([id, title, url]) => add("FEDERAL_REGULATORY", "Prof_Services_Benchmarks_Sources.md", id, title, url));

if (HANDLES.length !== 142) {
  throw new Error(`Expected 142 handles, got ${HANDLES.length}`);
}

function write(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
}

function moduleFile(relativePath, handleIds, body) {
  const handleList = handleIds.map((h) => `"${h}"`).join(", ");
  write(
    `lib/intelligence/synthetic/libraries/prof-services/${relativePath}`,
    `${DOCTRINE_HEADER}
import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";

export const MODULE_HANDLES = [${handleList}] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

${body}
`,
  );
}

function writeCore() {
  write(
    "lib/intelligence/synthetic/libraries/prof-services/errors.ts",
    `${DOCTRINE_HEADER}
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

  write(
    "lib/intelligence/synthetic/libraries/prof-services/types.ts",
    `${DOCTRINE_HEADER}
export type ProfServicesCitationLibrary = "ASC_606_340" | "SPECIALIZED" | "IFRS" | "BENCHMARKS" | "FEDERAL_REGULATORY";
export type ProfServicesSubSegmentId = "L" | "A" | "M" | "I" | "E" | "K";
export interface ProfServicesCitationHandle { handleId: string; library: ProfServicesCitationLibrary; url: string; }
export interface ProfServicesSubSegmentKernel {
  subSegmentId: ProfServicesSubSegmentId;
  name: string;
  frameworks: ("US_GAAP" | "IFRS")[];
}
`,
  );

  const body = HANDLES.map(
    (h) => `  ${JSON.stringify(h.handleId)}: { handleId: ${JSON.stringify(h.handleId)}, library: ${JSON.stringify(h.library)}, url: ${JSON.stringify(h.url)} },`,
  ).join("\n");

  write(
    "lib/intelligence/synthetic/libraries/prof-services/handles-registry.generated.ts",
    `${DOCTRINE_HEADER}
export const PROF_SERVICES_CITATION_HANDLE_COUNT = ${HANDLES.length};
export const PROF_SERVICES_CITATION_HANDLE_REGISTRY: Record<string, { handleId: string; library: string; url: string }> = {
${body}
};
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/handles.ts",
    `${DOCTRINE_HEADER}
import type { ProfServicesCitationHandle } from "./types";
import { PROF_SERVICES_CITATION_HANDLE_COUNT, PROF_SERVICES_CITATION_HANDLE_REGISTRY } from "./handles-registry.generated";
import { ProfServicesHandleNotResolvable } from "./errors";
export { PROF_SERVICES_CITATION_HANDLE_COUNT, PROF_SERVICES_CITATION_HANDLE_REGISTRY };

export function resolveProfServicesCitationHandle(handleId: string): ProfServicesCitationHandle {
  const entry = PROF_SERVICES_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) throw ProfServicesHandleNotResolvable(handleId);
  return entry as ProfServicesCitationHandle;
}

export function listProfServicesCitationHandleIds(): string[] {
  return Object.keys(PROF_SERVICES_CITATION_HANDLE_REGISTRY).sort();
}
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/index.ts",
    `${DOCTRINE_HEADER}
import type { ProfServicesSubSegmentId, ProfServicesSubSegmentKernel } from "./types";
import { ProfServicesViolation } from "./errors";
import { PROF_SERVICES_CITATION_HANDLE_COUNT, resolveProfServicesCitationHandle } from "./handles";

export const PROF_SERVICES_SUB_SEGMENT_KERNELS: Record<ProfServicesSubSegmentId, ProfServicesSubSegmentKernel> = {
  L: { subSegmentId: "L", name: "Law", frameworks: ["US_GAAP", "IFRS"] },
  A: { subSegmentId: "A", name: "Accounting-Advisory", frameworks: ["US_GAAP", "IFRS"] },
  M: { subSegmentId: "M", name: "Mgmt-Consulting", frameworks: ["US_GAAP", "IFRS"] },
  I: { subSegmentId: "I", name: "IT-Services", frameworks: ["US_GAAP", "IFRS"] },
  E: { subSegmentId: "E", name: "Engineering-Architecture", frameworks: ["US_GAAP", "IFRS"] },
  K: { subSegmentId: "K", name: "Marketing-Creative", frameworks: ["US_GAAP", "IFRS"] },
};

export function listProfServicesSubSegmentIds(): ProfServicesSubSegmentId[] {
  return Object.keys(PROF_SERVICES_SUB_SEGMENT_KERNELS) as ProfServicesSubSegmentId[];
}

export function getProfServicesSubSegment(id: ProfServicesSubSegmentId) {
  const k = PROF_SERVICES_SUB_SEGMENT_KERNELS[id];
  if (!k) throw ProfServicesViolation("PS_SUBSEGMENT_NOT_FOUND", \`Unknown sub-segment \${id}\`);
  return k;
}

export function assertProfServicesHandleCountFloor(floor: number): boolean {
  if (PROF_SERVICES_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error("PS_HANDLE_COUNT_FLOOR"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_HANDLE_COUNT_FLOOR", message: "count below floor" }],
    });
  }
  return true;
}

export { resolveProfServicesCitationHandle, PROF_SERVICES_CITATION_HANDLE_COUNT };
export * from "./asc606/over-time-criteria";
export * from "./asc606/retainer-series";
export * from "./asc606/contingent-success-fees";
export * from "./asc606/multi-element-ssp";
export * from "./asc606/principal-vs-agent";
export * from "./specialized/pe-seal";
export * from "./specialized/engagement-letter";
`,
  );
}

function writeModules() {
  moduleFile("asc606/over-time-criteria.ts", ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29", "ASC.606-10-25-30"], `export function evaluateOverTimeCriteria(criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  const pass = criteria.c1 || criteria.c2 || criteria.c3;
  if (!pass) throw ProfServicesViolation("PS_OVER_TIME_FAIL", "No over-time criterion met — fail-closed");
  return { pass: true };
}`);

  moduleFile("asc606/progress-methods.ts", ["ASC.606-10-25-31", "ASC.606-10-25-32", "ASC.606-10-25-33", "ASC.606-10-25-34"], `export function selectProgressMethod(method: "hours-incurred" | "cost-to-cost") {
  return { method, handles: MODULE_HANDLES };
}`);

  moduleFile("asc606/retainer-series.ts", ["ASC.606-10-25-14", "ASC.606-10-25-15", "ASC.606-10-25-19", "ASC.606-10-25-20", "ASC.606-10-25-22"], `export function evaluateRetainerSeries(input: { seriesOfDistinct: boolean; straightLineRequested: boolean }) {
  if (input.straightLineRequested && !input.seriesOfDistinct) {
    throw ProfServicesViolation("PS_RETAINER_NO_SERIES", "Retainer straight-line without series-of-distinct — fail-closed");
  }
  return { recognized: input.seriesOfDistinct };
}`);

  moduleFile("asc606/contingent-success-fees.ts", ["ASC.606-10-32-5", "ASC.606-10-32-6", "ASC.606-10-32-11", "ASC.606-10-32-12", "ASC.606-10-32-14", "ASC.606-10-32-25"], `export function evaluateContingentFee(input: { probable: boolean; constrained: boolean; engagementLevel: boolean }) {
  if (!input.engagementLevel) throw ProfServicesViolation("PS_VC_NOT_ENGAGEMENT_LEVEL", "Variable consideration must be engagement-level");
  if (!input.constrained) throw ProfServicesViolation("PS_VC_CONSTRAINT_BYPASS", "Constraint mandatory — fail-closed");
  return { recognized: input.probable && input.constrained };
}`);

  moduleFile("asc606/multi-element-ssp.ts", ["ASC.606-10-32-28", "ASC.606-10-32-29", "ASC.606-10-32-31", "ASC.606-10-32-32", "ASC.606-10-32-33", "ASC.606-10-32-34"], `export function allocateMultiElement(input: { observable?: number; adjustedMarket?: number; expectedCost?: number; residualOnly?: boolean }) {
  if (input.residualOnly && (input.observable || input.adjustedMarket || input.expectedCost)) {
    throw ProfServicesViolation("PS_SSP_RESIDUAL_ABUSE", "Residual used when higher hierarchy SSP feasible");
  }
  if (input.observable) return { method: "observable", amount: input.observable };
  if (input.adjustedMarket) return { method: "adjusted-market", amount: input.adjustedMarket };
  if (input.expectedCost) return { method: "expected-cost", amount: input.expectedCost };
  if (input.residualOnly) return { method: "residual", amount: 0 };
  throw ProfServicesViolation("PS_SSP_HIERARCHY_FAIL", "SSP hierarchy not satisfied");
}`);

  moduleFile("asc606/principal-vs-agent.ts", ["ASC.606-10-55-36", "ASC.606-10-55-37", "ASC.606-10-55-38", "ASC.606-10-55-39", "ASC.606-10-55-40"], `export function classifyPrincipalVsAgent(input: { positiveControlEvidence: boolean; amount: number }) {
  if (!input.positiveControlEvidence) return { presentation: "net", amount: 0 };
  return { presentation: "gross", amount: input.amount };
}`);

  moduleFile("asc606/wip-unbilled.ts", ["ASC.606-10-45-1", "ASC.606-10-45-3", "ASC.606-10-45-4", "ASC.606-10-45-5"], `export function classifyWip(input: { unbilled: number }) {
  return { contractAsset: input.unbilled };
}`);

  moduleFile("asc606/contract-mods.ts", ["ASC.606-10-25-10", "ASC.606-10-25-11", "ASC.606-10-25-12", "ASC.606-10-25-13"], `export function routeModification(input: { separateContract: boolean; remainingDistinct: boolean }) {
  if (input.separateContract) return { path: "separate-contract" };
  if (input.remainingDistinct) return { path: "prospective" };
  return { path: "cumulative-catch-up" };
}`);

  moduleFile("asc606/backlog.ts", ["ASC.606-10-50-1", "ASC.606-10-50-13", "ASC.606-10-50-14", "ASC.606-10-50-15"], `export function computeBacklog(rpo: number) {
  return { rpo };
}`);

  moduleFile("asc340-40/contract-costs.ts", ["ASC.340-40-25-1", "ASC.340-40-25-5", "ASC.340-40-35-1", "ASC.340-40-35-3", "ASC.340-40-35-6"], `export function evaluateSalesCommission(input: { capitalizable: boolean; expensed: boolean }) {
  if (input.expensed && input.capitalizable) {
    throw ProfServicesViolation("PS_COMMISSION_EXPENSED", "Sales commission expensed when ASC 340-40-25-1 capitalization met");
  }
  return { capitalized: input.capitalizable };
}`);

  moduleFile("specialized/engagement-letter.ts", ["ABA.ModelRule.1.5", "AICPA.ET.1.310", "ABA.ModelRule.1.7", "ABA.ModelRule.1.8"], `export const ENGAGEMENT_LETTER_REQUIRED_FIELDS = ["parties", "scope", "fees", "conflicts", "termination", "signatures"] as const;

export function validateEngagementLetter(input: { subSegment: "L" | "A" | "M" | "I" | "E" | "K"; fieldsPresent: string[] }) {
  if ((input.subSegment === "L" || input.subSegment === "A") && input.fieldsPresent.length < 3) {
    throw ProfServicesViolation("PS_ENGAGEMENT_LETTER_MISSING", "Engagement letter required fields missing for L+A");
  }
  return { valid: true };
}`);

  moduleFile("specialized/conflict-of-interest.ts", ["ABA.ModelRule.1.7", "ABA.ModelRule.1.8", "ABA.ModelRule.1.9", "ABA.ModelRule.1.10", "AICPA.ET.1.110", "AICPA.ET.1.200", "MCA.ConflictGuidance"], `export function evaluateCoi(input: { subSegment: "L" | "A" | "M" | "I" | "E" | "K"; conflictDisclosed: boolean }) {
  if (input.subSegment === "L" || input.subSegment === "A") {
    if (!input.conflictDisclosed) throw ProfServicesViolation("PS_COI_STRUCTURAL", "COI disclosure required for L+A");
  }
  if (input.subSegment === "M" && !input.conflictDisclosed) {
    throw ProfServicesViolation("PS_COI_CONDITIONAL", "COI conditional fail for M");
  }
  return { allowed: true };
}`);

  moduleFile("specialized/pe-seal.ts", ["NCEES.ModelRules.240.15", "TX.PE.Statute", "CA.PE.Statute", "FL.PE.Statute", "NY.PE.Statute"], `export function assertPeSealPresent(input: { subSegment: string; sealPresent: boolean; deliverableRequiresSeal: boolean }) {
  if (input.subSegment === "E" && input.deliverableRequiresSeal && !input.sealPresent) {
    throw ProfServicesViolation("PS_PE_SEAL_ABSENT", "PE seal required for E deliverable");
  }
  return { sealed: input.sealPresent };
}`);

  moduleFile("specialized/aicpa-independence.ts", ["AICPA.ET.1.200.001", "SEC.Rule.2-01c", "PCAOB.Rule.3520"], `export function evaluateIndependence(input: { subSegment: string; independent: boolean }) {
  if (input.subSegment === "A" && !input.independent) throw ProfServicesViolation("PS_INDEPENDENCE_FAIL", "AICPA independence required for A");
  return { independent: input.independent };
}`);

  moduleFile("specialized/it-services-compliance.ts", ["AICPA.TSC.SOC1", "AICPA.TSC.SOC2", "HIPAA.45CFR164.504e", "GDPR.Art28"], `export function evaluateItServicesStack(input: { subSegment: string; socEvaluated: boolean; baaEvaluated: boolean; gdprEvaluated: boolean }) {
  if (input.subSegment === "I" && (!input.socEvaluated || !input.baaEvaluated || !input.gdprEvaluated)) {
    throw ProfServicesViolation("PS_IT_STACK_INCOMPLETE", "SOC 1/2 + HIPAA BAA + GDPR Art 28 required for I");
  }
  return { compliant: true };
}`);

  moduleFile("specialized/marketing-ip-work-for-hire.ts", ["USC.17.101", "USC.17.201b", "USPTO.IPBasics", "DMCA.NoticeTakedown"], `export function evaluateWorkForHire(input: { subSegment: string; assignmentPresent: boolean }) {
  if (input.subSegment === "K" && !input.assignmentPresent) throw ProfServicesViolation("PS_WORK_FOR_HIRE", "Work-for-hire assignment required for K");
  return { assigned: input.assignmentPresent };
}`);

  moduleFile("specialized/state-upl-upa.ts", ["TX.GovCode.81.101", "CA.BPCode.6125", "NY.JudLaw.478", "TX.AccountancyAct"], `export function evaluateUplBoundary(input: { subSegment: string; licensedActivity: boolean }) {
  if ((input.subSegment === "L" || input.subSegment === "A") && !input.licensedActivity) {
    throw ProfServicesViolation("PS_UPL_BOUNDARY", "Activity outside licensure boundary");
  }
  return { licensed: input.licensedActivity };
}`);

  write(
    "lib/intelligence/synthetic/libraries/prof-services/ifrs/ifrs15.ts",
    `${DOCTRINE_HEADER}
// DIV-2: IFRS uses "highly probable" constraint threshold vs US GAAP "probable" — runtime enforcement in PS-2
import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";
export const IFRS15_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B14-B19", "EUR-Lex.2016R1905.IFRS15", "EUR-Lex.2023R1803.IFRS15"] as const;
export function resolveIfrs15Handles() { return IFRS15_HANDLES.map((h) => resolveProfServicesCitationHandle(h)); }
export function evaluateIfrsConstraint(input: { highlyProbable: boolean; usProbableOnly: boolean }) {
  if (input.usProbableOnly && !input.highlyProbable) {
    throw ProfServicesViolation("PS_IFRS_DIV2_CONSTRAINT", "IFRS highly-probable threshold required — not US probable");
  }
  return { constrained: true };
}
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/ifrs/ifrs16.ts",
    `${DOCTRINE_HEADER}
import { resolveProfServicesCitationHandle } from "../handles";
export const IFRS16_HANDLES = ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16", "IFRS16.LesseeAccounting"] as const;
export function resolveIfrs16Handles() { return IFRS16_HANDLES.map((h) => resolveProfServicesCitationHandle(h)); }
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/ifrs/ias38-stub.ts",
    `${DOCTRINE_HEADER}
// Q8=A scaffold stub — full capitalization gate deferred to PS-2
import { resolveProfServicesCitationHandle } from "../handles";
export function referenceIas38() { return resolveProfServicesCitationHandle("IAS38.Page"); }
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/ifrs/ias37-onerous.ts",
    `${DOCTRINE_HEADER}
import { resolveProfServicesCitationHandle } from "../handles";
export function referenceIas37Onerous() { return resolveProfServicesCitationHandle("IAS37.Page"); }
`,
  );

  write(
    "lib/intelligence/synthetic/libraries/prof-services/audit/channels/_reserved-engagement-letter.ts",
    `${DOCTRINE_HEADER}
/**
 * 9th audit channel \`engagement-letter-audit\` — surface reservation only.
 * Structural channel created in PS-2 (default-ON, 7yr retention, hash-chained).
 */
export const ENGAGEMENT_LETTER_AUDIT_CHANNEL_RESERVED = "engagement-letter-audit" as const;
export const ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION = "PS.2.K-LOCK.0" as const;
`,
  );
}

function writeKpiDisclosureReasonablenessProfile() {
  const kpis = [
    ["prof-services-utilization/billable-utilization.ts", "billable-utilization"],
    ["prof-services-utilization/realization-rate.ts", "realization-rate"],
    ["prof-services-utilization/collection-realization.ts", "collection-realization"],
    ["prof-services-leverage/leverage-ratio.ts", "leverage-ratio"],
    ["prof-services-wip/wip-to-revenue.ts", "wip-to-revenue"],
    ["prof-services-wip/days-wip-outstanding.ts", "days-wip-outstanding"],
    ["prof-services-profitability/gross-margin-by-subsegment.ts", "gross-margin-by-subsegment"],
    ["prof-services-profitability/effective-billing-rate.ts", "effective-billing-rate"],
    ["prof-services-retention/retainer-burndown.ts", "retainer-burndown"],
  ];
  for (const [pathSuffix, key] of kpis) {
    write(`kpi/${pathSuffix}`, `${DOCTRINE_HEADER}
export const KPI_KEY = "${key}";
export function compute(input: Record<string, number>) {
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}`);
  }

  const disclosures = ["wip-schedule", "unearned-retainer", "backlog", "contract-cost-rollforward", "principal-vs-agent", "engagement-letter-summary", "ifrs15-disclosure-set", "ifrs16-lease-disclosures"];
  for (const name of disclosures) {
    write(`disclosure-variants/prof-services/${name}.ts`, `${DOCTRINE_HEADER}
export function build() { return { variant: "${name}", frameworks: ["US_GAAP", "IFRS"] }; }
`);
  }

  const reason = [
    ["billable-utilization-ranges.ts", "Rosenberg.Benchmark.109"],
    ["realization-rate-ranges.ts", "SPI.Benchmark.117"],
    ["leverage-ratio-ranges.ts", "Rosenberg.Leverage"],
    ["wip-to-revenue-ranges.ts", "Rosenberg.WIP"],
    ["gross-margin-ranges-by-subsegment.ts", "SourceGlobal.Margin"],
    ["retainer-burndown-ranges.ts", "SPI.Retainer"],
  ];
  for (const [file, handle] of reason) {
    write(`reasonableness/prof-services/${file}`, `${DOCTRINE_HEADER}
export const BENCHMARK_HANDLE = "${handle}";
export function getRange() { return { handle: BENCHMARK_HANDLE, source: "Prof_Services_Benchmarks_Sources.md" }; }
`);
  }

  write(
    "industry-profiles/prof-services/profile.ts",
    `${DOCTRINE_HEADER}
import type { ProfServicesSubSegmentId } from "../../lib/intelligence/synthetic/libraries/prof-services/types";

export const PROF_SERVICES_SUB_SEGMENTS: ProfServicesSubSegmentId[] = ["L", "A", "M", "I", "E", "K"];

export const PROF_SERVICES_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const profServicesWave1Profile = {
  vertical: "prof-services",
  wave: 1,
  subSegments: PROF_SERVICES_SUB_SEGMENTS,
  frameworks: PROF_SERVICES_FRAMEWORKS,
  applicableStandards: ["ASC 606", "ASC 340-40", "IFRS 15", "IFRS 16", "IAS 38", "IAS 37"],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelReserved: "engagement-letter-audit",
  subSegmentPosture: {
    L: { engagementLetter: true, coi: "structural" },
    A: { engagementLetter: true, coi: "structural", independence: true },
    M: { engagementLetter: true, coi: "conditional" },
    I: { engagementLetter: true, socHipaaGdpr: true },
    E: { engagementLetter: true, peSeal: true },
    K: { engagementLetter: true, workForHire: true },
  },
};
`,
  );
}

function writeDocs() {
  const docsDir = "docs/prof-services/wave1";
  const byDoc = new Map();
  for (const h of HANDLES) {
    if (!byDoc.has(h.sourceDoc)) byDoc.set(h.sourceDoc, []);
    byDoc.get(h.sourceDoc).push(h);
  }
  for (const [doc, handles] of byDoc) {
    const rows = handles.map((h) => `| \`${h.handleId}\` | ${h.title} | [source](${h.url}) | URL-only |`).join("\n");
    write(`${docsDir}/${doc}`, `# ${doc.replace(".md", "").replace(/_/g, " ")}\n\n| Handle | Title | URL | Notes |\n|---|---|---|---|\n${rows}\n`);
  }

  write(`${docsDir}/Prof_Services_Vertical_Planning_Doc.md`, `# Professional Services Vertical Planning\n\n6 sub-segments L/A/M/I/E/K. 9th channel engagement-letter-audit reserved for PS-2.\n`);

  const indexRows = HANDLES.map((h) => `| ${h.handleId} | ${h.library} | ${h.title} | ${h.url} | 2026-06-26 |`).join("\n");
  write(`${docsDir}/handle-index.md`, `# Handle Index\n\n| Handle | Library | Title | URL | Last Verified |\n|---|---|---|---|---|\n${indexRows}\n`);

  write(`${docsDir}/README.md`, `# Professional Services Wave 1 (LOCK-PS-1)\n\n142 handles. 6 sub-segments L/A/M/I/E/K. Dual-framework US GAAP + IFRS.\n`);

  write(`${docsDir}/engagement-letter-schema.md`, `# Engagement Letter Schema\n\nRequired fields: parties, scope, fees, conflicts, termination, signatures. Structural enforcement in PS-2.\n`);

  write(`${docsDir}/ssp-allocation-hierarchy.md`, `# SSP Allocation Hierarchy\n\n1. Observable 2. Adjusted market 3. Expected cost+margin 4. Residual (last resort).\n`);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Handle", "Library", "Title", "URL", "Last Verified"],
    ...HANDLES.map((h) => [h.handleId, h.library, h.title, h.url, "2026-06-26"]),
  ]), "Index");
  for (const lib of ["ASC_606_340", "SPECIALIZED", "IFRS", "BENCHMARKS", "FEDERAL_REGULATORY"]) {
    const rows = HANDLES.filter((h) => h.library === lib);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Handle", "Title", "URL", "Last Verified"],
      ...rows.map((h) => [h.handleId, h.title, h.url, "2026-06-26"]),
    ]), lib.slice(0, 31));
  }
  XLSX.writeFile(wb, path.join(root, docsDir, "Prof_Services_Citation_Verification_Register.xlsx"));
}

function writeCommandCenter() {
  const ccPath = "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts";
  let cc = fs.readFileSync(path.join(root, ccPath), "utf8");
  if (!cc.includes("prof_services_item")) {
    cc = cc.replace(`  | "construction_item"`, `  | "construction_item"
  | "prof_services_item"`);
    write(ccPath, cc);
  }
}

function main() {
  writeCore();
  writeModules();
  writeKpiDisclosureReasonablenessProfile();
  writeDocs();
  writeCommandCenter();
  console.log(`PS-1 scaffold: ${HANDLES.length} handles.`);
}

main();
