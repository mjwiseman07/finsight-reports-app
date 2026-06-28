import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/g7-c7a-1b");

const BASE_CON = {
  schemaVersion: "1.0.0",
  vertical: "con",
  framework: "us-gaap",
  formType: "10-K",
  numericFacts: [
    {
      tag: "RevenueFromContractWithCustomerExcludingAssessedTax",
      label: "Revenue from Contract with Customer",
      value: 5_200_000_000,
      unit: "USD",
      periodEnd: "2026-03-31",
    },
  ],
  narrativeSnippets: ["Construction contract revenue recognition"],
  rawFrameworkSignals: ["us-gaap"],
};

const UNITS = {
  output_measure: {
    method: "units-of-delivery",
    unit_definition: "completed housing units",
    unit_progress: 142,
  },
};

const MILESTONES = {
  output_measure: {
    method: "milestones",
    milestones_defined: ["foundation complete", "superstructure complete", "final inspection"],
    milestones_achieved: ["foundation complete", "superstructure complete"],
  },
};

const POST_COMPLETION = {
  post_completion: {
    warranty_obligation: "two-year structural warranty provision",
    retainage_balance: 48_500_000,
    adjustment_history: "post-completion cost true-up using incurred cost relative to estimated total cost",
  },
  contract_balances: {
    contract_assets: 320_000_000,
    contract_liabilities: 95_000_000,
  },
};

const MTZ_BALANCES = {
  contract_balances: {
    contract_assets: 410_000_000,
    contract_liabilities: 128_000_000,
  },
};

function baseExtracted(overrides) {
  return { ...BASE_CON, ...overrides };
}

function writeFixture(relPath, extracted) {
  const fullPath = join(FIXTURE_ROOT, relPath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify({ extracted }, null, 2)}\n`, "utf8");
}

const fixtures = [
  ["usgaap/unitsOfDeliveryOutputMeasure/happy-housing-units.json", baseExtracted({ filingId: "UNITS", entityName: "Housing Units Co", construction: UNITS })],
  ["usgaap/unitsOfDeliveryOutputMeasure/fail-closed-missing-unit-definition.json", baseExtracted({ filingId: "FAIL-UNITS", construction: { output_measure: { method: "units-of-delivery", unit_progress: 10 } } })],
  ["usgaap/unitsOfDeliveryOutputMeasure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-US", narrativeSnippets: ["Prefilled IFRS 15.B16 must not appear in US GAAP output"], construction: UNITS })],
  ["usgaap/milestoneOutputMeasure/happy-infrastructure-milestones.json", baseExtracted({ filingId: "MILESTONES", entityName: "Infrastructure Co", construction: MILESTONES })],
  ["usgaap/milestoneOutputMeasure/fail-closed-missing-milestones.json", baseExtracted({ filingId: "FAIL-MILE", construction: { output_measure: { method: "milestones", milestones_defined: ["a"] } } })],
  ["usgaap/milestoneOutputMeasure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-MILE", narrativeSnippets: ["Prefilled IFRS 15.B16 must not appear in US GAAP output"], construction: MILESTONES })],
  ["usgaap/postCompletionAdjustments/happy-warranty-and-retainage.json", baseExtracted({ filingId: "POST", entityName: "PWR Post Completion", construction: POST_COMPLETION })],
  ["usgaap/postCompletionAdjustments/fail-closed-missing-warranty.json", baseExtracted({ filingId: "FAIL-POST", construction: { post_completion: { retainage_balance: 100, adjustment_history: "x" } } })],
  ["usgaap/postCompletionAdjustments/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-POST", narrativeSnippets: ["Prefilled IFRS 15.50 must not appear in US GAAP output"], construction: POST_COMPLETION })],
  ["ifrs/unitsOfDeliveryOutputMeasure/happy-eu-housing-units.json", baseExtracted({ filingId: "EU-UNITS", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], entityName: "EU Housing Co", construction: UNITS })],
  ["ifrs/unitsOfDeliveryOutputMeasure/fail-closed-missing-unit-definition.json", baseExtracted({ filingId: "FAIL-IFRS-UNITS", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], construction: { output_measure: { method: "units-of-delivery" } } })],
  ["ifrs/unitsOfDeliveryOutputMeasure/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-U", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled ASC 606-10-55-19 must not appear in IFRS output"], construction: UNITS })],
  ["ifrs/milestoneOutputMeasure/happy-uk-infrastructure-milestones.json", baseExtracted({ filingId: "UK-MILE", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], entityName: "UK Infrastructure Co", construction: MILESTONES })],
  ["ifrs/milestoneOutputMeasure/fail-closed-missing-milestones.json", baseExtracted({ filingId: "FAIL-IFRS-MILE", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], construction: { output_measure: { method: "milestones" } } })],
  ["ifrs/milestoneOutputMeasure/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-M", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled ASC 606 must not appear in IFRS output"], construction: MILESTONES })],
  ["ifrs/postCompletionAdjustments/happy-eu-warranty-retainage.json", baseExtracted({ filingId: "EU-POST", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], construction: POST_COMPLETION })],
  ["ifrs/postCompletionAdjustments/fail-closed-missing-warranty.json", baseExtracted({ filingId: "FAIL-IFRS-POST", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], construction: { post_completion: { retainage_balance: 1, adjustment_history: "x" } } })],
  ["ifrs/postCompletionAdjustments/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-P", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled ASC 606-10-32-10 must not appear in IFRS output"], construction: POST_COMPLETION })],
  ["cross-cutting/output-measure-method-switch.json", baseExtracted({ filingId: "CON-SWITCH", entityName: "Method Switch Co", construction: UNITS })],
  ["happy/flr-10k-units.json", baseExtracted({ filingId: "FLR-10k", entityName: "FLUOR CORPORATION", construction: UNITS })],
  ["happy/gva-10k-milestones.json", baseExtracted({ filingId: "GVA-10k", entityName: "GRANITE CONSTRUCTION", construction: MILESTONES })],
  ["happy/mtz-10k-balances.json", baseExtracted({ filingId: "MTZ-10k", entityName: "MASTEC INC", construction: { ...MILESTONES, ...MTZ_BALANCES } })],
  ["happy/mtz-10k-milestones.json", baseExtracted({ filingId: "MTZ-10k", entityName: "MASTEC INC", construction: MILESTONES })],
  ["happy/pwr-10k-milestones.json", baseExtracted({ filingId: "PWR-10k", entityName: "QUANTA SERVICES", construction: MILESTONES })],
  ["happy/pwr-10k-post-completion.json", baseExtracted({ filingId: "PWR-10k", entityName: "QUANTA SERVICES", construction: { ...MILESTONES, ...POST_COMPLETION } })],
];

for (const [relPath, extracted] of fixtures) {
  writeFixture(relPath, extracted);
}

console.log(`wrote ${fixtures.length} fixtures under ${FIXTURE_ROOT}`);
