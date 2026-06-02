# Accounting Connector Certification

Connector certification verifies that each ERP/accounting provider can produce `AdvisacorNormalizedFinancialData` and pass the shared downstream reporting readiness checks before dashboard, Pulse, PDF, PowerPoint, KPI, flux, or scheduled reporting workflows consume the data.

## Purpose

The certification commands protect the unified Advisacor accounting data engine from provider-specific drift. QuickBooks, Xero, NetSuite, Microsoft Dynamics, and Sage must all hand data to the same normalized model. Connector-specific logic belongs only inside the provider adapter layer.

## Required Normalized Objects

Certification fails if any core reporting object is missing or empty:

- `normalizedAccounts`
- `normalizedTrialBalance`
- `normalizedBalanceSheet`
- `normalizedIncomeStatement`

These objects are required because KPI, flux, Pulse commentary, PDF packages, PowerPoint packages, and scheduled reporting all depend on the same core financial statement foundation.

## Optional Normalized Objects

Certification logs warnings, but does not fail, if these objects are missing:

- `normalizedARAging`
- `normalizedAPAging`
- `normalizedBudgets`
- `normalizedDepartments`
- `normalizedLocations`
- `normalizedClasses`
- `normalizedProjects`
- `normalizedVendors`
- `normalizedCustomers`

Warnings mean the connector can certify for core reporting, but some advanced package sections or advisory modules may have less source detail until the provider exposes the data or the adapter mapping is expanded.

## How To Run

Run one provider:

```bash
npm run verify:quickbooks
npm run verify:xero
npm run verify:netsuite
npm run verify:dynamics
npm run verify:sage
```

Run the shared command directly:

```bash
npm run verify:accounting-connector -- --provider quickbooks
```

Run every provider:

```bash
npm run verify:accounting-connectors
```

Run the architecture-level verifier:

```bash
npm run verify:accounting-data-engine
```

Run live Xero verification after configuring a Xero demo/development app and completing OAuth:

```bash
npm run verify:xero-live
```

Required live Xero environment values:

- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`
- `XERO_REDIRECT_URI`
- `XERO_ENV=demo` or `XERO_ENV=development`

Optional values:

- `XERO_SCOPES` to override the built-in granular read-only scopes.
- `XERO_TENANT_ID` or `XERO_DEMO_TENANT_NAME` to select a specific demo tenant during verification.
- `XERO_LIVE_CONNECTION_ID` to verify a specific stored Xero connection row.

The built-in default Xero scopes are read-only and granular: `offline_access`, `accounting.settings.read`, `accounting.contacts.read`, `accounting.invoices.read`, `accounting.banktransactions.read`, `accounting.reports.trialbalance.read`, `accounting.reports.balancesheet.read`, `accounting.reports.profitandloss.read`, and `accounting.reports.aged.read`.

## Fixtures

Local certification uses fixtures in `scripts/fixtures/accounting/`. The verifier does not require live customer credentials. Each fixture is passed through the provider adapter by setting `connection.metadata_json.certification_fixture`, then the adapter hands the resulting report bundle to `buildAdvisacorNormalizedFinancialData()`.

This avoids fake shape-only checks: the certification path still exercises provider registration, adapter report handoff, normalized data construction, shared validation, and downstream readiness checks.

## Adding A New ERP Connector

1. Add the provider to `AccountingProvider` and `providerRegistry`.
2. Implement the provider adapter so live sync returns a canonical report bundle.
3. Keep provider-specific parsing and source API details inside the adapter.
4. Add fixture support in the adapter through `buildCertificationFixtureReportBundle()`.
5. Add a fixture under `scripts/fixtures/accounting/`.
6. Add an npm verification script and include the provider in `scripts/verify-accounting-connectors.js`.
7. Run the provider command, `npm run verify:accounting-connectors`, `npm run verify:accounting-data-engine`, TypeScript, and targeted ESLint.

## Failure Conditions

Certification fails when:

- The provider is not registered.
- `sourceSystem`, `companyId`, or `connectionId` is missing or wrong.
- A required normalized object is missing or empty.
- Shared reporting readiness rejects the normalized data.
- KPI, flux, Pulse, PDF, PowerPoint, or scheduled reporting readiness checks fail.

## Warning Conditions

Warnings indicate optional objects are absent from the fixture or not yet available from the connector. They should be resolved before enabling advanced advisory modules that depend on those details, but they do not block core reporting certification.
