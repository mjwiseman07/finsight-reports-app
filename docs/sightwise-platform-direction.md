# Advisacor Platform Direction

## Product Identity

Company: Wiseman Financial Technologies LLC

Product: Advisacor

Positioning: AI-assisted financial intelligence and advisory workflow infrastructure for accounting firms, controllers, advisory firms, business owners, and fractional CFO teams.

Advisacor is evolving into:

- AI-assisted financial intelligence platform
- Advisory workflow infrastructure
- Financial oversight platform
- Executive reporting platform
- Controller intelligence system
- Outsourced CFO operating system
- Continuous executive financial awareness platform

The product should feel premium, executive-level, advisory-focused, operationally intelligent, modern SaaS, and fractional CFO-grade. It should not feel dashboard-heavy, cluttered, generic accounting software, or AI gimmick software.

The frontend should remain simple, guided, clean, and workflow-oriented. Most intelligence should remain backend/internal.

The core product rule is: one intelligence engine, four audiences, and three package depths. Package level controls the scope of intelligence available. Persona controls the presentation layer, wording, depth, and workflow.

## Strategic Product Architecture

Personas:

1. Bookkeeper
2. Controller
3. Fractional CFO
4. Business Owner

Package levels:

1. Essential
2. Professional
3. Virtual CFO

All packages receive advisory commentary, AI intelligence, executive summaries, and recommendations. The difference is scope, not whether AI is available.

## Package Tiers

### Essential

Audience: bookkeepers, bookkeeping firms, small accounting firms, and monthly operational review users.

Purpose: bookkeeping intelligence and monthly review.

Includes:

- Executive PDF package
- Executive PowerPoint summary
- Payroll/FTE analysis
- Month-over-month flux
- AR/AP review
- Reserve exposure review
- KPI review
- AI workflow assistance
- QuickBooks troubleshooting
- Preparer review workspace

AI helper scope:

- Workflow assistance
- Bookkeeping support
- Payroll/FTE explanations
- AR/AP explanations
- Reserve review
- Variance explanations

Excluded:

- Strategic CFO commentary
- Forecasting
- Budgeting
- Treasury review
- Oversight intelligence

Product feel: guided, operational, bookkeeping-focused.

### Professional

Audience: controllers, operational finance teams, advisory firms, and growing businesses.

Purpose: operational financial intelligence.

Includes:

- Inventory intelligence
- Fixed asset analysis
- Debt analysis
- Liquidity review
- Payroll/FTE analysis
- Quarter-over-quarter flux
- Operational commentary
- Advanced schedules
- Reconciliation assistance
- Operational KPIs

AI helper scope:

- Operational finance questions
- Inventory analysis
- Debt/liquidity review
- Operational commentary
- Reconciliation guidance
- Quarter-over-quarter review

Excluded:

- Strategic executive guidance
- Board advisory
- Treasury oversight
- Advanced oversight intelligence

Product feel: controller-focused, analytical, operational.

### Virtual CFO

Audience: business owners, leadership teams, boards, advisory firms, and fractional CFO firms.

Purpose: executive financial intelligence and oversight.

Includes everything in lower tiers plus:

- Month-over-month, quarter-over-quarter, and year-over-year flux
- Strategic commentary
- Executive recommendations
- Board reporting
- Budgeting
- Forecasting
- Treasury review
- Oversight review
- Manufacturing intelligence
- Reserve intelligence
- Deferred revenue intelligence
- Unbilled AR review
- Cash planning
- Financial oversight review
- Executive AI guidance

Product feel: executive-level, strategic, CFO-grade, oversight-focused.

## Guided Workflow

Replace large workflow/action dashboards with a small top progress tracker only.

Workflow:

1. Setup
2. Import
3. Customize
4. Review KPIs
5. Review Flux
6. Generate PDF
7. Generate PowerPoint
8. Complete

Each workflow step should fill the screen with only that step's process. The experience should stay simple and guided.

## Package-Scoped AI Access

All packages receive AI commentary and intelligence, but only within each package scope.

### Essential AI Scope

Advisory commentary is limited to payroll, FTE, AR/AP, reserves, month-over-month operational review, and bookkeeping operations.

### Professional AI Scope

Advisory commentary expands to inventory, debt, liquidity, operational finance, working capital, fixed assets, and quarter-over-quarter trends.

### Virtual CFO AI Scope

Virtual CFO receives full executive intelligence: forecasting, treasury, budgeting, oversight review, strategic guidance, board preparation, liquidity planning, operational risk review, and executive recommendations.

## Advisacor Executive

Advisacor Executive is the Business Owner experience. It is not an accounting workspace; it is an executive intelligence experience for continuous financial awareness.

Owner-facing outputs should focus on:

- Cash
- Profitability
- Growth
- Staffing
- Risks
- Opportunities
- Business health

Owner-facing outputs should avoid accounting jargon and accounting mechanics.

### Weekly Executive Brief

Every Friday, Advisacor should automatically generate and email:

- Business Health Score
- Cash Position
- Revenue Trend
- Profit Trend
- Payroll Status
- Collection Status
- Top Risk
- Top Opportunity
- Recommended Focus
- AI Executive Summary

Example owner-friendly language:

"Revenue remained stable this week. Collections improved. Cash remains healthy. Inventory growth continues to exceed sales growth and should be monitored."

### Monthly Executive Package

Monthly owner delivery should include:

- Executive PDF
- Executive PowerPoint
- Executive Summary
- KPI Review
- Forecast Summary
- Management Focus Areas

Every executive brief and monthly package should include a secure Ask Advisacor link that opens an authenticated AI workspace.

## Email-First Strategy

Do not require a native mobile app initially. Use:

- Weekly Executive Brief Email
- Monthly Executive Package Email
- Secure Ask Advisacor Link

The email becomes the primary engagement mechanism.

## Product-Led Growth Strategy

Remove "Book A Demo" as the primary CTA.

Primary CTA:

- Generate My Free Financial Review

Alternative CTAs:

- Upload Reports & Receive Free Executive Package
- Generate My Free Executive Summary
- Experience Advisacor Free

The free report model allows upload of Balance Sheet and Income Statement, with optional AR Aging, AP Aging, Payroll, and Inventory. It generates a sample executive summary, sample KPI dashboard, sample PDF package, sample PowerPoint preview, and sample AI commentary.

Free report limits:

- One company
- One package generation
- One reporting period
- Watermarked outputs
- Limited AI interaction
- Paid subscription required after free report

## Firm Pricing Model

Do not use per-client pricing initially. Use firm-size bands.

### Starter Firm

Up to 25 clients:

- Essential: $199/month
- Professional: $499/month
- Virtual CFO: $1,499/month

### Growth Firm

26-100 clients:

- Essential: $399/month
- Professional: $999/month
- Virtual CFO: $2,999/month

### Enterprise

101+ clients:

- Custom pricing
- Contact Sales

## Async Automation

All package generation should be async using background processing, scheduled jobs, queued processing, and status tracking.

Statuses:

- Scheduled
- Queued
- Processing
- Awaiting Approval
- Sent
- Failed

## Import Flow

Step 2 begins with only three choices:

1. Connect to QuickBooks
2. Import from Folder
3. Manual File Selection

Upload cards should appear only after Manual File Selection is chosen.

## Executive Delivery Automation

Create an Automated Executive Delivery engine for recurring generation and delivery of:

- PDF packages
- PowerPoint presentations
- Executive summaries
- KPI dashboards
- Forecast updates
- Operational intelligence updates

Supported cadences include monthly, quarterly, board cadence, weekly executive updates, monthly close timing, and the 5th business day. The engine should prepare future background processing for ERP sync, report refresh, AI review, PDF/PPT generation, forecasting, and executive delivery without freezing the frontend.

Example delivery message: "Your Advisacor Executive Financial Package is ready."

## Automated Delivery Scheduler

Users should be able to configure:

- Reporting cadence
- Board schedules
- Close schedules
- Executive delivery timing
- Weekly KPI updates
- Quarterly board review packages

Scheduler language should stay operational and review-oriented. It should make recurring executive delivery feel simple and premium, not like a technical job queue.

## Workspace Architecture

Separate the Operational Workspace from the Executive Workspace.

### Preparer Workspace

Audience: accountants, controllers, bookkeepers, and advisory teams.

Focus:

- Flux review
- Oversight review
- Accrual review
- Reserve review
- Commentary approval
- Validation
- Package preparation

### Executive Workspace

Audience: owners, executives, boards, leadership teams, and Virtual CFO clients.

Focus:

- Automatically received packages
- Executive summaries
- KPIs
- Forecasts
- Liquidity
- Strategic commentary
- AI executive guidance
- Operational visibility
- Ongoing financial review

The Executive Workspace should become the executive-facing intelligence portal. It should feel executive-grade, strategic, premium, and advisory-focused.

## Continuous KPI, Forecast, And Alert Intelligence

Advisacor should support continuous dashboard refresh for KPIs, liquidity, forecasts, staffing trends, reserves, inventory intelligence, and operational performance.

Create an Executive Alert system using review-oriented language only. Alerts include:

- Liquidity deterioration
- Reserve exposure increase
- Staffing scalability concerns
- Operational margin pressure
- Inventory reserve concerns
- Unusual treasury activity
- Forecasting deterioration

## Delivery Infrastructure

Architect background processing infrastructure for:

- Async PDF generation
- Async PowerPoint generation
- Async AI review
- Async forecasting
- Async executive delivery

The frontend should never freeze during processing. Package generation and executive delivery should be queued, observable, and resilient.

## Advisacor Copilot

Advisacor Copilot should remain available throughout the platform and outside package generation as an ongoing financial intelligence assistant.

Copilot automatically adapts based on:

- Package tier
- Workflow step
- Selected item
- Enabled capabilities

Remove role selectors, CFO view selectors, and visible AI architecture wording. Show a maximum of three contextual quick actions.

## Advisacor Executive AI Assistant

Virtual CFO users should be able to ask:

- Why did margins decline?
- What risks stand out?
- How much cash runway remains?
- Can we support additional hiring?
- What should leadership focus on?
- How are we trending against budget?
- What operational concerns exist?
- What should ownership discuss?

The assistant should feel strategic, conversational, CFO-oriented, and executive-level. It should remain package-scoped and use review-oriented language.

## Flux Review Workspace

Flux is an internal preparer review workspace and occurs before PDF and PowerPoint generation.

Allow preparers to:

- Review variances
- Mark items reviewed
- Add preparer notes
- Add client-facing commentary
- Include or exclude items from deliverables
- Flag management discussion items

Internal notes never export automatically.

## Deliverables

Advisacor PDFs and PowerPoints should feel board-ready, executive-level, consulting-grade, premium advisory quality, modern fintech, and fractional CFO-quality.

Deliverables should visually communicate financial intelligence, operational insight, executive visibility, strategic guidance, and modern advisory workflows.

PowerPoint should follow real fractional CFO board deck structure.

### Essential Deck

1. Executive Summary
2. Business Performance Dashboard
3. Financial Performance
4. Payroll & FTE Review
5. AR/AP & Reserve Review
6. Risks & Challenges
7. Forward Plan & Ask

### Professional Deck

1. Executive Summary
2. Business Performance Dashboard
3. Financial Performance
4. Key Metrics & KPIs
5. Cash Position & Working Capital
6. Operational Review
7. Inventory & Liquidity Review
8. Team & Organization
9. Risks & Challenges
10. Forward Plan & Ask

### Virtual CFO Deck

1. Executive Summary
2. Business Performance Dashboard
3. Financial Performance
4. Key Metrics & KPIs
5. Cash Position & Runway
6. Budget vs Actual Review
7. Forecast & Liquidity Outlook
8. Team & Organization
9. Financial Oversight Review
10. Risks & Challenges
11. Board Discussion Topics
12. Forward Plan & Executive Recommendations

## Virtual CFO Budgeting And Forecasting

Virtual CFO includes:

- Budget builder
- Budget vs actual
- Cash forecasting
- Liquidity forecasting
- Payroll/FTE forecasting
- Revenue forecasting

Budgets should mirror actual GL structure and financial statements. Allow summary-level budgeting, account-level budgeting, and mixed-mode budgeting.

Cash forecasting includes:

- Projected cash
- AR expected collections
- AP expected payments
- Payroll timing
- Debt timing
- Liquidity forecasting

Prepare future architecture for 13-week cash forecasting.

## Financial Oversight Review

Virtual CFO only.

Purpose:

- Controller/CFO review intelligence
- Close-quality review
- Oversight intelligence
- Anomaly review

This is review-oriented intelligence, not audit software or fraud detection software.

Oversight areas:

- Vendor oversight: new vendors, unusual vendor activity, recurring late accrual vendors, vendor concentration review
- Customer oversight: new customers, concentration shifts, unusual customer activity, large credit/debit memos, unapplied AR credits
- Journal entry oversight: large manual JEs, standard deviation analysis, unusual posting patterns, round-dollar entries, period-end spikes
- Treasury review: bank account sprawl, treasury structure recommendations, stale reconciling items, check sequence review, uncleared checks, reconciliation review
- AP accrual intelligence: invoice date vs entry date, recurring late-entered vendors, cutoff patterns, stale accrued liabilities, uncleared accrual balances, liability buildup, accrual reversals, AP clearing
- Unrecorded Liability / AP Cutoff Intelligence: AP cutoff review, recurring late vendor invoices, recurring accrual needs, liability timing quality, and close-quality intelligence
- Reserve intelligence: reserve adequacy, historical write-offs, collection patterns, aging-bucket reserve review, reserve trend analysis
- AR quality review: unapplied customer credits, large negative AR balances, stale credits, classification review items
- Revenue recognition intelligence: deferred revenue balances, anticipated recognition timing, future revenue recognition schedules, unbilled AR growth, billing cadence, revenue timing

### Unrecorded Liability / AP Cutoff Intelligence

Virtual CFO includes a dedicated preparer-facing AP cutoff intelligence engine inside Financial Oversight Review.

Purpose:

- Identify invoices dated in a prior reporting period but entered or posted in a subsequent reporting period
- Support review of potential unrecorded liabilities
- Surface recurring cutoff timing issues
- Identify recurring vendor accrual candidates
- Improve close-quality review before client packages are finalized

Primary logic compares:

- Invoice date
- Entry/post date
- Reporting period end date
- AP posting timing

Review windows should be configurable, with default examples of 5, 10, and 15 days after close. The system reviews invoices entered within those windows that contain prior-period invoice dates.

Recurring vendor review should identify vendors consistently entered after close, vendors tied to cutoff timing differences, vendors repeatedly requiring accrual consideration, and recurring AP timing patterns. Common examples include utilities, contractors, recurring service vendors, freight, payroll-related vendors, software vendors, and insurance vendors.

Suggested accrual estimation should calculate historical recurring vendor timing behavior, including average recurring late invoice amount, average post-close vendor activity, and recurring month-end accrual exposure.

Recurring Vendor Accrual Risk scoring should consider:

- Frequency of late entry
- Average invoice size
- Consistency of timing
- Operational significance
- Recurring monthly behavior

Statuses:

- Low
- Moderate
- Elevated
- High

Language rules:

- Do not say "you missed an accrual"
- Do not say "financials are misstated"
- Do not say "this is incorrect"
- Use "consider whether"
- Use "review recurring timing"
- Use "potential cutoff timing issue"
- Use "may warrant accrual review"

Backend AI review should evaluate whether recurring expenses disappeared unexpectedly, recurring vendor activity appears delayed, AP balances appear understated relative to historical timing, and accruals appear stale or uncleared.

Accrual clearing review should monitor accrued liability balances, reversals, AP clearing, stale accrual balances, recurring uncleared liabilities, and recurring credit balances. Flag balances that remain stagnant, repeatedly grow, or do not appear to reverse properly.

Future architecture should prepare for recurring accrual automation suggestions, AI-assisted JE recommendations, vendor-specific accrual templates, historical accrual trend analysis, accrual forecasting, and monthly close-quality scoring.

## Fixed Asset Intelligence

Virtual CFO adds a fixed asset intelligence layer:

- Fixed asset rollforward schedules
- CIP monitoring
- Depreciation relationship review
- NBV review
- Stale fixed asset balances
- Asset additions/disposals
- Accumulated depreciation relationship checks
- CIP accounts with no movement
- Fixed assets without matching accumulated depreciation accounts
- Stagnant asset balances

## Manufacturing Intelligence

Virtual CFO adds manufacturing intelligence:

- PPV review
- Manufacturing variance review
- BOM variance review
- Bill of labor variance review
- Inventory adjustment monitoring
- Cycle count review
- Job profitability review
- Labor efficiency review
- Operational manufacturing commentary

## Backend AI QA And Validation

Create backend-only AI-assisted package QA and commentary validation. This remains mostly invisible to users.

First use deterministic validation:

- Formulas
- Tie-outs
- Reconciliations
- Variance direction
- Reserve math
- KPI math

Then use AI review:

- Commentary alignment
- Operational plausibility
- Accounting consistency
- Relationship review

Examples:

- Validate increase/decrease wording
- Validate payroll to FTE commentary
- Validate reserve commentary
- Validate inventory commentary
- Identify recurring missing activity
- Identify potential accrual review items

Use review-oriented language only.

## Executive Summary

Executive summaries should explain the main drivers of net income movement, including revenue growth, margin compression, payroll changes, inventory changes, operational leverage, and reserve impact.

Commentary should tie directly to approved flux analysis.

## Internal Versus Client Content

Internal review content:

- Oversight review
- Unresolved variances
- Review notes
- Validation warnings

Client-facing content:

- Approved commentary
- Executive summaries
- Strategic recommendations
- Polished board-ready insights

Internal content should not export automatically.

## Long-Term Direction

Advisacor's long-term roadmap is an AI-assisted accounting operations platform with human approval workflows.

Potential future direction:

- Invoice ingestion
- OCR/AP automation
- Suggested accounting entries
- Suggested accruals
- AI-assisted reconciliations
- Workflow approvals
- Semi-autonomous accounting operations

## Final Positioning

Advisacor is becoming:

- AI-assisted advisory infrastructure
- AI-assisted financial intelligence platform
- Preparer intelligence system
- Executive reporting infrastructure
- Financial oversight intelligence platform
- Outsourced CFO operating system
- Continuous executive intelligence delivery platform
- Advisory workflow infrastructure

The software should help firms scale advisory, improve close-quality review, improve financial oversight, standardize executive reporting, improve operational intelligence, deliver board-ready financial insight, and create trustworthy AI-assisted financial workflows.
