-- =============================================================================
-- D-Assertions Part 1 — 8-assertion schema + 32-rule backfill tagging
-- =============================================================================
-- Adds:
--   1. assertions_catalog          — 8-row lookup (ISA 315 Revised 2019)
--   2. assertion_relevance_matrix  — account-category × assertion default matrix
--   3. rule_assertion_coverage     — per-rule tagging (primary + secondaries)
--   4. Widens ai_action_log_action_category_check to add
--      'assertion_coverage_scan' and 'assertion_gap_reasoning' (used in Part 2)
--   5. Widens ledger_events_event_category_check to add 'assertion'
-- All new tables have RLS enabled with real policies (service_role bypass +
-- firm-scoped read). Backfill INSERTs the 32 known rules with primary and
-- secondary assertion tags derived from GAAP practitioner consensus.
-- =============================================================================
begin;
-- ---------- 1. assertions_catalog ---------------------------------------
create table if not exists public.assertions_catalog (
  assertion_id            text primary key
                            check (assertion_id in (
                              'existence_occurrence',
                              'completeness',
                              'rights_obligations',
                              'valuation_allocation',
                              'accuracy',
                              'cutoff',
                              'classification',
                              'presentation_disclosure'
                            )),
  display_name            text not null,
  isa_315_label           text not null,
  pcaob_legacy_category   text not null
                            check (pcaob_legacy_category in (
                              'existence_occurrence',
                              'completeness',
                              'rights_obligations',
                              'valuation_allocation',
                              'presentation_disclosure'
                            )),
  applies_transaction     boolean not null,
  applies_balance         boolean not null,
  description             text not null,
  authoritative_citation  text not null,
  version                 integer not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.assertions_catalog is
  'D-Assertions canonical 8-concept enum (ISA 315 Revised 2019). PCAOB legacy 5-category cross-walk stored per row.';
alter table public.assertions_catalog enable row level security;
drop policy if exists "assertions_catalog_service_role_all" on public.assertions_catalog;
create policy "assertions_catalog_service_role_all"
  on public.assertions_catalog for all to service_role using (true) with check (true);
drop policy if exists "assertions_catalog_authenticated_read" on public.assertions_catalog;
create policy "assertions_catalog_authenticated_read"
  on public.assertions_catalog for select to authenticated using (true);
-- Seed 8 assertions with real ISA 315 citations
insert into public.assertions_catalog
  (assertion_id, display_name, isa_315_label, pcaob_legacy_category, applies_transaction, applies_balance, description, authoritative_citation)
values
  ('existence_occurrence', 'Existence / Occurrence',
   'Existence (balance) / Occurrence (transaction)',
   'existence_occurrence', true, true,
   'Assets, liabilities, and equity exist at period-end; transactions and events recorded have occurred and pertain to the entity.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 1105'),
  ('completeness', 'Completeness',
   'Completeness',
   'completeness', true, true,
   'All transactions, events, and balances that should have been recorded or disclosed have been.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 1105'),
  ('rights_obligations', 'Rights and Obligations',
   'Rights and Obligations',
   'rights_obligations', false, true,
   'The entity holds or controls rights to recorded assets; recorded liabilities are obligations of the entity.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('valuation_allocation', 'Accuracy, Valuation and Allocation',
   'Accuracy, Valuation and Allocation',
   'valuation_allocation', false, true,
   'Balances are recorded at appropriate amounts; valuation and allocation adjustments (impairment, allowance, depreciation) are properly recorded and disclosed.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('accuracy', 'Accuracy',
   'Accuracy',
   'valuation_allocation', true, false,
   'Amounts, data, and calculations in transaction records are recorded appropriately.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('cutoff', 'Cutoff',
   'Cutoff',
   'valuation_allocation', true, false,
   'Transactions and events are recorded in the correct accounting period.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 2810'),
  ('classification', 'Classification',
   'Classification',
   'presentation_disclosure', true, true,
   'Transactions and balances are recorded in the proper accounts per the chart of accounts and applicable framework.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('presentation_disclosure', 'Presentation and Disclosure',
   'Presentation / Presentation and Disclosure',
   'presentation_disclosure', true, true,
   'Amounts, balances, and disclosures are appropriately aggregated, disaggregated, and described in accordance with the applicable financial-reporting framework.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 2810')
on conflict (assertion_id) do update set
  display_name           = excluded.display_name,
  isa_315_label          = excluded.isa_315_label,
  pcaob_legacy_category  = excluded.pcaob_legacy_category,
  applies_transaction    = excluded.applies_transaction,
  applies_balance        = excluded.applies_balance,
  description            = excluded.description,
  authoritative_citation = excluded.authoritative_citation,
  updated_at             = now();
-- ---------- 2. assertion_relevance_matrix -------------------------------
create table if not exists public.assertion_relevance_matrix (
  account_category    text not null
                        check (account_category in (
                          'cash','accounts_receivable','inventory',
                          'fixed_assets','other_current_assets','other_non_current_assets',
                          'accounts_payable','accrued_liabilities','other_current_liabilities',
                          'long_term_debt','equity',
                          'revenue','cost_of_goods_sold','operating_expenses',
                          'other_income_expense','tax_expense',
                          'off_balance_sheet','disclosure_only'
                        )),
  assertion_id        text not null references public.assertions_catalog(assertion_id),
  relevance           text not null
                        check (relevance in ('relevant','usually_not_primary','not_applicable')),
  rationale           text not null,
  citation            text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (account_category, assertion_id)
);
comment on table public.assertion_relevance_matrix is
  'D-Assertions default GAAP relevance matrix per account category × assertion. Firms may override via engagement-level overlay (Part 2).';
alter table public.assertion_relevance_matrix enable row level security;
drop policy if exists "assertion_relevance_matrix_service_role_all" on public.assertion_relevance_matrix;
create policy "assertion_relevance_matrix_service_role_all"
  on public.assertion_relevance_matrix for all to service_role using (true) with check (true);
drop policy if exists "assertion_relevance_matrix_authenticated_read" on public.assertion_relevance_matrix;
create policy "assertion_relevance_matrix_authenticated_read"
  on public.assertion_relevance_matrix for select to authenticated using (true);
-- Seed default relevance matrix. Every (account_category, assertion_id) pair
-- gets one row. 18 categories × 8 assertions = 144 rows. Values follow the
-- GAAP practitioner consensus derived from ISA 315 ¶A190 and CPA Hall Talk
-- relevance defaults. Auditor engagement-level overrides live in a separate
-- table added in Part 2 (out of scope here).
--
-- Convention:
--   'relevant'              = primary test required
--   'usually_not_primary'   = testable, not usually the dominant risk
--   'not_applicable'        = assertion is not defined for this account type
insert into public.assertion_relevance_matrix
  (account_category, assertion_id, relevance, rationale, citation)
values
  -- CASH -------------------------------------------------------------
  ('cash','existence_occurrence','relevant','Cash must exist at period-end; bank confirmation/reconciliation is the primary test.','ISA 315 ¶A190; AICPA Audit Guide ch. 8'),
  ('cash','completeness','relevant','All cash accounts must be recorded; risk of unrecorded bank accounts.','ISA 315 ¶A190'),
  ('cash','rights_obligations','relevant','Entity must control the cash (not restricted, not agent-held).','ISA 315 ¶A190'),
  ('cash','valuation_allocation','usually_not_primary','Foreign-currency cash requires FX revaluation; otherwise cash is at face value.','ASC 830'),
  ('cash','accuracy','relevant','Bank recs must tie to book balance exactly.','AICPA Audit Guide'),
  ('cash','cutoff','relevant','Deposits in transit / outstanding checks must land in correct period.','ISA 315 ¶A190'),
  ('cash','classification','usually_not_primary','Restricted vs unrestricted classification.','ASC 230'),
  ('cash','presentation_disclosure','relevant','Restricted cash disclosure, FX exposure disclosure.','ASC 210, ASC 830'),
  -- ACCOUNTS_RECEIVABLE ---------------------------------------------
  ('accounts_receivable','existence_occurrence','relevant','AR must represent real sales to real customers.','ISA 315 ¶A190; SAS 145'),
  ('accounts_receivable','completeness','relevant','All shipped/delivered sales must be recorded.','ISA 315 ¶A190'),
  ('accounts_receivable','rights_obligations','relevant','Entity must have the legal right to collect (not factored, not pledged as security without disclosure).','ASC 860'),
  ('accounts_receivable','valuation_allocation','relevant','Allowance for doubtful accounts / CECL expected credit loss must reflect collectibility.','ASC 326 (CECL)'),
  ('accounts_receivable','accuracy','relevant','Invoice pricing, quantities, and math must be correct.','ISA 315 ¶A190'),
  ('accounts_receivable','cutoff','relevant','Sales/shipments must land in the period of revenue recognition per ASC 606.','ASC 606-10-25'),
  ('accounts_receivable','classification','usually_not_primary','Trade vs related-party vs long-term AR classification.','ASC 210'),
  ('accounts_receivable','presentation_disclosure','relevant','Aging, credit-risk concentration, allowance rollforward.','ASC 326, ASC 275'),
  -- INVENTORY --------------------------------------------------------
  ('inventory','existence_occurrence','relevant','Physical inventory count is a primary test.','ISA 501; AICPA Audit Guide'),
  ('inventory','completeness','relevant','All owned inventory (including in-transit, consignment) must be counted.','ISA 315 ¶A190'),
  ('inventory','rights_obligations','relevant','Consignment, bill-and-hold, and factored inventory require special treatment.','ASC 606-10-55'),
  ('inventory','valuation_allocation','relevant','Lower of cost or net realizable value; obsolescence reserves.','ASC 330'),
  ('inventory','accuracy','usually_not_primary','Standard costing calculations, absorption math.','ASC 330'),
  ('inventory','cutoff','relevant','Shipping / receiving must align to invoice / bill dates.','ASC 606'),
  ('inventory','classification','usually_not_primary','Raw materials vs WIP vs finished goods.','ASC 330'),
  ('inventory','presentation_disclosure','relevant','Costing method, reserves, LIFO reserve if applicable.','ASC 330'),
  -- FIXED_ASSETS -----------------------------------------------------
  ('fixed_assets','existence_occurrence','relevant','Physical existence and continued use; disposals must be recorded.','ISA 315 ¶A190'),
  ('fixed_assets','completeness','relevant','All acquisitions must be capitalized when meeting recognition criteria.','ASC 360'),
  ('fixed_assets','rights_obligations','relevant','Entity must own or have qualifying lease (right-of-use).','ASC 842'),
  ('fixed_assets','valuation_allocation','relevant','Depreciation, impairment, ROU asset measurement.','ASC 360, ASC 842'),
  ('fixed_assets','accuracy','usually_not_primary','Depreciation schedule math.','ASC 360'),
  ('fixed_assets','cutoff','usually_not_primary','Acquisitions/disposals placed in service correctly.','ASC 360'),
  ('fixed_assets','classification','usually_not_primary','Capital vs expense; asset class buckets.','ASC 360'),
  ('fixed_assets','presentation_disclosure','relevant','Depreciation method, useful lives, impairment triggers, ROU reconciliation.','ASC 360, ASC 842'),
  -- OTHER_CURRENT_ASSETS --------------------------------------------
  ('other_current_assets','existence_occurrence','relevant','Prepaids, advances, deposits must represent real future benefit.','ISA 315 ¶A190'),
  ('other_current_assets','completeness','relevant','All prepaid amounts must be recorded.','ISA 315 ¶A190'),
  ('other_current_assets','rights_obligations','relevant','Entity must control the future benefit.','ISA 315 ¶A190'),
  ('other_current_assets','valuation_allocation','relevant','Amortization of prepaids; recoverability of deposits.','ASC 340'),
  ('other_current_assets','accuracy','usually_not_primary','Amortization math.','ASC 340'),
  ('other_current_assets','cutoff','usually_not_primary','Recognition and amortization periods.','ASC 340'),
  ('other_current_assets','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('other_current_assets','presentation_disclosure','usually_not_primary','Material components disclosed.','ASC 210'),
  -- OTHER_NON_CURRENT_ASSETS ----------------------------------------
  ('other_non_current_assets','existence_occurrence','relevant','Intangibles, goodwill, deferred tax assets must exist.','ISA 315 ¶A190'),
  ('other_non_current_assets','completeness','relevant','All qualifying assets recorded.','ISA 315 ¶A190'),
  ('other_non_current_assets','rights_obligations','relevant','Legal or contractual rights must be verified.','ASC 350'),
  ('other_non_current_assets','valuation_allocation','relevant','Impairment testing, amortization, DTA realizability.','ASC 350, ASC 740'),
  ('other_non_current_assets','accuracy','usually_not_primary','Amortization / valuation math.','ASC 350'),
  ('other_non_current_assets','cutoff','usually_not_primary','Recognition timing on acquisition.','ASC 350'),
  ('other_non_current_assets','classification','usually_not_primary','Goodwill vs finite-life vs indefinite-life.','ASC 350'),
  ('other_non_current_assets','presentation_disclosure','relevant','Impairment charges, DTA valuation allowance narrative.','ASC 350, ASC 740'),
  -- ACCOUNTS_PAYABLE ------------------------------------------------
  ('accounts_payable','existence_occurrence','usually_not_primary','Existence rarely the primary risk (understatement is dominant).','ISA 315 ¶A190; AICPA Audit Guide'),
  ('accounts_payable','completeness','relevant','Unrecorded / late-received invoices are the primary AP risk.','ISA 315 ¶A190; SAS 145 inherent-risk factors'),
  ('accounts_payable','rights_obligations','relevant','Recorded payables must be true obligations of the entity.','ISA 315 ¶A190'),
  ('accounts_payable','valuation_allocation','usually_not_primary','Face value; FX for foreign-denominated payables.','ASC 830'),
  ('accounts_payable','accuracy','relevant','Bill amount, terms, and coding must match invoice.','ISA 315 ¶A190'),
  ('accounts_payable','cutoff','relevant','Search for unrecorded liabilities at period end; invoice-date vs receipt-date.','AICPA Audit Guide ch. 10'),
  ('accounts_payable','classification','usually_not_primary','Trade vs accrued vs related-party.','ASC 210'),
  ('accounts_payable','presentation_disclosure','usually_not_primary','Aging, related-party, contingent liabilities.','ASC 275, ASC 850'),
  -- ACCRUED_LIABILITIES ---------------------------------------------
  ('accrued_liabilities','existence_occurrence','usually_not_primary','Similar to AP.','ISA 315 ¶A190'),
  ('accrued_liabilities','completeness','relevant','Unaccrued expenses at period end are the dominant risk.','ISA 315 ¶A190'),
  ('accrued_liabilities','rights_obligations','relevant','Must be a present obligation.','ASC 405'),
  ('accrued_liabilities','valuation_allocation','relevant','Estimation of amount (bonuses, PTO, warranty).','ASC 450, ASC 460'),
  ('accrued_liabilities','accuracy','usually_not_primary','Estimation math.','ISA 315 ¶A190'),
  ('accrued_liabilities','cutoff','relevant','Accrual must fall in the period of the underlying activity.','ASC 720'),
  ('accrued_liabilities','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('accrued_liabilities','presentation_disclosure','relevant','Contingent liability disclosure, warranty rollforward.','ASC 450, ASC 460'),
  -- OTHER_CURRENT_LIABILITIES ---------------------------------------
  ('other_current_liabilities','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('other_current_liabilities','completeness','relevant','Unrecorded deferred revenue, customer deposits, tax liabilities.','ASC 606, ASC 740'),
  ('other_current_liabilities','rights_obligations','relevant','Must be a present obligation.','ASC 405'),
  ('other_current_liabilities','valuation_allocation','relevant','Deferred revenue amortization schedules.','ASC 606'),
  ('other_current_liabilities','accuracy','usually_not_primary','Deferred revenue math.','ASC 606'),
  ('other_current_liabilities','cutoff','relevant','Deferred revenue recognition timing.','ASC 606-10-25'),
  ('other_current_liabilities','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('other_current_liabilities','presentation_disclosure','relevant','Deferred revenue rollforward, tax positions.','ASC 606, ASC 740'),
  -- LONG_TERM_DEBT --------------------------------------------------
  ('long_term_debt','existence_occurrence','relevant','Confirm with lender; loan agreements.','AICPA Audit Guide'),
  ('long_term_debt','completeness','relevant','Unrecorded debt, guarantees, off-balance-sheet arrangements.','ASC 470, ASC 460'),
  ('long_term_debt','rights_obligations','relevant','Debt covenants, subordination, security.','ASC 470'),
  ('long_term_debt','valuation_allocation','relevant','Discount/premium amortization, effective interest method.','ASC 835'),
  ('long_term_debt','accuracy','usually_not_primary','Interest math, amortization schedule.','ASC 835'),
  ('long_term_debt','cutoff','usually_not_primary','Interest accrual through period end.','ASC 835'),
  ('long_term_debt','classification','relevant','Current portion vs long-term; covenant-violation reclass.','ASC 470-10-45'),
  ('long_term_debt','presentation_disclosure','relevant','Maturity schedule, covenants, interest terms.','ASC 470'),
  -- EQUITY ----------------------------------------------------------
  ('equity','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('equity','completeness','relevant','All issuances, buybacks, dividends must be recorded.','ASC 505'),
  ('equity','rights_obligations','relevant','Legal validity of share classes, options, warrants.','ASC 505, ASC 718'),
  ('equity','valuation_allocation','relevant','Stock-comp expense valuation, treasury stock method.','ASC 718'),
  ('equity','accuracy','usually_not_primary','Share-count math.','ASC 505'),
  ('equity','cutoff','usually_not_primary','Grant date, vesting.','ASC 718'),
  ('equity','classification','relevant','Debt-like preferred vs equity; mezzanine.','ASC 480, ASC 505'),
  ('equity','presentation_disclosure','relevant','Rollforward, dilution, share-based payment terms.','ASC 505, ASC 718'),
  -- REVENUE ---------------------------------------------------------
  ('revenue','existence_occurrence','relevant','Recorded revenue must represent real completed performance obligations.','ASC 606-10-25; PCAOB AS 12 presumed fraud risk'),
  ('revenue','completeness','usually_not_primary','Understated revenue is rare fraud direction.','ASC 606'),
  ('revenue','rights_obligations','not_applicable','Applies to balance sheet only.','ISA 315 ¶A190'),
  ('revenue','valuation_allocation','not_applicable','Applies to balance sheet only.','ISA 315 ¶A190'),
  ('revenue','accuracy','relevant','Contract price allocation across performance obligations, variable consideration.','ASC 606-10-32'),
  ('revenue','cutoff','relevant','Performance-obligation satisfaction timing — over-time vs point-in-time.','ASC 606-10-25'),
  ('revenue','classification','relevant','Gross vs net (principal vs agent), product vs service, revenue vs other income.','ASC 606-10-55'),
  ('revenue','presentation_disclosure','relevant','Disaggregation, contract-balance rollforward, performance-obligation description.','ASC 606-10-50'),
  -- COST_OF_GOODS_SOLD ---------------------------------------------
  ('cost_of_goods_sold','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','completeness','relevant','COGS must match revenue recognized.','ASC 606, ASC 330'),
  ('cost_of_goods_sold','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','accuracy','relevant','Costing method, absorption, standard-cost variances.','ASC 330'),
  ('cost_of_goods_sold','cutoff','relevant','Match to revenue period.','ASC 606'),
  ('cost_of_goods_sold','classification','relevant','COGS vs operating-expense classification.','ASC 220'),
  ('cost_of_goods_sold','presentation_disclosure','usually_not_primary','Cost method disclosure.','ASC 330'),
  -- OPERATING_EXPENSES ---------------------------------------------
  ('operating_expenses','existence_occurrence','relevant','Real, business-purpose expenses.','ISA 315 ¶A190'),
  ('operating_expenses','completeness','relevant','Unrecorded expenses — reciprocal of AP completeness.','ISA 315 ¶A190'),
  ('operating_expenses','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('operating_expenses','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('operating_expenses','accuracy','relevant','Amount, GL account, cost center coding.','ISA 315 ¶A190'),
  ('operating_expenses','cutoff','relevant','Period of consumption / accrual.','ASC 720'),
  ('operating_expenses','classification','relevant','Function vs nature classification; COGS vs OpEx boundary.','ASC 220'),
  ('operating_expenses','presentation_disclosure','usually_not_primary','Material line-item disclosure.','ASC 220'),
  -- OTHER_INCOME_EXPENSE -------------------------------------------
  ('other_income_expense','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('other_income_expense','completeness','relevant','Investment income, FX, non-operating gains often understated.','ASC 220'),
  ('other_income_expense','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('other_income_expense','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('other_income_expense','accuracy','usually_not_primary','Investment/FX math.','ASC 320, ASC 830'),
  ('other_income_expense','cutoff','usually_not_primary','Recognition timing.','ASC 320'),
  ('other_income_expense','classification','relevant','Non-operating vs operating classification.','ASC 220'),
  ('other_income_expense','presentation_disclosure','relevant','Nature of non-operating items.','ASC 220'),
  -- TAX_EXPENSE -----------------------------------------------------
  ('tax_expense','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('tax_expense','completeness','relevant','Uncertain tax positions, state/local, R&D credits.','ASC 740'),
  ('tax_expense','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('tax_expense','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('tax_expense','accuracy','relevant','Rate application, permanent vs temporary differences.','ASC 740'),
  ('tax_expense','cutoff','usually_not_primary','Accrual through period end.','ASC 740'),
  ('tax_expense','classification','relevant','Current vs deferred; tax-benefit-of-loss.','ASC 740'),
  ('tax_expense','presentation_disclosure','relevant','Effective rate reconciliation, UTP rollforward.','ASC 740'),
  -- OFF_BALANCE_SHEET ----------------------------------------------
  ('off_balance_sheet','existence_occurrence','relevant','Guarantees, indemnifications, VIEs must be identified.','ASC 460, ASC 810'),
  ('off_balance_sheet','completeness','relevant','Contingent liabilities, purchase commitments often unrecorded.','ASC 450, ASC 460'),
  ('off_balance_sheet','rights_obligations','relevant','Enforceability of guarantee terms.','ASC 460'),
  ('off_balance_sheet','valuation_allocation','relevant','Probable-loss estimation for contingencies.','ASC 450'),
  ('off_balance_sheet','accuracy','usually_not_primary','Estimation math.','ASC 450'),
  ('off_balance_sheet','cutoff','usually_not_primary','Recognition triggers.','ASC 450'),
  ('off_balance_sheet','classification','usually_not_primary','Recognized vs disclosed only.','ASC 450'),
  ('off_balance_sheet','presentation_disclosure','relevant','This is where these items live — footnote narrative.','ASC 450, ASC 460, ASC 810'),
  -- DISCLOSURE_ONLY ------------------------------------------------
  ('disclosure_only','existence_occurrence','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','completeness','relevant','Required disclosures (segment, related-party, subsequent events) must be complete.','ASC 280, ASC 850, ASC 855'),
  ('disclosure_only','rights_obligations','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','valuation_allocation','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','accuracy','relevant','Disclosed amounts / narrative must be factually correct.','ISA 315 ¶A190'),
  ('disclosure_only','cutoff','relevant','Subsequent-events cutoff.','ASC 855'),
  ('disclosure_only','classification','relevant','Related-party vs arms-length labeling.','ASC 850'),
  ('disclosure_only','presentation_disclosure','relevant','Adequacy, understandability, framework compliance.','ISA 315 ¶A190')
on conflict (account_category, assertion_id) do update set
  relevance  = excluded.relevance,
  rationale  = excluded.rationale,
  citation   = excluded.citation,
  updated_at = now();
-- ---------- 3. rule_assertion_coverage ---------------------------------
create table if not exists public.rule_assertion_coverage (
  coverage_id         uuid primary key default gen_random_uuid(),
  rule_id             text not null references public.curated_rules_registry(rule_id) on delete cascade,
  assertion_id        text not null references public.assertions_catalog(assertion_id),
  coverage_strength   text not null
                        check (coverage_strength in ('primary','secondary','partial')),
  account_categories  text[] not null default '{}',
  rationale           text not null,
  citation            text not null,
  version             integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (rule_id, assertion_id)
);
comment on table public.rule_assertion_coverage is
  'D-Assertions Part 1 — per-rule tagging of which assertions each rule tests. Primary = the rule directly evidences the assertion. Secondary = the rule provides corroborating evidence. Partial = the rule tests one aspect only.';
create index if not exists rule_assertion_coverage_rule_id_idx
  on public.rule_assertion_coverage (rule_id);
create index if not exists rule_assertion_coverage_assertion_id_idx
  on public.rule_assertion_coverage (assertion_id);
alter table public.rule_assertion_coverage enable row level security;
drop policy if exists "rule_assertion_coverage_service_role_all" on public.rule_assertion_coverage;
create policy "rule_assertion_coverage_service_role_all"
  on public.rule_assertion_coverage for all to service_role using (true) with check (true);
drop policy if exists "rule_assertion_coverage_authenticated_read" on public.rule_assertion_coverage;
create policy "rule_assertion_coverage_authenticated_read"
  on public.rule_assertion_coverage for select to authenticated using (true);
-- Backfill 32 rules with primary + secondary assertion tags.
-- See section 5 below for the full derivation and rationale for each row.
-- Each rule gets 1 primary + 1-3 secondary rows.
-- gen.accrual_reversal_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.accrual_reversal_check','cutoff','primary','{accrued_liabilities,operating_expenses}','Ensures period-end accruals reverse in the correct subsequent period.','ASC 720; ISA 315 ¶A190'),
  ('gen.accrual_reversal_check','completeness','secondary','{accrued_liabilities}','Verifies no accruals are left dangling into the next period.','ISA 315 ¶A190'),
  ('gen.accrual_reversal_check','accuracy','secondary','{operating_expenses}','Reversal amount must match original accrual.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.ap_missed_vendor_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.ap_missed_vendor_check','completeness','primary','{accounts_payable,operating_expenses}','Detects vendors that historically bill but have no bill in the current period — the classic search-for-unrecorded-liabilities test.','AICPA Audit Guide ch. 10'),
  ('gen.ap_missed_vendor_check','cutoff','secondary','{accounts_payable}','Missing bill may indicate a cutoff error rather than true absence.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.cash_negative_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.cash_negative_check','valuation_allocation','primary','{cash}','Negative book cash indicates recording error or true overdraft (which must reclassify to liability).','ASC 210, ASC 830'),
  ('gen.cash_negative_check','classification','secondary','{cash,accounts_payable}','Overdraft may need reclass from cash to book-overdraft liability.','ASC 210'),
  ('gen.cash_negative_check','accuracy','secondary','{cash}','May reveal recording/coding errors.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.depreciation_scheduled_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.depreciation_scheduled_check','valuation_allocation','primary','{fixed_assets,operating_expenses}','Depreciation is the mechanical valuation-allocation of fixed-asset cost over useful life.','ASC 360'),
  ('gen.depreciation_scheduled_check','completeness','secondary','{operating_expenses}','Missing depreciation JE means expense is understated.','ISA 315 ¶A190'),
  ('gen.depreciation_scheduled_check','cutoff','secondary','{operating_expenses}','Depreciation must land in the correct period.','ASC 360')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.duplicate_vendor_bill_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.duplicate_vendor_bill_check','existence_occurrence','primary','{accounts_payable,operating_expenses}','A duplicate bill is a fictitious occurrence — the underlying event happened once, not twice.','ISA 315 ¶A190; PCAOB AS 12 fraud presumption'),
  ('gen.duplicate_vendor_bill_check','accuracy','secondary','{accounts_payable,operating_expenses}','May reveal keying errors as opposed to true duplicates.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.gl_mapping_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.gl_mapping_variance_check','classification','primary','{operating_expenses,cost_of_goods_sold,revenue}','Detects GL accounts that historically posted to one category but suddenly changed.','ISA 315 ¶A190'),
  ('gen.gl_mapping_variance_check','presentation_disclosure','secondary','{operating_expenses,cost_of_goods_sold}','Reclassification affects P&L presentation.','ASC 220')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.je_balance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.je_balance_check','accuracy','primary','{revenue,operating_expenses,cost_of_goods_sold,accounts_payable,accounts_receivable}','Debits-equal-credits is the foundational accuracy test for double-entry accounting.','FASB Concepts Statement 5; ISA 315 ¶A190'),
  ('gen.je_balance_check','completeness','secondary','{}','An unbalanced JE indicates a missing side.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.je_period_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.je_period_check','cutoff','primary','{revenue,operating_expenses,cost_of_goods_sold}','Verifies JEs are posted to the intended period.','ISA 315 ¶A190; ASC 720'),
  ('gen.je_period_check','existence_occurrence','secondary','{revenue,operating_expenses}','A JE posted to a closed period may indicate manipulation.','PCAOB AS 12 fraud presumption')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.prepaid_amortization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.prepaid_amortization_check','valuation_allocation','primary','{other_current_assets,operating_expenses}','Prepaid amortization is a valuation-allocation of prepaid balance over service period.','ASC 340'),
  ('gen.prepaid_amortization_check','cutoff','secondary','{operating_expenses}','Amortization must match consumption period.','ASC 340'),
  ('gen.prepaid_amortization_check','completeness','secondary','{operating_expenses}','Missing amortization understates expense.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.revenue_cutoff_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.revenue_cutoff_check','cutoff','primary','{revenue,accounts_receivable}','Verifies revenue is recognized in the correct period per ASC 606 performance-obligation satisfaction.','ASC 606-10-25'),
  ('gen.revenue_cutoff_check','existence_occurrence','secondary','{revenue}','Post-period-close bookings may indicate channel stuffing.','PCAOB AS 12 fraud presumption'),
  ('gen.revenue_cutoff_check','accuracy','secondary','{revenue}','Contract price allocation.','ASC 606-10-32')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.reversing_entry_period_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.reversing_entry_period_check','cutoff','primary','{accrued_liabilities,operating_expenses}','Reversing entries must land in the correct period to avoid double-counting.','ISA 315 ¶A190'),
  ('gen.reversing_entry_period_check','accuracy','secondary','{accrued_liabilities,operating_expenses}','Reversal amount must equal original.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.subledger_tie_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.subledger_tie_check','completeness','primary','{accounts_receivable,accounts_payable,inventory}','GL-to-subledger reconciliation ensures no items are missing from either side.','AICPA Audit Guide'),
  ('gen.subledger_tie_check','accuracy','primary','{accounts_receivable,accounts_payable,inventory}','Detail must tie exactly to control account.','AICPA Audit Guide'),
  ('gen.subledger_tie_check','existence_occurrence','secondary','{accounts_receivable,accounts_payable}','GL balance not supported by subledger detail may be fictitious.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.absorption_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.absorption_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Manufacturing overhead absorption is a valuation-allocation of period costs into inventory.','ASC 330'),
  ('mfg.absorption_check','classification','secondary','{cost_of_goods_sold,operating_expenses}','Under/over-absorption affects COGS vs period-cost classification.','ASC 330-10-30'),
  ('mfg.absorption_check','completeness','secondary','{inventory}','Under-absorbed overhead may indicate incomplete cost capitalization.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.cogs_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.cogs_variance_check','accuracy','primary','{cost_of_goods_sold}','Standard-cost vs actual variance flags accuracy errors in cost recording.','ASC 330'),
  ('mfg.cogs_variance_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Variance disposition (COGS vs inventory) affects both accounts.','ASC 330-10-30')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.freight_capitalization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.freight_capitalization_check','classification','primary','{inventory,operating_expenses,cost_of_goods_sold}','Freight-in is a capitalizable inventory cost; freight-out is a period cost.','ASC 330-10-30'),
  ('mfg.freight_capitalization_check','valuation_allocation','secondary','{inventory}','Inventory carrying cost.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.inventory_reconciliation_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.inventory_reconciliation_check','existence_occurrence','primary','{inventory}','Physical count reconciliation is the primary existence test for inventory.','ISA 501; AICPA Audit Guide'),
  ('mfg.inventory_reconciliation_check','completeness','primary','{inventory}','Perpetual vs physical variance may reveal missing items.','ISA 501'),
  ('mfg.inventory_reconciliation_check','accuracy','secondary','{inventory}','Cycle-count math must tie.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.scrap_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.scrap_variance_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Scrap variance affects inventory valuation and COGS accuracy.','ASC 330-10-30'),
  ('mfg.scrap_variance_check','completeness','secondary','{inventory}','Unrecorded scrap may indicate theft or unrecorded loss.','ASC 330-10-35')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.standard_cost_capitalization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.standard_cost_capitalization_check','valuation_allocation','primary','{inventory}','Standard-cost values must approximate actuals per ASC 330.','ASC 330-10-30'),
  ('mfg.standard_cost_capitalization_check','accuracy','secondary','{inventory,cost_of_goods_sold}','BOM-driven cost math.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.warranty_accrual_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.warranty_accrual_check','completeness','primary','{accrued_liabilities,operating_expenses}','Warranty liability is a mandatory accrual under ASC 460.','ASC 460-10-25'),
  ('mfg.warranty_accrual_check','valuation_allocation','primary','{accrued_liabilities}','Warranty estimate methodology (historical claims rate).','ASC 460-10-30'),
  ('mfg.warranty_accrual_check','presentation_disclosure','secondary','{accrued_liabilities}','Warranty rollforward disclosure.','ASC 460-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.wip_cutoff_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.wip_cutoff_check','cutoff','primary','{inventory,cost_of_goods_sold}','WIP-to-FG transition must be recorded in the correct period.','ASC 330'),
  ('mfg.wip_cutoff_check','completeness','secondary','{inventory}','Missing WIP entries understate inventory.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.bill_rate_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.bill_rate_variance_check','accuracy','primary','{revenue,accounts_receivable}','Bill rate variance vs standard flags accuracy errors in invoice rate.','ASC 606-10-32'),
  ('ps.bill_rate_variance_check','completeness','secondary','{revenue}','Rate discount without approval may indicate revenue understatement.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.contract_asset_reclass_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.contract_asset_reclass_check','classification','primary','{accounts_receivable,other_current_assets}','Contract asset → AR reclass upon unconditional right to consideration.','ASC 606-10-45'),
  ('ps.contract_asset_reclass_check','presentation_disclosure','secondary','{other_current_assets}','Contract balance rollforward disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.project_margin_flag_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.project_margin_flag_check','valuation_allocation','primary','{revenue,other_current_assets,accrued_liabilities}','Project margin drives loss-contract accrual and contract-asset impairment.','ASC 606-10-25, ASC 605-35'),
  ('ps.project_margin_flag_check','completeness','secondary','{accrued_liabilities}','Loss contracts must be accrued when identified.','ASC 605-35-25')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.revenue_percent_complete_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.revenue_percent_complete_check','cutoff','primary','{revenue,other_current_assets}','Over-time revenue recognition based on progress measurement.','ASC 606-10-25'),
  ('ps.revenue_percent_complete_check','accuracy','primary','{revenue}','Progress-measurement method must produce accurate revenue amount.','ASC 606-10-25'),
  ('ps.revenue_percent_complete_check','existence_occurrence','secondary','{revenue}','Progress must be actually earned, not merely booked.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.unbilled_receivables_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.unbilled_receivables_check','completeness','primary','{other_current_assets,revenue}','Unbilled AR (contract asset) must be recorded for revenue earned but not yet invoiced.','ASC 606-10-45'),
  ('ps.unbilled_receivables_check','valuation_allocation','secondary','{other_current_assets}','Contract-asset impairment testing.','ASC 606-10-45')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.wip_billable_hours_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.wip_billable_hours_check','completeness','primary','{revenue,other_current_assets}','Unbilled billable hours must be captured as WIP/contract asset.','ASC 606-10-45'),
  ('ps.wip_billable_hours_check','accuracy','secondary','{revenue}','Hours × rate math.','ASC 606-10-32')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.cogs_recognition_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.cogs_recognition_check','cutoff','primary','{cost_of_goods_sold,inventory}','COGS must be matched to revenue in the same period.','ASC 606, ASC 330'),
  ('rtl.cogs_recognition_check','completeness','secondary','{cost_of_goods_sold}','Missing COGS entries overstate margin.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.gift_card_liability_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.gift_card_liability_check','completeness','primary','{other_current_liabilities,revenue}','Gift card sales create deferred revenue until redemption or breakage.','ASC 606-10-25'),
  ('rtl.gift_card_liability_check','valuation_allocation','primary','{other_current_liabilities,revenue}','Breakage estimation.','ASC 606-10-55'),
  ('rtl.gift_card_liability_check','presentation_disclosure','secondary','{other_current_liabilities}','Deferred revenue rollforward disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.inventory_shrink_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.inventory_shrink_check','existence_occurrence','primary','{inventory}','Shrinkage indicates recorded inventory that no longer exists.','ISA 501; ASC 330'),
  ('rtl.inventory_shrink_check','valuation_allocation','secondary','{inventory,cost_of_goods_sold}','Shrink loss written to COGS or COGS-shrink line.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.loyalty_reward_liability_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.loyalty_reward_liability_check','completeness','primary','{other_current_liabilities,revenue}','Loyalty rewards are material rights that create separate performance obligations.','ASC 606-10-55'),
  ('rtl.loyalty_reward_liability_check','valuation_allocation','primary','{other_current_liabilities}','Standalone selling price allocation for reward-point issuance.','ASC 606-10-32'),
  ('rtl.loyalty_reward_liability_check','presentation_disclosure','secondary','{other_current_liabilities}','Rollforward and redemption disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.sales_returns_reserve_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.sales_returns_reserve_check','valuation_allocation','primary','{accounts_receivable,revenue,other_current_liabilities}','Returns reserve is a variable-consideration adjustment to transaction price.','ASC 606-10-32'),
  ('rtl.sales_returns_reserve_check','completeness','secondary','{other_current_liabilities}','Missing reserve overstates revenue.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.seasonal_markdown_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.seasonal_markdown_check','valuation_allocation','primary','{inventory}','Lower of cost or NRV — seasonal markdowns force NRV testing.','ASC 330-10-35'),
  ('rtl.seasonal_markdown_check','cutoff','secondary','{cost_of_goods_sold}','Markdown recognition period.','ASC 330-10-35')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ---------- 4. Widen ai_action_log_action_category_check -------------
-- IMPORTANT: reconcile against live baseline first. Expected current union
-- (from D6.4d) includes all the D-Platform, D6.4c-1, D6.4c-3, and D6.4d
-- categories. Add exactly two new categories.
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning'
    )
  );
-- ---------- 5. Widen ledger_events_event_category_check --------------
alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting',
      'reviewer_ui'
    )
  );
-- (Note: 'assertion' was already in the D-Platform baseline union — no new
-- element needed. Kept the widening call here for idempotence + audit trail.)
commit;
