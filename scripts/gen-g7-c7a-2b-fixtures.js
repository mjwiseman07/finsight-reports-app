import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/g7-c7a-2b");

const HOLDINGS = {
  top_n: 10,
  as_of_date: "2026-03-31",
  entries: [
    { issuer: "Apple Inc", fair_value: 1_250_000_000, pct_of_net_assets: 7.2 },
    { issuer: "Microsoft Corp", fair_value: 1_100_000_000, pct_of_net_assets: 6.4 },
  ],
};

const DERIVATIVES = {
  contracts: [
    {
      type: "index futures",
      counterparty: "CME Clearing",
      notional: 500_000_000,
      fair_value: 2_400_000,
      expiration: "2026-06-30",
    },
  ],
};

const BROKERAGE = {
  commissions_by_broker: [
    { broker: "Goldman Sachs", amount: 125_000 },
    { broker: "Morgan Stanley", amount: 98_500 },
  ],
  soft_dollar_arrangements: "research services under soft-dollar policy",
};

const TURNOVER = {
  numerator: 420_000_000,
  denominator: 8_500_000_000,
  methodology: "lesser of purchases or sales divided by average net assets",
};

const NAV = { net_assets: 17_500_000_000, shares_outstanding: 850_000_000 };

const FULL_FA = {
  holdings: HOLDINGS,
  derivatives: DERIVATIVES,
  brokerage: BROKERAGE,
  portfolio_turnover: TURNOVER,
  nav: NAV,
};

function baseExtracted(overrides) {
  return {
    schemaVersion: "1.0.0",
    vertical: "fa",
    framework: "us-gaap",
    formType: "N-CSR",
    numericFacts: [],
    narrativeSnippets: ["Registered investment company filing"],
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
  ["usgaap/topHoldingsDisclosure/happy-fxaix-top10.json", baseExtracted({ filingId: "FXAIX-TOP", entityName: "Fidelity 500 Index", fund_accounting: { holdings: HOLDINGS } })],
  ["usgaap/topHoldingsDisclosure/fail-closed-missing-entries.json", baseExtracted({ filingId: "FAIL-TOP", fund_accounting: { holdings: { top_n: 10, as_of_date: "2026-03-31" } } })],
  ["usgaap/topHoldingsDisclosure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-TOP", narrativeSnippets: ["Prefilled IFRS 13.93 must not appear in US GAAP output"], fund_accounting: { holdings: HOLDINGS } })],
  ["usgaap/derivativesScheduleDisclosure/happy-spy-futures.json", baseExtracted({ filingId: "SPY-DERIV", fund_accounting: { derivatives: DERIVATIVES } })],
  ["usgaap/derivativesScheduleDisclosure/fail-closed-missing-contracts.json", baseExtracted({ filingId: "FAIL-DERIV", fund_accounting: { derivatives: { contracts: [] } } })],
  ["usgaap/derivativesScheduleDisclosure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-DERIV", narrativeSnippets: ["Prefilled IFRS 7.31 must not appear in US GAAP output"], fund_accounting: { derivatives: DERIVATIVES } })],
  ["usgaap/brokerageCommissionDisclosure/happy-ncsr-commissions.json", baseExtracted({ filingId: "BROKER", fund_accounting: { brokerage: BROKERAGE } })],
  ["usgaap/brokerageCommissionDisclosure/fail-closed-missing-brokers.json", baseExtracted({ filingId: "FAIL-BROKER", fund_accounting: { brokerage: {} } })],
  ["usgaap/brokerageCommissionDisclosure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-BROKER", narrativeSnippets: ["Prefilled IAS 1.97 must not appear in US GAAP output"], fund_accounting: { brokerage: BROKERAGE } })],
  ["usgaap/portfolioTurnoverDisclosure/happy-index-fund-turnover.json", baseExtracted({ filingId: "TURNOVER", fund_accounting: { portfolio_turnover: TURNOVER } })],
  ["usgaap/portfolioTurnoverDisclosure/fail-closed-missing-methodology.json", baseExtracted({ filingId: "FAIL-TURNOVER", fund_accounting: { portfolio_turnover: { numerator: 1, denominator: 10 } } })],
  ["usgaap/portfolioTurnoverDisclosure/comingling-rejected-ifrs-citation.json", baseExtracted({ filingId: "COMINGLING-TURNOVER", narrativeSnippets: ["Prefilled IFRS 7 must not appear in US GAAP output"], fund_accounting: { portfolio_turnover: TURNOVER } })],
  ["ifrs/topHoldingsDisclosure/happy-eu-fund-top10.json", baseExtracted({ filingId: "EU-TOP", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: { holdings: HOLDINGS } })],
  ["ifrs/topHoldingsDisclosure/fail-closed-missing-as-of-date.json", baseExtracted({ filingId: "FAIL-IFRS-TOP", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: { holdings: { top_n: 10, entries: HOLDINGS.entries } } })],
  ["ifrs/topHoldingsDisclosure/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-TOP", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled ASC 946 must not appear in IFRS output"], fund_accounting: { holdings: HOLDINGS } })],
  ["ifrs/derivativesScheduleDisclosure/happy-eu-futures.json", baseExtracted({ filingId: "EU-DERIV", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: { derivatives: DERIVATIVES } })],
  ["ifrs/derivativesScheduleDisclosure/fail-closed-missing-counterparty.json", baseExtracted({ filingId: "FAIL-IFRS-DERIV", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: { derivatives: { contracts: [{ type: "futures", notional: 1, fair_value: 1, expiration: "x" }] } } })],
  ["ifrs/derivativesScheduleDisclosure/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-DERIV", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled ASC 815 must not appear in IFRS output"], fund_accounting: { derivatives: DERIVATIVES } })],
  ["ifrs/brokerageCommissionDisclosure/happy-eu-transaction-costs.json", baseExtracted({ filingId: "EU-BROKER", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: { brokerage: BROKERAGE } })],
  ["ifrs/brokerageCommissionDisclosure/fail-closed-missing-commissions.json", baseExtracted({ filingId: "FAIL-IFRS-BROKER", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], fund_accounting: {} })],
  ["ifrs/brokerageCommissionDisclosure/comingling-rejected-asc-citation.json", baseExtracted({ filingId: "COMINGLING-IFRS-BROKER", framework: "ifrs", rawFrameworkSignals: ["ifrs-full"], narrativeSnippets: ["Prefilled Item 31 must not appear in IFRS output"], fund_accounting: { brokerage: BROKERAGE } })],
  ["cross-cutting/fa-full-suite-vfiax.json", baseExtracted({ filingId: "VFIAX-SUITE", entityName: "Vanguard 500 Index Admiral", fund_accounting: FULL_FA })],
  ["happy/fxaix-ncsr-top-holdings.json", baseExtracted({ filingId: "FXAIX-NCSR", entityName: "FIDELITY 500 INDEX FUND", fund_accounting: { holdings: HOLDINGS, nav: NAV } })],
  ["happy/ivv-ncsr-top-holdings.json", baseExtracted({ filingId: "IVV-NCSR", entityName: "ISHARES CORE S&P 500 ETF", fund_accounting: { holdings: HOLDINGS, nav: NAV } })],
  ["happy/spy-nq-full.json", baseExtracted({ filingId: "SPY-NQ", entityName: "SPDR S&P 500 ETF TRUST", formType: "N-Q", fund_accounting: FULL_FA })],
  ["happy/vfiax-ncsr-full.json", baseExtracted({ filingId: "VFIAX-NCSR", entityName: "VANGUARD 500 INDEX FUND ADMIRAL", fund_accounting: FULL_FA })],
];

for (const [relPath, extracted] of fixtures) {
  writeFixture(relPath, extracted);
}

console.log(`wrote ${fixtures.length} fixtures under ${FIXTURE_ROOT}`);
