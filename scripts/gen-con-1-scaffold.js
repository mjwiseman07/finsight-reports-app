/**
 * Phase CON-1 — Construction Wave 1 scaffold generator.
 * Creates libraries, kpi, disclosure-variants, reasonableness, profile, and docs.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");

const DOCTRINE_HEADER = `/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
`;

const ASC606_BASE = "https://asc.fasb.org/xbrl/2024/elts/ref?DocPart=Section&Section=";

function asc606(section) {
  return `${ASC606_BASE}606-10-${section}`;
}

function asc340(section) {
  return `${ASC606_BASE}340-40-${section}`;
}

function asc842(section) {
  return `${ASC606_BASE}842-${section}`;
}

function asc460(section) {
  return `${ASC606_BASE}460-10-${section}`;
}

function asc810(section) {
  return `${ASC606_BASE}810-${section}`;
}

function asc323(section) {
  return `${ASC606_BASE}323-10-${section}`;
}

function asc360(section) {
  return `${ASC606_BASE}360-10-${section}`;
}

/** @type {Array<{handleId:string,library:string,title:string,url:string,sourceDoc:string}>} */
const HANDLES = [
  // ASC 606 + 340-40 (43)
  { handleId: "ASC.606-10-25-1", library: "ASC_606_340", title: "Identify the Contract", url: asc606("25-1"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-2", library: "ASC_606_340", title: "Contract Combination", url: asc606("25-2"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-3", library: "ASC_606_340", title: "Contract Modifications", url: asc606("25-3"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-10", library: "ASC_606_340", title: "Modification — Separate Contract", url: asc606("25-10"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-11", library: "ASC_606_340", title: "Modification — Termination", url: asc606("25-11"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-12", library: "ASC_606_340", title: "Modification — Cumulative Catch-Up", url: asc606("25-12"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-13", library: "ASC_606_340", title: "Modification — Prospective", url: asc606("25-13"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-18", library: "ASC_606_340", title: "Nonrefundable Upfront Fees", url: asc606("25-18"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-19", library: "ASC_606_340", title: "Significant Financing Component", url: asc606("25-19"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-22", library: "ASC_606_340", title: "Noncash Consideration", url: asc606("25-22"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-23B", library: "ASC_606_340", title: "Uninstalled Materials", url: asc606("25-23B"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-24", library: "ASC_606_340", title: "Warranty — Assurance vs Service", url: asc606("25-24"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-27", library: "ASC_606_340", title: "Over-Time Criterion 1", url: asc606("25-27"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-28", library: "ASC_606_340", title: "Over-Time Criterion 2", url: asc606("25-28"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-29", library: "ASC_606_340", title: "Over-Time Criterion 3", url: asc606("25-29"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-30", library: "ASC_606_340", title: "Over-Time — Alternative", url: asc606("25-30"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-31", library: "ASC_606_340", title: "Progress — Output Methods", url: asc606("25-31"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-32", library: "ASC_606_340", title: "Progress — Input Methods", url: asc606("25-32"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-33", library: "ASC_606_340", title: "Progress — Cost-to-Cost", url: asc606("25-33"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-34", library: "ASC_606_340", title: "Progress — Efforts Expended", url: asc606("25-34"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-35", library: "ASC_606_340", title: "Uninstalled Materials Exclusion", url: asc606("25-35"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-36", library: "ASC_606_340", title: "Bill-and-Hold", url: asc606("25-36"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-25-37", library: "ASC_606_340", title: "Customer Acceptance", url: asc606("25-37"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-5", library: "ASC_606_340", title: "Variable Consideration — Estimate", url: asc606("32-5"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-6", library: "ASC_606_340", title: "Variable Consideration — Constraint", url: asc606("32-6"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-11", library: "ASC_606_340", title: "Variable Consideration — Change", url: asc606("32-11"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-12", library: "ASC_606_340", title: "Variable Consideration — Reassessment", url: asc606("32-12"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-14", library: "ASC_606_340", title: "Variable Consideration — Disclosure", url: asc606("32-14"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-32-25", library: "ASC_606_340", title: "Variable Consideration — Refund Liability", url: asc606("32-25"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-45-1", library: "ASC_606_340", title: "Contract Balances — Presentation", url: asc606("45-1"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-45-3", library: "ASC_606_340", title: "Contract Balances — Impairment", url: asc606("45-3"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-45-4", library: "ASC_606_340", title: "Contract Balances — Receivable", url: asc606("45-4"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-45-5", library: "ASC_606_340", title: "Retention — Asset vs Receivable", url: asc606("45-5"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-50-1", library: "ASC_606_340", title: "Backlog — Disclosure", url: asc606("50-1"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-50-13", library: "ASC_606_340", title: "Backlog — Remaining Performance", url: asc606("50-13"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-50-14", library: "ASC_606_340", title: "Backlog — Transaction Price", url: asc606("50-14"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-50-15", library: "ASC_606_340", title: "Backlog — Allocation", url: asc606("50-15"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-55-39", library: "ASC_606_340", title: "Implementation — WIP Example", url: asc606("55-39"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.606-10-55-40", library: "ASC_606_340", title: "Implementation — Change Order", url: asc606("55-40"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.340-40-25-1", library: "ASC_606_340", title: "Contract Costs — Capitalization", url: asc340("25-1"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.340-40-25-5", library: "ASC_606_340", title: "Contract Costs — Fulfillment", url: asc340("25-5"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.340-40-35-1", library: "ASC_606_340", title: "Contract Costs — Amortization", url: asc340("35-1"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.340-40-35-3", library: "ASC_606_340", title: "Contract Costs — Impairment", url: asc340("35-3"), sourceDoc: "Construction_ASC606_Sources.md" },
  { handleId: "ASC.340-40-35-6", library: "ASC_606_340", title: "Contract Costs — Practical Expedient", url: asc340("35-6"), sourceDoc: "Construction_ASC606_Sources.md" },
  // ASC 842 (10)
  { handleId: "ASC.842-10-15-3", library: "ASC_842", title: "Lease Scope", url: asc842("15-3"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-10-15-9", library: "ASC_842", title: "Lease Identification", url: asc842("15-9"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-10-15-26", library: "ASC_842", title: "Lease Term", url: asc842("15-26"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-10-15-28", library: "ASC_842", title: "Lease Payments", url: asc842("15-28"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-10-20", library: "ASC_842", title: "Short-Term Exception", url: asc842("20"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-10-25-1", library: "ASC_842", title: "Lease Recognition", url: asc842("25-1"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-20-25-1", library: "ASC_842", title: "Lessee — ROU Asset", url: asc842("20-25-1"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-20-25-2", library: "ASC_842", title: "Lessee — Lease Liability", url: asc842("20-25-2"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-20-25-6", library: "ASC_842", title: "Lessee — Amortization", url: asc842("20-25-6"), sourceDoc: "Construction_ASC842_Sources.md" },
  { handleId: "ASC.842-30-25-1", library: "ASC_842", title: "Lessor — Classification", url: asc842("30-25-1"), sourceDoc: "Construction_ASC842_Sources.md" },
  // Specialized (35)
  { handleId: "ASC.460-10-25-1", library: "SPECIALIZED", title: "Guarantee — Recognition", url: asc460("25-1"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.460-10-25-2", library: "SPECIALIZED", title: "Guarantee — Initial Measurement", url: asc460("25-2"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.460-10-50-4", library: "SPECIALIZED", title: "Guarantee — Disclosure", url: asc460("50-4"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.460-10-50-8", library: "SPECIALIZED", title: "Guarantee — Rollforward", url: asc460("50-8"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.810-10-15-14", library: "SPECIALIZED", title: "JV — Scope", url: asc810("15-14"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.810-10-25-8", library: "SPECIALIZED", title: "JV — Initial Measurement", url: asc810("25-8"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.810-10-25-38", library: "SPECIALIZED", title: "JV — Equity Method", url: asc810("25-38"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.810-30-45-1", library: "SPECIALIZED", title: "Proportionate Consolidation Exception", url: asc810("30-45-1"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.323-10-25-1", library: "SPECIALIZED", title: "Equity Method — Recognition", url: asc323("25-1"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.323-10-35-4", library: "SPECIALIZED", title: "Equity Method — Loss Recognition", url: asc323("35-4"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.360-10-35-17", library: "SPECIALIZED", title: "CIP — Held for Sale", url: asc360("35-17"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.360-10-35-20", library: "SPECIALIZED", title: "CIP — Recoverability Test", url: asc360("35-20"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.360-10-35-21", library: "SPECIALIZED", title: "CIP — Impairment Indicators", url: asc360("35-21"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.360-10-35-22", library: "SPECIALIZED", title: "CIP — Measurement", url: asc360("35-22"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "ASC.360-10-35-37", library: "SPECIALIZED", title: "CIP — Disclosure", url: asc360("35-37"), sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "AICPA.AAG-CON", library: "SPECIALIZED", title: "AICPA Audit Guide — Construction", url: "https://www.aicpa-cima.com/resources/download/audit-and-accounting-guide-construction-contractors", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "AICPA.RevRec.EngrConst", library: "SPECIALIZED", title: "AICPA Revenue Recognition — Engineering/Construction", url: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-accounting-guides", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "AIA.G702-1992", library: "SPECIALIZED", title: "AIA G702 Application for Payment", url: "https://www.aia.org/resources/6070380-application-and-certificate-for-payment-g702", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "AIA.G703", library: "SPECIALIZED", title: "AIA G703 Continuation Sheet", url: "https://www.aia.org/resources/6070381-continuation-sheet-g703", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "CA.CivCode.8800", library: "SPECIALIZED", title: "CA Retention — Private Works", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=8800.&lawCode=CIV", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "TX.PropCode.53.RetentionFund", library: "SPECIALIZED", title: "TX Retention Fund", url: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.53.htm", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "FL.Stat.713.346", library: "SPECIALIZED", title: "FL Retention — Tiered", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0713/0713.html", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "CA.CivCode.8000", library: "SPECIALIZED", title: "CA Mechanics Lien", url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=4.", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "TX.PropCode.Ch53", library: "SPECIALIZED", title: "TX Mechanics Lien", url: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.53.htm", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "FL.Stat.Ch713", library: "SPECIALIZED", title: "FL Construction Lien Law", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0713/0713.html", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "OSHA.29CFR1926", library: "SPECIALIZED", title: "OSHA 1926 Construction (reference only)", url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "SFAA.SuretyBond.WhatIs", library: "SPECIALIZED", title: "SFAA — What Is a Surety Bond", url: "https://www.surety.org/i4a/pages/index.cfm?pageid=3285", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "SFAA.FactSheet", library: "SPECIALIZED", title: "SFAA Fact Sheet", url: "https://www.surety.org/i4a/pages/index.cfm?pageid=3286", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "NASBP.HowToObtain", library: "SPECIALIZED", title: "NASBP — How to Obtain Bonding", url: "https://www.nasbp.org/how-to-obtain-bonding", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "NASBP.Deskbook", library: "SPECIALIZED", title: "NASBP Contract Surety Deskbook", url: "https://www.nasbp.org/contract-surety-deskbook", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "NASBP.BondingResources", library: "SPECIALIZED", title: "NASBP Bonding Resources", url: "https://www.nasbp.org/bonding-resources", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "USC.31.Ch39.3901", library: "SPECIALIZED", title: "Prompt Payment Act", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-chapter39&num=0&edition=prelim", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "USC.40.3141", library: "SPECIALIZED", title: "Davis-Bacon Act", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title40-chapter31-subchapterIV&num=0&edition=prelim", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "DOL.WHD.DavisBacon", library: "SPECIALIZED", title: "DOL WHD Davis-Bacon", url: "https://www.dol.gov/agencies/whd/government-contracts/construction", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "USC.41.8301", library: "SPECIALIZED", title: "Buy American Act", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title41-chapter83&num=0&edition=prelim", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "GovInfo.BABAA", library: "SPECIALIZED", title: "BABA / IIJA Buy America", url: "https://www.govinfo.gov/app/details/PLAW-117publ58", sourceDoc: "Construction_Specialized_Sources.md" },
  { handleId: "IFRS15.Page", library: "IFRS", title: "IFRS 15 Overview", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "IFRS15.Para35-37", library: "IFRS", title: "IFRS 15 Over-Time Criteria", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "IFRS15.B14-B19", library: "IFRS", title: "IFRS 15 Implementation — Construction", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "EUR-Lex.2016R1905.IFRS15", library: "IFRS", title: "EU IFRS 15 Adoption", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R1905", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "EUR-Lex.2023R1803.IFRS15", library: "IFRS", title: "EU IFRS 15 Amendment", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1803", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "IFRS16.Page", library: "IFRS", title: "IFRS 16 Leases", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "EUR-Lex.2017R1986.IFRS16", library: "IFRS", title: "EU IFRS 16 Adoption", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1986", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "IAS11.Superseded", library: "IFRS", title: "IAS 11 (Superseded by IFRS 15)", url: "https://www.ifrs.org/issued-standards/list-of-standards/ias-11-construction-contracts/", sourceDoc: "Construction_IFRS_Sources.md" },
  { handleId: "IFRIC12.Page", library: "IFRS", title: "IFRIC 12 Service Concession", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifric-12-service-concession-arrangements/", sourceDoc: "Construction_IFRS_Sources.md" },
  // Benchmarks (6)
  { handleId: "CFMA.Benchmarker", library: "BENCHMARKS", title: "CFMA Financial Benchmarker", url: "https://www.cfma.org/benchmarker", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "AGC.DataDigest", library: "BENCHMARKS", title: "AGC Data Digest", url: "https://www.agc.org/learn/construction-data", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "Census.Construction", library: "BENCHMARKS", title: "Census Construction Spending", url: "https://www.census.gov/construction/c30/c30index.html", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "BLS.PPI.Construction", library: "BENCHMARKS", title: "BLS PPI Construction", url: "https://www.bls.gov/ppi/sector/naics-sector-23.htm", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "NASBP.ThreeCs", library: "BENCHMARKS", title: "NASBP Three C's Bonding", url: "https://www.nasbp.org/three-cs", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "CFMA.WIP.Turnover", library: "BENCHMARKS", title: "CFMA WIP Turnover Benchmark", url: "https://www.cfma.org/benchmarker", sourceDoc: "Construction_Benchmarks_Sources.md" },
  // Federal Statutes (6) — also in benchmarks doc §9
  { handleId: "USC.40.3131", library: "FEDERAL_STATUTES", title: "Miller Act", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title40-chapter3&num=0&edition=prelim", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "USC.40.3131.Detail", library: "FEDERAL_STATUTES", title: "Miller Act — Payment Bond Detail", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title40-section3131&num=0&edition=prelim", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "TX.GovCode.2253", library: "FEDERAL_STATUTES", title: "TX Little Miller Act", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.2253.htm", sourceDoc: "Construction_Benchmarks_Sources.md" },
  { handleId: "NY.StateFinanceLaw.137", library: "FEDERAL_STATUTES", title: "NY Little Miller Act", url: "https://www.nysenate.gov/legislation/laws/STF/137", sourceDoc: "Construction_Benchmarks_Sources.md" },
];

if (HANDLES.length !== 109) {
  throw new Error(`Expected 109 handles, got ${HANDLES.length}`);
}

const SUB_SEGMENTS = {
  G: { id: "G", name: "General Contractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  S: { id: "S", name: "Subcontractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  R: { id: "R", name: "Residential", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: false },
  C: { id: "C", name: "Commercial / Industrial", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  H: { id: "H", name: "Heavy Civil / Infrastructure", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  D: { id: "D", name: "Specialty Design-Build", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
};

function writeFile(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
}

function moduleFile(relativePath, handleIds, exports) {
  const handleList = handleIds.map((h) => `"${h}"`).join(", ");
  writeFile(
    relativePath,
    `${DOCTRINE_HEADER}
import { resolveConstructionCitationHandle } from "../handles";
import { ConstructionViolation } from "../errors";

export const MODULE_HANDLES = [${handleList}] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

${exports}
`,
  );
}

function writeErrors() {
  writeFile(
    "lib/intelligence/synthetic/libraries/construction/errors.ts",
    `${DOCTRINE_HEADER}
export interface ConstructionViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(name: string, code: string, message: string): ConstructionViolationError {
  const err = new Error(message) as ConstructionViolationError;
  err.name = name;
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function ConstructionViolation(code: string, message: string): ConstructionViolationError {
  return createViolation("ConstructionViolation", code, message);
}

export function ConstructionHandleNotResolvable(handleId: string): ConstructionViolationError {
  return createViolation(
    "ConstructionHandleNotResolvable",
    "CON_HANDLE_NOT_RESOLVABLE",
    \`Citation handle not registered: \${handleId}\`,
  );
}

export function ConstructionSubSegmentNotFound(subSegmentId: string): ConstructionViolationError {
  return createViolation(
    "ConstructionSubSegmentNotFound",
    "CON_SUBSEGMENT_NOT_FOUND",
    \`Unknown construction sub-segment: \${subSegmentId}\`,
  );
}
`,
  );
}

function writeTypes() {
  writeFile(
    "lib/intelligence/synthetic/libraries/construction/types.ts",
    `${DOCTRINE_HEADER}
export type ConstructionCitationLibrary =
  | "ASC_606_340"
  | "ASC_842"
  | "SPECIALIZED"
  | "IFRS"
  | "BENCHMARKS"
  | "FEDERAL_STATUTES";

export interface ConstructionCitationHandle {
  handleId: string;
  library: ConstructionCitationLibrary;
  url: string;
}

export type ConstructionSubSegmentId = "G" | "S" | "R" | "C" | "H" | "D";

export interface ConstructionSubSegmentKernel {
  subSegmentId: ConstructionSubSegmentId;
  name: string;
  frameworks: ("US_GAAP" | "IFRS")[];
  overTimeDefault: boolean;
}
`,
  );
}

function writeHandlesRegistry() {
  const body = HANDLES.map(
    (h) =>
      `  ${JSON.stringify(h.handleId)}: { handleId: ${JSON.stringify(h.handleId)}, library: ${JSON.stringify(h.library)}, url: ${JSON.stringify(h.url)} },`,
  ).join("\n");

  writeFile(
    "lib/intelligence/synthetic/libraries/construction/handles-registry.generated.ts",
    `${DOCTRINE_HEADER}
export const CONSTRUCTION_CITATION_HANDLE_COUNT = ${HANDLES.length};

export const CONSTRUCTION_CITATION_HANDLE_REGISTRY: Record<string, { handleId: string; library: string; url: string }> = {
${body}
};
`,
  );
}

function writeHandles() {
  writeFile(
    "lib/intelligence/synthetic/libraries/construction/handles.ts",
    `${DOCTRINE_HEADER}
import type { ConstructionCitationHandle } from "./types";
import {
  CONSTRUCTION_CITATION_HANDLE_COUNT,
  CONSTRUCTION_CITATION_HANDLE_REGISTRY,
} from "./handles-registry.generated";
import { ConstructionHandleNotResolvable } from "./errors";

export { CONSTRUCTION_CITATION_HANDLE_COUNT, CONSTRUCTION_CITATION_HANDLE_REGISTRY };

export function resolveConstructionCitationHandle(handleId: string): ConstructionCitationHandle {
  const entry = CONSTRUCTION_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) {
    throw ConstructionHandleNotResolvable(handleId);
  }
  if (!entry.url.startsWith("https://") && !entry.url.startsWith("http://")) {
    throw ConstructionHandleNotResolvable(handleId);
  }
  return entry as ConstructionCitationHandle;
}

export function listConstructionCitationHandleIds(): string[] {
  return Object.keys(CONSTRUCTION_CITATION_HANDLE_REGISTRY).sort();
}
`,
  );
}

function writeIndex() {
  writeFile(
    "lib/intelligence/synthetic/libraries/construction/index.ts",
    `${DOCTRINE_HEADER}
import type { ConstructionSubSegmentId, ConstructionSubSegmentKernel } from "./types";
import { ConstructionSubSegmentNotFound } from "./errors";
import { CONSTRUCTION_CITATION_HANDLE_COUNT, resolveConstructionCitationHandle } from "./handles";

export const CONSTRUCTION_SUB_SEGMENT_KERNELS: Record<ConstructionSubSegmentId, ConstructionSubSegmentKernel> = {
  G: { subSegmentId: "G", name: "General Contractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  S: { subSegmentId: "S", name: "Subcontractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  R: { subSegmentId: "R", name: "Residential", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: false },
  C: { subSegmentId: "C", name: "Commercial / Industrial", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  H: { subSegmentId: "H", name: "Heavy Civil / Infrastructure", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  D: { subSegmentId: "D", name: "Specialty Design-Build", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
};

export function listConstructionSubSegmentIds(): ConstructionSubSegmentId[] {
  return Object.keys(CONSTRUCTION_SUB_SEGMENT_KERNELS) as ConstructionSubSegmentId[];
}

export function getConstructionSubSegment(id: ConstructionSubSegmentId): ConstructionSubSegmentKernel {
  const kernel = CONSTRUCTION_SUB_SEGMENT_KERNELS[id];
  if (!kernel) throw ConstructionSubSegmentNotFound(id);
  return kernel;
}

export function assertConstructionHandleCountFloor(floor: number): boolean {
  if (CONSTRUCTION_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error(\`Handle count \${CONSTRUCTION_CITATION_HANDLE_COUNT} < floor \${floor}\`), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_HANDLE_COUNT_FLOOR", message: "Handle count below floor" }],
    });
  }
  return true;
}

export { resolveConstructionCitationHandle, CONSTRUCTION_CITATION_HANDLE_COUNT };
export * from "./asc606/over-time-criteria";
export * from "./asc606/uninstalled-materials";
export * from "./asc606/modifications";
export * from "./asc606/contract-balances";
export * from "./asc810/jv-consolidation";
export * from "./asc360/cip-impairment";
export * from "./asc460/guarantees";
export * from "./asc842/leases";
export * from "./asc340-40/contract-costs";
`,
  );
}

function writeAsc606Modules() {
  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/over-time-criteria.ts",
    ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29", "ASC.606-10-25-30"],
    `export function evaluateOverTimeCriteria(criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  const pass = criteria.c1 || criteria.c2 || criteria.c3;
  if (!pass) {
    throw ConstructionViolation("CON_OVER_TIME_FAIL", "No ASC 606 over-time criterion met — fail-closed");
  }
  return { pass: true, method: "over-time" };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/progress-methods.ts",
    ["ASC.606-10-25-31", "ASC.606-10-25-32", "ASC.606-10-25-33", "ASC.606-10-25-34"],
    `export function selectProgressMethod(preferred: "output" | "input" | "cost-to-cost") {
  return { method: preferred, handles: MODULE_HANDLES };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/uninstalled-materials.ts",
    ["ASC.606-10-25-23B", "ASC.606-10-25-35"],
    `export function evaluateUninstalledMaterialsGate(input: {
  isCustomerOwned: boolean;
  costEqualsSellingPrice: boolean;
  notCustomForContract: boolean;
}) {
  const excluded = input.isCustomerOwned && input.costEqualsSellingPrice && input.notCustomForContract;
  if (excluded) {
    throw ConstructionViolation("CON_UNINSTALLED_EXCLUDED", "Uninstalled materials excluded from POC — 3-condition gate");
  }
  return { includedInPoc: true };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/modifications.ts",
    ["ASC.606-10-25-10", "ASC.606-10-25-11", "ASC.606-10-25-12", "ASC.606-10-25-13"],
    `export function routeModification(input: { separateContract: boolean; remainingDistinct: boolean }) {
  if (input.separateContract) return { path: "separate-contract" };
  if (input.remainingDistinct) return { path: "prospective" };
  return { path: "cumulative-catch-up" };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/variable-consideration.ts",
    ["ASC.606-10-32-5", "ASC.606-10-32-6", "ASC.606-10-32-11", "ASC.606-10-32-12", "ASC.606-10-32-14", "ASC.606-10-32-25"],
    `export function constrainVariableConsideration(estimate: number, constraint: number) {
  return { recognized: Math.min(estimate, constraint) };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/contract-balances.ts",
    ["ASC.606-10-45-1", "ASC.606-10-45-3", "ASC.606-10-45-4", "ASC.606-10-45-5"],
    `export function classifyRetention(input: { unconditionalRight: boolean; retentionPct: number }) {
  if (!input.unconditionalRight && input.retentionPct > 0) {
    return { classification: "contract-asset-retention" };
  }
  if (input.unconditionalRight) {
    return { classification: "receivable" };
  }
  throw ConstructionViolation("CON_RETENTION_UNCLASSIFIED", "Retention cannot be classified — fail-closed");
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc606/backlog.ts",
    ["ASC.606-10-50-1", "ASC.606-10-50-13", "ASC.606-10-50-14", "ASC.606-10-50-15"],
    `export function computeBacklogDisclosure(remainingPerformanceObligation: number) {
  return { rpo: remainingPerformanceObligation };
}`,
  );
}

function writeOtherLibraryModules() {
  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc340-40/contract-costs.ts",
    ["ASC.340-40-25-1", "ASC.340-40-25-5", "ASC.340-40-35-1", "ASC.340-40-35-3", "ASC.340-40-35-6"],
    `export function evaluateAmortizationMatch(capitalized: number, amortized: number, pattern: "straight-line" | "milestone") {
  if (pattern === "milestone" && amortized > capitalized) {
    throw ConstructionViolation("CON_AMORTIZATION_MISMATCH", "Amortization exceeds capitalized contract costs");
  }
  return { allowed: true };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc842/leases.ts",
    ["ASC.842-10-15-3", "ASC.842-10-15-9", "ASC.842-10-15-26", "ASC.842-10-15-28", "ASC.842-10-20", "ASC.842-10-25-1", "ASC.842-20-25-1", "ASC.842-20-25-2", "ASC.842-20-25-6", "ASC.842-30-25-1"],
    `export function evaluateShortTermException(termMonths: number, materialityThreshold: number) {
  if (termMonths <= 12 && materialityThreshold > 500000) {
    throw ConstructionViolation("CON_SHORT_TERM_ABUSE", "Short-term exception applied with material lease — fail-closed");
  }
  return { exempt: termMonths <= 12 };
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc460/guarantees.ts",
    ["ASC.460-10-25-1", "ASC.460-10-25-2", "ASC.460-10-50-4", "ASC.460-10-50-8"],
    `export function evaluateGuaranteeAtInception(fairValue: number | null) {
  if (fairValue === null || fairValue < 0) {
    throw ConstructionViolation("CON_GUARANTEE_INCEPTION", "Guarantee must be measured at inception");
  }
  return { recognized: fairValue };
}`,
  );

  writeFile(
    "lib/intelligence/synthetic/libraries/construction/asc810/jv-consolidation.ts",
    `${DOCTRINE_HEADER}
// ONLY available to unincorporated construction/extractive JVs — structural lockout enforced in CON-2
import { resolveConstructionCitationHandle } from "../handles";
import { ConstructionViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.810-10-15-14", "ASC.810-10-25-8", "ASC.810-10-25-38", "ASC.810-30-45-1", "ASC.323-10-25-1", "ASC.323-10-35-4"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function assertProportionateConsolidationLockout(input: {
  entityType: "incorporated" | "unincorporated";
  method: "equity" | "proportionate";
}) {
  if (input.method === "proportionate" && input.entityType === "incorporated") {
    throw ConstructionViolation(
      "CON_JV_PROPORTIONATE_LOCKOUT",
      "ASC 810-30-45-1 proportionate consolidation ONLY for unincorporated construction/extractive JVs",
    );
  }
  return { allowed: true };
}
`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/asc360/cip-impairment.ts",
    ["ASC.360-10-35-17", "ASC.360-10-35-20", "ASC.360-10-35-21", "ASC.360-10-35-22", "ASC.360-10-35-37"],
    `export function evaluateCipImpairmentDelay(indicatorsPresent: boolean, testDelayed: boolean) {
  if (indicatorsPresent && testDelayed) {
    throw ConstructionViolation("CON_CIP_IMPAIRMENT_DELAY", "CIP impairment test delayed despite indicators");
  }
  return { testRequired: indicatorsPresent };
}`,
  );

  const statuteModules = [
    ["statutes/retention-state-laws.ts", ["CA.CivCode.8800", "TX.PropCode.53.RetentionFund", "FL.Stat.713.346"]],
    ["statutes/mechanics-liens.ts", ["CA.CivCode.8000", "TX.PropCode.Ch53", "FL.Stat.Ch713"]],
    ["statutes/miller-act.ts", ["USC.40.3131", "USC.40.3131.Detail"]],
    ["statutes/little-miller-acts.ts", ["TX.GovCode.2253", "NY.StateFinanceLaw.137"]],
    ["statutes/prompt-payment.ts", ["USC.31.Ch39.3901"]],
    ["statutes/davis-bacon.ts", ["USC.40.3141", "DOL.WHD.DavisBacon"]],
    ["statutes/buy-american.ts", ["USC.41.8301", "GovInfo.BABAA"]],
    ["statutes/osha-1926.ts", ["OSHA.29CFR1926"]],
  ];

  for (const [file, handles] of statuteModules) {
    const isOsha = file.includes("osha");
    moduleFile(
      `lib/intelligence/synthetic/libraries/construction/${file}`,
      handles,
      isOsha
        ? `/** Reference-only stub — NO enforcement logic per Q9=A */
export function referenceOsha1926() {
  return resolveConstructionCitationHandle("OSHA.29CFR1926");
}`
        : `export function listStatuteHandles() {
  return resolveModuleHandles();
}`,
    );
  }

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/aicpa/aag-con.ts",
    ["AICPA.AAG-CON", "AICPA.RevRec.EngrConst"],
    `export function getAicpaConstructionGuides() {
  return resolveModuleHandles();
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/aia/g702-g703.ts",
    ["AIA.G702-1992", "AIA.G703"],
    `export function getPayApplicationForms() {
  return resolveModuleHandles();
}`,
  );

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/surety/sfaa-nasbp.ts",
    ["SFAA.SuretyBond.WhatIs", "SFAA.FactSheet", "NASBP.HowToObtain", "NASBP.Deskbook", "NASBP.BondingResources"],
    `export function getSuretyReferences() {
  return resolveModuleHandles();
}`,
  );

  const ifrsModules = [
    ["ifrs/ifrs15.ts", ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.B14-B19", "EUR-Lex.2016R1905.IFRS15", "EUR-Lex.2023R1803.IFRS15"]],
    ["ifrs/ifrs16.ts", ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16"]],
    ["ifrs/ias11.ts", ["IAS11.Superseded"]],
    ["ifrs/ifric12.ts", ["IFRIC12.Page"]],
  ];
  for (const [file, handles] of ifrsModules) {
    moduleFile(
      `lib/intelligence/synthetic/libraries/construction/${file}`,
      handles,
      `export function getIfrsHandles() {
  return resolveModuleHandles();
}`,
    );
  }

  moduleFile(
    "lib/intelligence/synthetic/libraries/construction/wip/schedule-schema.ts",
    ["ASC.606-10-45-1", "ASC.606-10-45-5", "AICPA.AAG-CON"],
    `export const WIP_SCHEDULE_SCHEMA = {
  fields: ["contractId", "costsIncurred", "estimatedCost", "billings", "retentionHeld", "overUnder"],
  citationHandles: MODULE_HANDLES,
} as const;`,
  );
}

function writeKpiDisclosureReasonableness() {
  const kpiFiles = [
    ["kpi/construction-revenue/backlog.ts", "backlog"],
    ["kpi/construction-revenue/poc-percent.ts", "poc-percent"],
    ["kpi/construction-progress/spi-cpi.ts", "spi-cpi"],
    ["kpi/construction-liquidity/retention-receivable-pct.ts", "retention-receivable-pct"],
    ["kpi/construction-liquidity/dso.ts", "dso"],
    ["kpi/construction-profitability/gross-margin.ts", "gross-margin"],
    ["kpi/construction-bonding/working-capital-x10.ts", "working-capital-x10"],
    ["kpi/construction-bonding/equity-x20.ts", "equity-x20"],
    ["kpi/construction-bonding/single-job-capacity.ts", "single-job-capacity"],
  ];
  for (const [file, key] of kpiFiles) {
    writeFile(
      file,
      `${DOCTRINE_HEADER}
export const CONSTRUCTION_KPI_KEY = "${key}";

export function computeKpi(input: Record<string, number>) {
  return { kpiKey: CONSTRUCTION_KPI_KEY, value: input.numerator && input.denominator ? input.numerator / input.denominator : 0 };
}
`,
    );
  }

  const disclosureFiles = [
    "wip-schedule", "backlog", "retention", "pay-application", "contract-cost-rollforward",
    "cip-schedule", "jv-equity-rollforward", "ifrs15-disclosure-set",
  ];
  for (const name of disclosureFiles) {
    writeFile(
      `disclosure-variants/construction/${name}.ts`,
      `${DOCTRINE_HEADER}
export const DISCLOSURE_VARIANT = "${name}";

export function buildDisclosureVariant() {
  return { variant: DISCLOSURE_VARIANT, framework: ["US_GAAP", "IFRS"] };
}
`,
    );
  }

  const reasonablenessFiles = [
    ["gross-margin-ranges.ts", "CFMA Financial Benchmarker", { min: 8, max: 25 }],
    ["backlog-ratios.ts", "CFMA + AGC", { min: 0.5, max: 3.0 }],
    ["retention-pct-ranges.ts", "CA 5% / TX varies / FL tiered", { ca: 5, tx: "varies", fl: "tiered" }],
    ["bonding-capacity-ranges.ts", "NASBP Three C's", { wcMultiple: 10, equityMultiple: 20 }],
    ["dso-ranges.ts", "CFMA", { min: 30, max: 90 }],
    ["wip-turnover-ranges.ts", "CFMA", { min: 4, max: 12 }],
  ];
  for (const [file, source, range] of reasonablenessFiles) {
    writeFile(
      `reasonableness/construction/${file}`,
      `${DOCTRINE_HEADER}
export const REASONABLENESS_SOURCE = "${source}";
export const REASONABLENESS_RANGE = ${JSON.stringify(range)};

export function getReasonablenessRange() {
  return { source: REASONABLENESS_SOURCE, range: REASONABLENESS_RANGE };
}
`,
    );
  }

  writeFile(
    "industry-profiles/construction/profile.ts",
    `${DOCTRINE_HEADER}
import type { ConstructionSubSegmentId } from "../../lib/intelligence/synthetic/libraries/construction/types";

export const CONSTRUCTION_SUB_SEGMENTS: ConstructionSubSegmentId[] = ["G", "S", "R", "C", "H", "D"];

export const CONSTRUCTION_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const constructionWave1Profile = {
  vertical: "construction",
  wave: 1,
  subSegments: CONSTRUCTION_SUB_SEGMENTS,
  frameworks: CONSTRUCTION_FRAMEWORKS,
  applicableStandards: [
    "ASC 606", "ASC 340-40", "ASC 842", "ASC 460", "ASC 810", "ASC 323", "ASC 360",
    "IFRS 15", "IFRS 16", "IFRIC 12", "AICPA AAG-CON", "AIA G702/G703",
  ],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelReserved: "poc-progress-audit",
};
`,
  );
}

function writeSourceDocs() {
  const docsDir = "docs/construction/wave1";
  const byDoc = new Map();
  for (const h of HANDLES) {
    if (!byDoc.has(h.sourceDoc)) byDoc.set(h.sourceDoc, []);
    byDoc.get(h.sourceDoc).push(h);
  }

  for (const [doc, handles] of byDoc) {
    const title = doc.replace(".md", "").replace(/_/g, " ");
    const rows = handles
      .map((h) => `| \`${h.handleId}\` | ${h.title} | [source](${h.url}) | URL-only handle |`)
      .join("\n");
    writeFile(
      `${docsDir}/${doc}`,
      `# ${title}\n\n**Verified:** 2026-06-26\n\n| Handle | Title | URL | Notes |\n|---|---|---|---|\n${rows}\n`,
    );
  }

  writeFile(
    `${docsDir}/Construction_Vertical_Planning_Doc.md`,
    `# Construction Vertical Planning Document

**Lock:** LOCK-CON-1 (Wave 1 Reconnaissance)
**Authored:** 2026-06-26
**Owner:** Matthew Wiseman / Wiseman Financial Technologies LLC

## Sub-Segments (G/S/R/C/H/D)
- G General Contractor
- S Subcontractor
- R Residential (point-in-time fallback common)
- C Commercial / Industrial
- H Heavy Civil / Infrastructure (IFRIC 12 P3/PPP)
- D Specialty Design-Build

## Frameworks
US GAAP + IFRS (first dual-framework vertical at Wave 1)

## Audit Channels
7 existing + poc-progress-audit reserved for CON-2

## Doctrine
containsConstructionContractData (scattered in CON-1, structural in CON-2)
`,
  );

  const indexRows = HANDLES.map(
    (h) => `| ${h.handleId} | ${h.library} | ${h.title} | ${h.url} | 2026-06-26 |`,
  ).join("\n");

  writeFile(
    `${docsDir}/handle-index.md`,
    `# Construction Citation Handle Index\n\n| Handle | Library | Title | URL | Last Verified |\n|---|---|---|---|---|\n${indexRows}\n`,
  );

  const wb = XLSX.utils.book_new();
  const indexSheet = XLSX.utils.aoa_to_sheet([
    ["Handle", "Library", "Title", "URL", "Last Verified"],
    ...HANDLES.map((h) => [h.handleId, h.library, h.title, h.url, "2026-06-26"]),
  ]);
  XLSX.utils.book_append_sheet(wb, indexSheet, "Index");
  for (const lib of ["ASC_606_340", "ASC_842", "SPECIALIZED", "IFRS", "BENCHMARKS", "FEDERAL_STATUTES"]) {
    const rows = HANDLES.filter((h) => h.library === lib);
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Handle", "Title", "URL", "Last Verified"],
      ...rows.map((h) => [h.handleId, h.title, h.url, "2026-06-26"]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, lib.slice(0, 31));
  }
  XLSX.writeFile(wb, path.join(root, docsDir, "Construction_Citation_Verification_Register.xlsx"));
}

function main() {
  writeErrors();
  writeTypes();
  writeHandlesRegistry();
  writeHandles();
  writeIndex();
  writeAsc606Modules();
  writeOtherLibraryModules();
  writeKpiDisclosureReasonableness();
  writeSourceDocs();
  console.log(`CON-1 scaffold: ${HANDLES.length} handles, modules written.`);
}

main();
