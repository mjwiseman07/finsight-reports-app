import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/g7-c7a-8");

const HAPPY_US_GOVCON = {
  contracts: { by_type: { FFP: 42, CPFF: 18, CPIF: 12, T_AND_M: 8, IDIQ: 20 } },
  customer_concentration: { us_government_pct: 72 },
  cas_coverage: { applicable_standards: ["CAS 401", "CAS 410", "CAS 418"], coverage_type: "full" },
  backlog: { funded: 28_000_000_000, unfunded: 12_500_000_000, option_years: 5 },
  unallowable_costs: {
    identified_categories: ["entertainment", "lobbying", "alcohol"],
    exclusion_methodology: "unallowable cost exclusion from forward pricing rates",
  },
  indirect_rates: { fringe: 0.28, overhead: 0.15, ga: 0.09, true_up_methodology: "annual forward pricing rate agreement true-up" },
};

const HAPPY_IFRS_GOVCON = {
  contracts: { by_type: { fixed_price: 45, cost_reimbursable: 30, incentive: 15, service: 10 } },
  customer_concentration: { us_government_pct: 0 },
  backlog: { funded: 9_500_000_000, unfunded: 4_200_000_000, horizon_years: [3, 5, 7] },
};

function baseExtracted(overrides) {
  return {
    schemaVersion: "1.0.0",
    filingId: "FIXTURE",
    vertical: "gc",
    framework: "us-gaap",
    entityName: "Fixture Entity",
    formType: "10-K",
    numericFacts: [],
    narrativeSnippets: ["Government contractor disclosure"],
    rawFrameworkSignals: ["us-gaap"],
    ...overrides,
  };
}

function writeFixture(relPath, extracted) {
  const fullPath = join(FIXTURE_ROOT, relPath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify({ extracted }, null, 2)}\n`, "utf8");
}

const fixtures = [
  [
    "usgaap/contractTypeMixDisclosure/happy-defense-contractor.json",
    baseExtracted({ govcon: { contracts: HAPPY_US_GOVCON.contracts, customer_concentration: HAPPY_US_GOVCON.customer_concentration } }),
  ],
  [
    "usgaap/contractTypeMixDisclosure/fail-closed-missing-breakdown.json",
    baseExtracted({ govcon: { customer_concentration: { us_government_pct: 50 } } }),
  ],
  [
    "usgaap/contractTypeMixDisclosure/comingling-rejected-ifrs-citation.json",
    baseExtracted({
      narrativeSnippets: ["Prefilled IFRS 15.114 citation must not appear in US GAAP output"],
      govcon: { contracts: HAPPY_US_GOVCON.contracts, customer_concentration: HAPPY_US_GOVCON.customer_concentration },
    }),
  ],
  [
    "usgaap/dcaaCASComplianceDisclosure/happy-full-cas-coverage.json",
    baseExtracted({ govcon: { cas_coverage: HAPPY_US_GOVCON.cas_coverage } }),
  ],
  [
    "usgaap/dcaaCASComplianceDisclosure/happy-modified-cas-coverage.json",
    baseExtracted({
      govcon: {
        cas_coverage: {
          applicable_standards: ["CAS 401", "CAS 410"],
          coverage_type: "modified",
        },
      },
    }),
  ],
  [
    "usgaap/dcaaCASComplianceDisclosure/fail-closed-missing-coverage.json",
    baseExtracted({ govcon: {} }),
  ],
  [
    "usgaap/backlogFundedVsUnfunded/happy-multi-year-contract.json",
    baseExtracted({ govcon: { backlog: HAPPY_US_GOVCON.backlog } }),
  ],
  [
    "usgaap/backlogFundedVsUnfunded/fail-closed-missing-funding-split.json",
    baseExtracted({ govcon: { backlog: { funded: 100 } } }),
  ],
  [
    "usgaap/backlogFundedVsUnfunded/comingling-rejected-ifrs-citation.json",
    baseExtracted({
      narrativeSnippets: ["Prefilled IFRS 15.120 citation must not appear in US GAAP output"],
      govcon: { backlog: HAPPY_US_GOVCON.backlog },
    }),
  ],
  [
    "usgaap/costAllowabilityFAR/happy-standard-exclusions.json",
    baseExtracted({ govcon: { unallowable_costs: HAPPY_US_GOVCON.unallowable_costs } }),
  ],
  [
    "usgaap/costAllowabilityFAR/fail-closed-missing-methodology.json",
    baseExtracted({ govcon: { unallowable_costs: { identified_categories: ["lobbying"] } } }),
  ],
  [
    "usgaap/costAllowabilityFAR/comingling-rejected-ifrs-citation.json",
    baseExtracted({
      narrativeSnippets: ["Prefilled IFRS 8 citation must not appear in US GAAP output"],
      govcon: { unallowable_costs: HAPPY_US_GOVCON.unallowable_costs },
    }),
  ],
  [
    "usgaap/indirectRateStructure/happy-fringe-oh-ga.json",
    baseExtracted({ govcon: { indirect_rates: HAPPY_US_GOVCON.indirect_rates } }),
  ],
  [
    "usgaap/indirectRateStructure/fail-closed-missing-rates.json",
    baseExtracted({ govcon: { indirect_rates: { fringe: 0.2, overhead: 0.1 } } }),
  ],
  [
    "usgaap/indirectRateStructure/comingling-rejected-ifrs-citation.json",
    baseExtracted({
      narrativeSnippets: ["Prefilled IFRS 15 citation must not appear in US GAAP output"],
      govcon: { indirect_rates: HAPPY_US_GOVCON.indirect_rates },
    }),
  ],
  [
    "ifrs/contractTypeMixDisclosure/happy-eu-defense-contractor.json",
    baseExtracted({
      framework: "ifrs",
      rawFrameworkSignals: ["ifrs-full"],
      entityName: "BAE Systems equivalent",
      govcon: {
        contracts: HAPPY_IFRS_GOVCON.contracts,
        customer_concentration: HAPPY_IFRS_GOVCON.customer_concentration,
      },
    }),
  ],
  [
    "ifrs/contractTypeMixDisclosure/fail-closed-missing-breakdown.json",
    baseExtracted({ framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], govcon: {} }),
  ],
  [
    "ifrs/contractTypeMixDisclosure/comingling-rejected-far-leakage.json",
    baseExtracted({
      framework: "ifrs",
      rawFrameworkSignals: ["ifrs-full"],
      narrativeSnippets: ["Prefilled FAR 16.2 citation must not leak into IFRS output"],
      govcon: {
        contracts: HAPPY_IFRS_GOVCON.contracts,
        customer_concentration: HAPPY_IFRS_GOVCON.customer_concentration,
      },
    }),
  ],
  [
    "ifrs/backlogDisclosure/happy-multi-year-contract.json",
    baseExtracted({
      framework: "ifrs",
      rawFrameworkSignals: ["ifrs-full"],
      govcon: { backlog: HAPPY_IFRS_GOVCON.backlog },
    }),
  ],
  [
    "ifrs/backlogDisclosure/fail-closed-missing-horizon.json",
    baseExtracted({
      framework: "ifrs",
      rawFrameworkSignals: ["ifrs-full"],
      govcon: { backlog: { funded: 100, unfunded: 50 } },
    }),
  ],
  [
    "ifrs/backlogDisclosure/comingling-rejected-far-leakage.json",
    baseExtracted({
      framework: "ifrs",
      rawFrameworkSignals: ["ifrs-full"],
      narrativeSnippets: ["Prefilled CAS 418 citation must not leak into IFRS output"],
      govcon: { backlog: HAPPY_IFRS_GOVCON.backlog },
    }),
  ],
  [
    "cross-cutting/lockheed-vs-bae-framework-switch.json",
    baseExtracted({
      filingId: "GC-SWITCH",
      entityName: "Lockheed-equivalent",
      govcon: HAPPY_US_GOVCON,
    }),
  ],
  [
    "happy/gd-10k.json",
    baseExtracted({ filingId: "GD-10k", entityName: "General Dynamics", govcon: HAPPY_US_GOVCON }),
  ],
  [
    "happy/lmt-10k.json",
    baseExtracted({ filingId: "LMT-10k", entityName: "Lockheed Martin", govcon: HAPPY_US_GOVCON }),
  ],
  [
    "happy/noc-10k.json",
    baseExtracted({ filingId: "NOC-10k", entityName: "Northrop Grumman", govcon: HAPPY_US_GOVCON }),
  ],
  [
    "happy/rtx-10k.json",
    baseExtracted({ filingId: "RTX-10k", entityName: "RTX Corporation", govcon: HAPPY_US_GOVCON }),
  ],
];

for (const [relPath, extracted] of fixtures) {
  writeFixture(relPath, extracted);
}

console.log(`wrote ${fixtures.length} fixtures under ${FIXTURE_ROOT}`);
