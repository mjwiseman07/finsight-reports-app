-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010031
-- Proposed name: esc_application_schema_slice_2_of_5
-- Module: public_application_schema_slice_2
-- Provenance: Option D assembled app files (18) stripped of nested txn markers; RLS/privilege closed before COMMIT
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 secure multi-version split: slice 2/5
-- Source BEGIN/COMMIT stripped; exactly one outer transaction.
-- Files: 18; RLS closure tables: 0; fn dispositions: 9

-- >>> begin 20260706170000_d6_4c_3_posting_policy_and_remediation.sql
-- =============================================================================
-- D6.4c-3 — Approve-and-Post: Posting Policy + Remediation Support
-- =============================================================================
-- ADDITIVE ONLY except:
--   (a) replaces pre_close_review_items_immutable() to permit set-once
--       transition of post_block_reason.
--   (b) extends ai_action_log_action_category_check and
--       ledger_events_event_category_check for D6.4c-3 categories.
-- =============================================================================
-- [ESC] stripped source txn marker: begin;


-- ------------------------------------------------------------
-- 1. New table: engagement_posting_policy
-- ------------------------------------------------------------
create table if not exists public.engagement_posting_policy (
  engagement_id                     uuid primary key
                                    references public.engagements(id) on delete cascade,
  policy_code                       text        not null default 'advisacor_balanced',
  advisacor_preset                  text        null,
  auto_post_on_approved             boolean     not null default true,
  auto_post_on_edit_and_approved    boolean     not null default false,
  updated_by                        uuid        null,
  updated_at                        timestamptz not null default now(),
  created_at                        timestamptz not null default now(),
  constraint engagement_posting_policy_preset_chk check (
    advisacor_preset is null or advisacor_preset in (
      'advisacor_conservative',
      'advisacor_balanced',
      'advisacor_aggressive'
    )
  )
);

comment on table public.engagement_posting_policy is
  'D6.4c-3: per-engagement posting policy. Hybrid: pin to an Advisacor preset OR set flags manually.';

comment on column public.engagement_posting_policy.policy_code is
  'Free-text label for humans. When a preset is pinned, this equals the preset code.';

comment on column public.engagement_posting_policy.advisacor_preset is
  'When non-null, flags below must match the preset definition (enforced by trigger).';

-- ------------------------------------------------------------
-- 2. Preset consistency trigger
-- ------------------------------------------------------------
create or replace function public.engagement_posting_policy_preset_consistency()
returns trigger language plpgsql as $$
begin
  if new.advisacor_preset is null then
    return new;
  end if;
  if new.advisacor_preset = 'advisacor_conservative' then
    if new.auto_post_on_approved is distinct from false
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_conservative requires both auto_post flags = false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_balanced' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_balanced requires auto_post_on_approved=true, auto_post_on_edit_and_approved=false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_aggressive' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from true then
      raise exception 'advisacor_aggressive requires both auto_post flags = true (engagement=%)', new.engagement_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists engagement_posting_policy_preset_consistency_trg
  on public.engagement_posting_policy;
create trigger engagement_posting_policy_preset_consistency_trg
  before insert or update on public.engagement_posting_policy
  for each row execute function public.engagement_posting_policy_preset_consistency();

-- ------------------------------------------------------------
-- 3. Backfill: seed advisacor_balanced for every existing engagement
-- ------------------------------------------------------------
insert into public.engagement_posting_policy (
  engagement_id, policy_code, advisacor_preset,
  auto_post_on_approved, auto_post_on_edit_and_approved
)
select
  e.id,
  'advisacor_balanced',
  'advisacor_balanced',
  true,
  false
from public.engagements e
where not exists (
  select 1 from public.engagement_posting_policy p where p.engagement_id = e.id
);

-- ------------------------------------------------------------
-- 4. New column on pre_close_review_items: post_block_reason
-- ------------------------------------------------------------
alter table public.pre_close_review_items
  add column if not exists post_block_reason text null;

comment on column public.pre_close_review_items.post_block_reason is
  'D6.4c-3: machine-readable reason the remediation pipeline blocked posting. Set-once (null -> value).';

-- ------------------------------------------------------------
-- 5. Extend immutability trigger to allow set-once for post_block_reason
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.id                          is distinct from old.id                          or
    new.fire_id                     is distinct from old.fire_id                     or
    new.firm_client_id              is distinct from old.firm_client_id              or
    new.engagement_id               is distinct from old.engagement_id               or
    new.close_period_id             is distinct from old.close_period_id             or
    new.rule_id                     is distinct from old.rule_id                     or
    new.rule_version                is distinct from old.rule_version                or
    new.accounting_method           is distinct from old.accounting_method           or
    new.je_draft                    is distinct from old.je_draft                    or
    new.je_draft_total_debit_cents  is distinct from old.je_draft_total_debit_cents  or
    new.je_draft_total_credit_cents is distinct from old.je_draft_total_credit_cents or
    new.je_draft_line_count         is distinct from old.je_draft_line_count         or
    new.assertion_tags              is distinct from old.assertion_tags              or
    new.rule_reason_code            is distinct from old.rule_reason_code            or
    new.rule_reason_detail          is distinct from old.rule_reason_detail          or
    new.severity                    is distinct from old.severity                    or
    new.evidence_refs               is distinct from old.evidence_refs               or
    new.basis_guard_reason_code     is distinct from old.basis_guard_reason_code     or
    new.basis_guard_reason_text     is distinct from old.basis_guard_reason_text     or
    new.created_at                  is distinct from old.created_at
  ) then
    raise exception 'pre_close_review_items row is immutable except decision-tail columns (id=%)', old.id;
  end if;
  if old.posted_je_attempt_id is not null and new.posted_je_attempt_id is distinct from old.posted_je_attempt_id then
    raise exception 'pre_close_review_items.posted_je_attempt_id is set-once (id=%)', old.id;
  end if;
  if old.post_block_reason is not null and new.post_block_reason is distinct from old.post_block_reason then
    raise exception 'pre_close_review_items.post_block_reason is set-once (id=%)', old.id;
  end if;
  if old.decision is not null and new.decision is distinct from old.decision then
    raise exception 'pre_close_review_items.decision is set-once (id=%)', old.id;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------
-- 6. Extend ai_action_log_action_category_check (reconciled union)
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation'
    )
  );

comment on constraint ai_action_log_action_category_check on public.ai_action_log is
  'D6.4c-3: widened to include posting_attempt, posting_blocked, posting_remediation (preserves D-Platform + D-Entitlements + D6.4c-1 categories).';

-- ------------------------------------------------------------
-- 7. Extend ledger_events_event_category_check for posting category
-- ------------------------------------------------------------
alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting'
    )
  );

comment on constraint ledger_events_event_category_check on public.ledger_events is
  'D6.4c-3: widened to include posting (approve-and-post outcomes).';

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260706170000_d6_4c_3_posting_policy_and_remediation.sql

-- >>> begin 20260707120000_d_assertions_part_1_schema_and_backfill.sql
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
-- [ESC] stripped source txn marker: begin;

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
-- [ESC] stripped source txn marker: commit;

-- <<< end 20260707120000_d_assertions_part_1_schema_and_backfill.sql

-- >>> begin 20260707130000_d_assertions_part_2_coverage_projection.sql
-- =============================================================================
-- D-Assertions Part 2 — close_assertion_coverage projection + gap reasoning
-- =============================================================================
-- Adds:
--   1. advisacor_flags                     — global feature-flag table (creates if missing)
--   2. assertion_gap_root_causes           — enum + descriptions (PCAOB QC 1000 pattern)
--   3. close_assertion_coverage            — per-close × account_category × assertion projection
--   4. close_assertion_coverage_events     — event-sourced audit trail
--   5. Widens ai_action_log_action_category_check (idempotent — Part 1 already added
--      'assertion_coverage_scan' and 'assertion_gap_reasoning')
--   6. Widens ledger_events_event_category_check (idempotent — 'assertion' already present)
--   7. Seeds root-cause taxonomy
--   8. Seeds default flag rows (assertions_gap_reasoning_enabled = false)
-- =============================================================================
-- [ESC] stripped source txn marker: begin;

-- ---------------------------------------------------------------------------
-- 1. advisacor_flags — global feature flags (create if not exists)
-- ---------------------------------------------------------------------------
create table if not exists public.advisacor_flags (
  flag_key      text primary key,
  flag_value    boolean not null default false,
  description   text not null,
  updated_at    timestamptz not null default now(),
  updated_by    text
);
comment on table public.advisacor_flags is
  'Global feature flags. Read via lib/flags. Do not add per-firm flags here — use client-level tables for that.';
alter table public.advisacor_flags enable row level security;
drop policy if exists "advisacor_flags_service_role_all" on public.advisacor_flags;
create policy "advisacor_flags_service_role_all"
  on public.advisacor_flags for all to service_role using (true) with check (true);
drop policy if exists "advisacor_flags_authenticated_read" on public.advisacor_flags;
create policy "advisacor_flags_authenticated_read"
  on public.advisacor_flags for select to authenticated using (true);
insert into public.advisacor_flags (flag_key, flag_value, description)
values
  ('assertions_gap_reasoning_enabled', false,
   'When true, close_assertion_coverage gap rows call the LLM gap reasoner. When false, gaps get deterministic status only. Flip to true after Bedrock model access is approved.'),
  ('assertions_projection_worker_enabled', true,
   'When true, POST /assertion-coverage/recompute actually runs the projection. Set to false to hard-disable while investigating a bad projection.')
on conflict (flag_key) do nothing;
-- ---------------------------------------------------------------------------
-- 2. assertion_gap_root_causes — enum-driven taxonomy
-- ---------------------------------------------------------------------------
create table if not exists public.assertion_gap_root_causes (
  root_cause_code    text primary key,
  display_name       text not null,
  description        text not null,
  pcaob_reference    text not null,
  version            integer not null default 1,
  created_at         timestamptz not null default now()
);
comment on table public.assertion_gap_root_causes is
  'Root cause taxonomy for assertion coverage gaps. Mirrors PCAOB QC 1000 root-cause-analysis pattern. LLM reasoner selects from this closed set.';
alter table public.assertion_gap_root_causes enable row level security;
drop policy if exists "assertion_gap_root_causes_service_role_all" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_service_role_all"
  on public.assertion_gap_root_causes for all to service_role using (true) with check (true);
drop policy if exists "assertion_gap_root_causes_authenticated_read" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_authenticated_read"
  on public.assertion_gap_root_causes for select to authenticated using (true);
insert into public.assertion_gap_root_causes
  (root_cause_code, display_name, description, pcaob_reference)
values
  ('no_rule_defined',
   'No rule defined for this assertion × account category',
   'The curated rule registry does not contain any rule that covers this account_category × assertion pair. This is a coverage design gap, not an execution gap.',
   'PCAOB QC 1000 §.15 (root cause: system design)'),
  ('rule_defined_but_not_fired',
   'Rule exists but did not fire this period',
   'A rule tagged with this assertion exists in the registry but produced no fires with outcome=fired for this close period. Possible causes: rule was suppressed, all instances were within threshold, or the underlying data pattern did not trigger.',
   'PCAOB QC 1000 §.15 (root cause: system operation)'),
  ('rule_fired_but_all_suppressed',
   'Rule fired but all fires were suppressed',
   'At least one fire exists but every fire has outcome=suppressed. Coverage is nominal, not substantive.',
   'PCAOB QC 1000 §.15 (root cause: threshold calibration)'),
  ('rule_errored',
   'Rule errored during execution',
   'The rule attempted to run but encountered an execution error. Coverage cannot be claimed until the rule executes successfully.',
   'PCAOB QC 1000 §.15 (root cause: system reliability)'),
  ('assertion_not_relevant',
   'Assertion is not relevant for this account category',
   'The relevance matrix marks this pair as not_applicable or usually_not_primary. No gap remediation needed.',
   'ISA 315 (Revised 2019) ¶A128'),
  ('coverage_partial_by_design',
   'Coverage is partial by design (secondary tag only)',
   'The only rules covering this pair tag the assertion as secondary. This is intentional partial coverage; upgrade the tag or add a primary-tagged rule to strengthen.',
   'ISA 330 ¶7'),
  ('manual_test_documented',
   'Coverage came from a documented manual test',
   'A reviewer attached a manual test workpaper reference. This is an accepted coverage path when automation is not feasible.',
   'PCAOB AS 2301 ¶08')
on conflict (root_cause_code) do nothing;
-- ---------------------------------------------------------------------------
-- 3. close_assertion_coverage — per-close × account_category × assertion projection
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage (
  coverage_id                     uuid primary key default gen_random_uuid(),
  firm_client_id                  uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id                 uuid not null references public.close_periods(id) on delete cascade,
  account_category                text not null
                                    check (account_category in (
                                      'cash','accounts_receivable','inventory','fixed_assets',
                                      'other_current_assets','other_non_current_assets',
                                      'accounts_payable','accrued_liabilities','other_current_liabilities',
                                      'long_term_debt','equity','revenue','cost_of_goods_sold',
                                      'operating_expenses','other_income_expense','tax_expense',
                                      'off_balance_sheet','disclosure_only'
                                    )),
  assertion_id                    text not null
                                    references public.assertions_catalog(assertion_id),
  relevance_at_computation        text not null
                                    check (relevance_at_computation in (
                                      'relevant','usually_not_primary','not_applicable'
                                    )),
  coverage_status                 text not null
                                    check (coverage_status in (
                                      'tested','partial','gap','not_applicable'
                                    )),
  covering_rule_ids               text[] not null default '{}',
  covering_fire_ids               uuid[] not null default '{}',
  evidence_strength               text not null default 'unassessed'
                                    check (evidence_strength in (
                                      'strong','moderate','weak','unassessed'
                                    )),
  data_source_reliability_basis   text,
  manual_test_ref                 text,
  gap_root_cause_code             text
                                    references public.assertion_gap_root_causes(root_cause_code),
  gap_reasoning_action_id         uuid
                                    references public.ai_action_log(action_id),
  gap_recommendation              text,
  computed_at                     timestamptz not null default now(),
  computed_by_worker_run_id       uuid,
  version                         integer not null default 1,
  updated_at                      timestamptz not null default now(),
  constraint close_assertion_coverage_unique
    unique (firm_client_id, close_period_id, account_category, assertion_id),
  constraint close_assertion_coverage_gap_needs_root_cause
    check (coverage_status <> 'gap' or gap_root_cause_code is not null)
);
comment on table public.close_assertion_coverage is
  'Projection: per-close × account_category × assertion coverage status. Recompute-safe (unique key). Gaps must carry a root_cause_code.';
create index if not exists close_assertion_coverage_by_close
  on public.close_assertion_coverage (firm_client_id, close_period_id);
create index if not exists close_assertion_coverage_gaps
  on public.close_assertion_coverage (firm_client_id, close_period_id)
  where coverage_status = 'gap';
alter table public.close_assertion_coverage enable row level security;
drop policy if exists "close_assertion_coverage_service_role_all" on public.close_assertion_coverage;
create policy "close_assertion_coverage_service_role_all"
  on public.close_assertion_coverage for all to service_role using (true) with check (true);
drop policy if exists "close_assertion_coverage_firm_read" on public.close_assertion_coverage;
create policy "close_assertion_coverage_firm_read"
  on public.close_assertion_coverage for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 4. close_assertion_coverage_events — event-sourced audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage_events (
  event_id                  uuid primary key default gen_random_uuid(),
  firm_client_id            uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id           uuid not null references public.close_periods(id) on delete cascade,
  worker_run_id             uuid not null,
  event_type                text not null
                              check (event_type in (
                                'projection_started',
                                'projection_completed',
                                'projection_failed',
                                'gap_detected',
                                'gap_reasoner_invoked',
                                'gap_reasoner_completed',
                                'gap_reasoner_skipped_flag_off',
                                'gap_reasoner_failed',
                                'manual_override_applied'
                              )),
  account_category          text,
  assertion_id              text,
  payload                   jsonb not null default '{}'::jsonb,
  actor_type                text not null default 'system'
                              check (actor_type in ('system','user')),
  actor_id                  text,
  linked_action_id          uuid references public.ai_action_log(action_id),
  correlation_id            uuid,
  occurred_at               timestamptz not null default now()
);
comment on table public.close_assertion_coverage_events is
  'Event-sourced audit trail for coverage projections. Every recompute writes projection_started + projection_completed, plus gap_detected per gap. LLM reasoner path writes gap_reasoner_* events. Survives projection rebuild.';
create index if not exists close_assertion_coverage_events_by_close
  on public.close_assertion_coverage_events (firm_client_id, close_period_id, occurred_at desc);
create index if not exists close_assertion_coverage_events_by_worker_run
  on public.close_assertion_coverage_events (worker_run_id);
alter table public.close_assertion_coverage_events enable row level security;
drop policy if exists "cac_events_service_role_all" on public.close_assertion_coverage_events;
create policy "cac_events_service_role_all"
  on public.close_assertion_coverage_events for all to service_role using (true) with check (true);
drop policy if exists "cac_events_firm_read" on public.close_assertion_coverage_events;
create policy "cac_events_firm_read"
  on public.close_assertion_coverage_events for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage_events.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 5. Widen ai_action_log_action_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ai_action_log_action_category_check';
  if cur_def is null or cur_def not like '%assertion_coverage_scan%' or cur_def not like '%assertion_gap_reasoning%' then
    raise exception 'ai_action_log_action_category_check missing Part 1 widenings; Part 2 refusing to run';
  end if;
end$$;
-- ---------------------------------------------------------------------------
-- 6. Widen ledger_events_event_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ledger_events_event_category_check';
  if cur_def is null or cur_def not like '%assertion%' then
    raise exception 'ledger_events_event_category_check missing assertion category; Part 2 refusing to run';
  end if;
end$$;
-- [ESC] stripped source txn marker: commit;

-- <<< end 20260707130000_d_assertions_part_2_coverage_projection.sql

-- >>> begin 20260707140000_d_assertions_part_3_coverage_statement.sql
-- =============================================================================
-- D-Assertions Part 3 — Coverage Statement (close-packet appendix + snapshot)
-- =============================================================================
-- [ESC] stripped source txn marker: begin;


create table if not exists public.assertion_coverage_statement_versions (
  snapshot_id                 uuid primary key default gen_random_uuid(),
  close_packet_id             uuid not null references public.close_packets(id) on delete cascade,
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  packet_version              integer not null,
  content_json                jsonb  not null,
  content_sha256              text   not null,
  coverage_row_count          integer not null,
  gap_count                   integer not null,
  tested_count                integer not null,
  partial_count               integer not null,
  not_applicable_count        integer not null,
  isa_315_baseline_version    text   not null default 'ISA 315 (Revised 2019)',
  captured_at                 timestamptz not null default now(),
  captured_by_user_id         uuid null,
  unique (close_packet_id, packet_version)
);
comment on table public.assertion_coverage_statement_versions is
  'D-Assertions Part 3 — immutable snapshot of the assertion coverage statement at close-packet lock time. Never updated after creation.';
create index if not exists acsv_by_close_period on public.assertion_coverage_statement_versions (close_period_id, captured_at desc);
create index if not exists acsv_by_firm_client  on public.assertion_coverage_statement_versions (firm_client_id, captured_at desc);
alter table public.assertion_coverage_statement_versions enable row level security;
drop policy if exists "acsv_service_role_all" on public.assertion_coverage_statement_versions;
create policy "acsv_service_role_all"
  on public.assertion_coverage_statement_versions for all to service_role using (true) with check (true);
drop policy if exists "acsv_firm_read" on public.assertion_coverage_statement_versions;
create policy "acsv_firm_read"
  on public.assertion_coverage_statement_versions for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_versions.firm_client_id
    )
  );

create table if not exists public.assertion_coverage_statement_downloads (
  download_id                 uuid primary key default gen_random_uuid(),
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  requested_by_user_id        uuid null,
  requested_by_email          text null,
  snapshot_id                 uuid null references public.assertion_coverage_statement_versions(snapshot_id) on delete set null,
  content_sha256              text not null,
  byte_size                   bigint not null,
  requested_at                timestamptz not null default now()
);
comment on table public.assertion_coverage_statement_downloads is
  'D-Assertions Part 3 — audit log of every standalone Coverage Statement PDF download for AS 1105 provenance.';
create index if not exists acsd_by_close_period on public.assertion_coverage_statement_downloads (close_period_id, requested_at desc);
create index if not exists acsd_by_firm_client  on public.assertion_coverage_statement_downloads (firm_client_id, requested_at desc);
alter table public.assertion_coverage_statement_downloads enable row level security;
drop policy if exists "acsd_service_role_all" on public.assertion_coverage_statement_downloads;
create policy "acsd_service_role_all"
  on public.assertion_coverage_statement_downloads for all to service_role using (true) with check (true);
drop policy if exists "acsd_firm_read" on public.assertion_coverage_statement_downloads;
create policy "acsd_firm_read"
  on public.assertion_coverage_statement_downloads for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_downloads.firm_client_id
    )
  );

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='close_assertion_coverage') then
    raise exception 'D-Assertions Part 2 close_assertion_coverage missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertion_gap_root_causes') then
    raise exception 'D-Assertions Part 2 assertion_gap_root_causes missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertions_catalog') then
    raise exception 'D-Assertions Part 1 assertions_catalog missing — Part 3 requires Part 1 applied first';
  end if;
end $$;

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260707140000_d_assertions_part_3_coverage_statement.sql

-- >>> begin 20260707150000_d_assertions_part_4_je_propagation.sql
-- D-Assertions Part 4 — JE post-time assertion propagation
-- Adds assertions_addressed to je_posting_audit and lights up assertion_tags
-- on pre_close_review_items with a validation constraint tied to assertions_catalog.
--
-- Non-band-aid guarantees:
-- 1. Both columns validated by a plpgsql function that reads assertions_catalog,
--    so any typo (e.g. 'complete' instead of 'completeness') fails at write time.
-- 2. GIN indexes on both columns for efficient drill-down queries in Part 5.
-- 3. No backfill of historical rows — historical je_posting_audit rows retain '{}'
--    since the rule → assertion mapping did not exist at their post time.
--    Any retrospective mapping would fabricate evidence and violate the AS 1105
--    reliability chain.
-- [ESC] stripped source txn marker: BEGIN;


-- 1. Validation function shared by both tables.
CREATE OR REPLACE FUNCTION validate_assertions_array(assertion_ids text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  a text;
  known_count int;
BEGIN
  IF assertion_ids IS NULL OR array_length(assertion_ids, 1) IS NULL THEN
    RETURN true; -- empty array is valid
  END IF;
  -- reject duplicates
  IF array_length(assertion_ids, 1) <> (SELECT count(DISTINCT x) FROM unnest(assertion_ids) x) THEN
    RETURN false;
  END IF;
  -- every element must exist in assertions_catalog
  SELECT count(*) INTO known_count
    FROM assertions_catalog
   WHERE assertion_id = ANY(assertion_ids);
  RETURN known_count = array_length(assertion_ids, 1);
END;
$$;

-- 2. je_posting_audit.assertions_addressed
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS assertions_addressed text[] NOT NULL DEFAULT '{}';

ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_valid_assertions
  CHECK (validate_assertions_array(assertions_addressed));

CREATE INDEX IF NOT EXISTS je_posting_audit_assertions_gin
  ON je_posting_audit USING gin (assertions_addressed);

COMMENT ON COLUMN je_posting_audit.assertions_addressed IS
  'ISA 315 assertion IDs the posted JE addresses at post time. Sourced from the '
  'originating pre_close_review_items.assertion_tags (rule-driven) or resolved '
  'via curated_rule_fires + rule_assertion_coverage. Historical rows before '
  '2026-07-07 are empty by design — retro-tagging would fabricate evidence.';

-- 3. pre_close_review_items.assertion_tags (column exists from D6.4c-1; add validation + index).
--    The column was defined as text[] with default '{}' but no CHECK constraint. Add both.
ALTER TABLE pre_close_review_items
  ALTER COLUMN assertion_tags SET DEFAULT '{}',
  ALTER COLUMN assertion_tags SET NOT NULL;

ALTER TABLE pre_close_review_items
  ADD CONSTRAINT pre_close_review_items_valid_assertions
  CHECK (validate_assertions_array(assertion_tags));

CREATE INDEX IF NOT EXISTS pre_close_review_items_assertion_tags_gin
  ON pre_close_review_items USING gin (assertion_tags);

COMMENT ON COLUMN pre_close_review_items.assertion_tags IS
  'ISA 315 assertion IDs derived from rule_assertion_coverage at compose time. '
  'Propagated onto je_posting_audit.assertions_addressed when the review item is approved-and-posted.';

-- 4. Data-source reliability basis on je_posting_audit (AS 1105 .10A 2025 amendment).
--    Every propagated assertion must record how the underlying data's reliability was established.
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS data_source_reliability_basis text;

COMMENT ON COLUMN je_posting_audit.data_source_reliability_basis IS
  'PCAOB AS 1105 ¶.10A (2025) reliability basis for the electronic evidence '
  'underlying this JE. Values: qbo_api_authenticated | bank_feed_ocr | plaid_direct | '
  'manual_document_upload | inbound_email_parsed | rule_synthesized_from_qbo_ledger. '
  'Required non-null when assertions_addressed is non-empty.';

-- 5. Enforce reliability-basis-required-when-tagged as a CHECK.
--    Non-band-aid rationale: if a JE claims to address an assertion, AS 1105 requires
--    the reliability basis be documented at the same moment. This is not optional metadata.
ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_reliability_required_when_tagged
  CHECK (
    array_length(assertions_addressed, 1) IS NULL
    OR data_source_reliability_basis IS NOT NULL
  );

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260707150000_d_assertions_part_4_je_propagation.sql

-- >>> begin 20260707160000_d_assertions_part_5_gap_review_items.sql
-- D-Assertions Part 5 — Gap → Review Item pipeline
--
-- Non-band-aid guarantees:
-- 1. New close_gap_review_items table (does NOT reuse pre_close_review_items — different semantics).
-- 2. Unique (firm_client_id, close_period_id, account_category, assertion_id) prevents duplicate open gaps.
-- 3. FK to close_periods; RLS mirrors close_assertion_coverage (Part 2/3 pattern) exactly.
-- 4. resolution_status CHECK constrains to a controlled vocabulary; open→resolved is one-way, but
--    an auto_close from re-detection sets status back to 'open' with resolution_status_prior recorded.
-- 5. Idempotent UPSERT-friendly design: worker calls .upsert with onConflict on the natural key.
-- [ESC] stripped source txn marker: BEGIN;

CREATE TABLE IF NOT EXISTS close_gap_review_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id            uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  close_period_id           uuid NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  account_category          text NOT NULL,
  assertion_id              text NOT NULL REFERENCES assertions_catalog(assertion_id),
  gap_root_cause_code       text NOT NULL,
  gap_recommendation        text,
  relevance_at_detection    text NOT NULL CHECK (relevance_at_detection IN ('relevant','usually_not_primary')),
  severity                  text NOT NULL DEFAULT 'warning'
                            CHECK (severity IN ('critical','warning','info')),
  -- Open/resolved lifecycle
  resolution_status         text NOT NULL DEFAULT 'open'
                            CHECK (resolution_status IN ('open','resolved_remediated','resolved_deferred','resolved_not_applicable','resolved_stale')),
  resolution_type           text CHECK (resolution_type IN ('manual_test','rule_activation','not_applicable_override','deferred_to_next_period')),
  resolution_metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by_user_id       uuid,
  resolved_at               timestamptz,
  -- Auto-close audit trail: if worker re-detects an already-resolved gap, we keep the prior status
  resolution_status_prior   text,
  reopened_at               timestamptz,
  -- Bookkeeping
  first_detected_at         timestamptz NOT NULL DEFAULT now(),
  last_projected_at         timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- Natural key
  CONSTRAINT close_gap_review_items_natural_key
    UNIQUE (firm_client_id, close_period_id, account_category, assertion_id)
);
CREATE INDEX IF NOT EXISTS close_gap_review_items_engagement_idx
  ON close_gap_review_items (engagement_id, resolution_status, created_at DESC);
CREATE INDEX IF NOT EXISTS close_gap_review_items_open_by_period_idx
  ON close_gap_review_items (close_period_id, resolution_status)
  WHERE resolution_status = 'open';
CREATE INDEX IF NOT EXISTS close_gap_review_items_severity_idx
  ON close_gap_review_items (severity, resolution_status);
COMMENT ON TABLE close_gap_review_items IS
  'D-Assertions Part 5. One row per (firm_client_id, close_period_id, account_category, assertion_id) '
  'representing an assertion-coverage gap that needs reviewer remediation. Parallel to '
  'pre_close_review_items (rule-driven) — gaps have no fire_id/rule_id/je_draft and must not share that table.';
-- Enforce that resolution fields are set together
ALTER TABLE close_gap_review_items
  ADD CONSTRAINT close_gap_review_items_resolution_coherent
  CHECK (
    (resolution_status = 'open' AND resolution_type IS NULL AND resolved_at IS NULL)
    OR
    (resolution_status <> 'open' AND resolution_type IS NOT NULL AND resolved_at IS NOT NULL)
  );
-- RLS: mirror close_assertion_coverage (Part 2). Read: firm reader on engagement.
-- Write: service role only (worker + resolve API use service client).
ALTER TABLE close_gap_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY close_gap_review_items_firm_read
  ON close_gap_review_items FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY close_gap_review_items_service_all
  ON close_gap_review_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
-- Trigger: bump updated_at on UPDATE
CREATE OR REPLACE FUNCTION close_gap_review_items_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER close_gap_review_items_touch_updated_at
  BEFORE UPDATE ON close_gap_review_items
  FOR EACH ROW EXECUTE FUNCTION close_gap_review_items_touch_updated_at();
-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260707160000_d_assertions_part_5_gap_review_items.sql

-- >>> begin 20260707170000_d_assertions_part_6_manual_test_evidence.sql
-- ============================================================================
-- D-Assertions Part 6 — Manual test evidence + attachments + strength refinement
-- Base: a0cf507 (Part 5). Target ladder: 1554 → ~1590.
-- ============================================================================
-- [ESC] stripped source txn marker: BEGIN;

ALTER TABLE public.close_assertion_coverage
  ADD COLUMN IF NOT EXISTS covering_manual_test_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS close_assertion_coverage_manual_tests_gin
  ON public.close_assertion_coverage USING gin (covering_manual_test_ids);
CREATE TABLE IF NOT EXISTS public.manual_test_evidence (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id           uuid NOT NULL REFERENCES public.firm_clients(id),
  engagement_id            uuid NOT NULL REFERENCES public.engagements(id),
  close_period_id          uuid NOT NULL REFERENCES public.close_periods(id),
  account_category         text NOT NULL,
  assertion_id             text NOT NULL,
  evidence_type            text NOT NULL,
  source_type              text NOT NULL,
  source_key               jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_amount            numeric NULL,
  source_date              date NULL,
  evidence_summary         text NOT NULL,
  calculation_notes        text NULL,
  resolves_gap_item_id     uuid NULL REFERENCES public.close_gap_review_items(id),
  data_source_reliability_basis text NULL,
  content_hash             text NOT NULL,
  created_by_user_id       uuid NOT NULL,
  created_by_display_name  text NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_test_evidence_evidence_type_check CHECK (evidence_type = ANY (ARRAY[
    'qbo_bill','qbo_invoice','qbo_payment','qbo_transaction','qbo_journal_entry',
    'plaid_transaction','bank_statement','credit_card_statement',
    'vendor_invoice_ocr','customer_invoice_ocr',
    'contract_document','signed_agreement',
    'system_calculation','memory_pattern','manual_override','other',
    'manual_procedure','external_confirmation','analytical_review','reperformance'
  ])),
  CONSTRAINT manual_test_evidence_natural_key UNIQUE
    (firm_client_id, close_period_id, account_category, assertion_id, content_hash)
);
CREATE INDEX IF NOT EXISTS manual_test_evidence_period_idx
  ON public.manual_test_evidence (close_period_id, account_category, assertion_id);
CREATE INDEX IF NOT EXISTS manual_test_evidence_engagement_idx
  ON public.manual_test_evidence (engagement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_test_evidence_gap_idx
  ON public.manual_test_evidence (resolves_gap_item_id)
  WHERE resolves_gap_item_id IS NOT NULL;
ALTER TABLE public.manual_test_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_evidence_firm_read
  ON public.manual_test_evidence FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id
      FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_evidence_service_all
  ON public.manual_test_evidence FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE TABLE IF NOT EXISTS public.manual_test_attachments (
  attachment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id              uuid NOT NULL REFERENCES public.manual_test_evidence(id) ON DELETE CASCADE,
  firm_client_id           uuid NOT NULL,
  storage_bucket           text NOT NULL DEFAULT 'manual-test-evidence',
  storage_path             text NOT NULL,
  original_filename        text NOT NULL,
  mime_type                text NOT NULL,
  byte_size                bigint NOT NULL,
  sha256                   text NOT NULL,
  ingested_from            text NOT NULL,
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  ingested_by              text NOT NULL DEFAULT 'system',
  CONSTRAINT manual_test_attachments_bucket_check CHECK (storage_bucket = 'manual-test-evidence'),
  CONSTRAINT manual_test_attachments_natural_key UNIQUE (evidence_id, sha256)
);
CREATE INDEX IF NOT EXISTS manual_test_attachments_evidence_idx
  ON public.manual_test_attachments (evidence_id);
ALTER TABLE public.manual_test_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_attachments_firm_read
  ON public.manual_test_attachments FOR SELECT
  USING (
    evidence_id IN (
      SELECT mte.id
      FROM manual_test_evidence mte
      JOIN engagements e ON e.id = mte.engagement_id
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_attachments_service_all
  ON public.manual_test_attachments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-test-evidence', 'manual-test-evidence', false)
ON CONFLICT (id) DO NOTHING;
-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260707170000_d_assertions_part_6_manual_test_evidence.sql

-- >>> begin 20260715180000_mfa_enrollment.sql
-- Phase TCP1 W2.5 Block 10 — MFA enrollment tables (additive-only)

-- MFA recovery codes: 10 one-time codes per user, hashed with SHA-256
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user
  ON public.mfa_recovery_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_recovery_codes"
  ON public.mfa_recovery_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users cannot INSERT/UPDATE/DELETE directly — server actions with service role only

-- MFA audit log
CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user
  ON public.mfa_audit_log(user_id, created_at DESC);

ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_mfa_audit"
  ON public.mfa_audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Immutability: audit log is append-only, never updated or deleted
CREATE OR REPLACE FUNCTION public.mfa_audit_log_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'mfa_audit_log is append-only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mfa_audit_log_immutable ON public.mfa_audit_log;
CREATE TRIGGER mfa_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.mfa_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.mfa_audit_log_prevent_mutation();
-- <<< end 20260715180000_mfa_enrollment.sql

-- >>> begin 20260715190000_mfa_webauthn_and_trusted_devices.sql
-- Gap 1b — WebAuthn credentials + trusted devices + audit event extension

-- ============================================================
-- 1. Extend mfa_audit_log event_type CHECK
-- ============================================================
ALTER TABLE public.mfa_audit_log
  DROP CONSTRAINT IF EXISTS mfa_audit_log_event_type_check;

ALTER TABLE public.mfa_audit_log
  ADD CONSTRAINT mfa_audit_log_event_type_check CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted',
    'trusted_device_added','trusted_device_revoked','trusted_device_expired',
    'webauthn_register_started','webauthn_register_completed','webauthn_register_failed',
    'webauthn_verify_success','webauthn_verify_failed','webauthn_credential_removed',
    'webauthn_credential_renamed'
  ));

-- ============================================================
-- 2. user_webauthn_credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  friendly_name TEXT NOT NULL DEFAULT 'Security key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_user
  ON public.user_webauthn_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_credential_id
  ON public.user_webauthn_credentials(credential_id);

ALTER TABLE public.user_webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Immutability trigger: block updates to credential_id, public_key, user_id
CREATE OR REPLACE FUNCTION public.user_webauthn_credentials_prevent_column_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.credential_id IS DISTINCT FROM OLD.credential_id THEN
    RAISE EXCEPTION 'credential_id is immutable';
  END IF;
  IF NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'public_key is immutable';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_webauthn_credentials_immutable_cols ON public.user_webauthn_credentials;
CREATE TRIGGER user_webauthn_credentials_immutable_cols
  BEFORE UPDATE ON public.user_webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.user_webauthn_credentials_prevent_column_mutation();

-- ============================================================
-- 3. mfa_webauthn_challenges (transient, 60s TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds')
);

CREATE INDEX IF NOT EXISTS idx_mfa_webauthn_challenges_user_purpose
  ON public.mfa_webauthn_challenges(user_id, purpose, expires_at DESC);

ALTER TABLE public.mfa_webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- Service-role only; no policies for authenticated users (challenges are server-managed)

-- ============================================================
-- 4. mfa_trusted_devices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id_hash TEXT NOT NULL,
  user_agent TEXT NULL,
  ip_first_seen INET NULL,
  ip_last_seen INET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user_active
  ON public.mfa_trusted_devices(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_hash
  ON public.mfa_trusted_devices(device_id_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND revoked_at IS NOT NULL);
-- <<< end 20260715190000_mfa_webauthn_and_trusted_devices.sql

-- >>> begin 20260716010000_add_qbo_cdc_tables.sql
-- Issue #4 — QBO CDC hourly reconciliation cron
-- Two new tables, both additive.

-- ============================================================================
-- qbo_cdc_cursors — one row per (realm_id, entity_name)
-- Tracks the last observed `MetaData.LastUpdatedTime` from CDC, so the next
-- hourly run can use `changedSince = this_value` to only pull deltas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_cursors (
    id               bigserial PRIMARY KEY,
    realm_id         text NOT NULL,
    entity_name      text NOT NULL,
    last_changed_at  timestamp with time zone NOT NULL,
    updated_at       timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (realm_id, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_cursors_realm
    ON public.qbo_cdc_cursors (realm_id);

COMMENT ON TABLE public.qbo_cdc_cursors IS
    'CDC watermark per (realm, entity). Advanced by the hourly CDC cron.';

-- ============================================================================
-- qbo_cdc_runs — audit trail
-- One row per (cron_execution, realm_id). Intuit App Store reviewer evidence.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_runs (
    id                  bigserial PRIMARY KEY,
    run_id              uuid NOT NULL,
    realm_id            text NOT NULL,
    started_at          timestamp with time zone NOT NULL DEFAULT now(),
    finished_at         timestamp with time zone,
    entities_queried    integer NOT NULL DEFAULT 0,
    entities_changed    integer NOT NULL DEFAULT 0,
    events_rescued      integer NOT NULL DEFAULT 0,  -- no matching webhook row
    events_confirmed    integer NOT NULL DEFAULT 0,  -- matching webhook row within ±60s
    events_inserted     integer NOT NULL DEFAULT 0,  -- rows we upserted (rescued + already-covered de-duped)
    status              text NOT NULL DEFAULT 'running',
    error_message       text,
    sample_intuit_tid   text,
    elapsed_ms          integer
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_run_id
    ON public.qbo_cdc_runs (run_id);
CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_started_at
    ON public.qbo_cdc_runs (started_at DESC);

COMMENT ON TABLE public.qbo_cdc_runs IS
    'Audit log for QBO CDC hourly cron runs. Provides Intuit App Store reviewers with evidence of webhook fallback reconciliation.';

-- RLS: service_role only (cron + server). No anon/authenticated policies.
ALTER TABLE public.qbo_cdc_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_cdc_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qbo_cdc_cursors_service_role_all ON public.qbo_cdc_cursors;
CREATE POLICY qbo_cdc_cursors_service_role_all
  ON public.qbo_cdc_cursors
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS qbo_cdc_runs_service_role_all ON public.qbo_cdc_runs;
CREATE POLICY qbo_cdc_runs_service_role_all
  ON public.qbo_cdc_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.qbo_cdc_cursors FROM anon, authenticated;
REVOKE ALL ON public.qbo_cdc_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_cursors TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_cursors_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_runs_id_seq TO service_role;
-- <<< end 20260716010000_add_qbo_cdc_tables.sql

-- >>> begin 20260716_00_d6_5_part1_1_firm_clients_slug.sql
-- D6.5 Part 1.1: Add firm_clients.slug with validator + per-firm uniqueness.
-- Backfills from firm_clients.name using the same slugify recipe as
-- scripts/provision-intake-addresses.ts and lib/intake/address.ts.

-- [ESC] stripped source txn marker: BEGIN;


-- §1. Add column (nullable while we backfill).
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS slug text;

-- §2. Deterministic slugify helper — mirrors the TS slugFromClientName recipe.
--     lowercase → replace non-[a-z0-9] with '-' → strip leading/trailing '-'
--     → slice(0, 32). Result is intentionally NULL if the derived string
--     is empty; the backfill loop below handles that with a co-{companyId}
--     fallback exactly like the TS code.
CREATE OR REPLACE FUNCTION public._d651_slugify_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    substring(
      regexp_replace(
        regexp_replace(
          lower(coalesce(p_name, '')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
      ),
      1, 32
    ),
    ''
  );
$$;

-- §3. Backfill in a single DO block so we can handle collisions deterministically.
--     Ordering: (firm_id, created_at, id) — the oldest row in a firm wins the
--     base slug; later collisions get -2, -3, ... suffixes. This is stable
--     across re-runs (idempotent) because we only touch rows where slug IS NULL.
DO $backfill$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  suffix int;
  fallback text;
BEGIN
  FOR r IN
    SELECT id, firm_id, company_id, name
      FROM public.firm_clients
     WHERE slug IS NULL
     ORDER BY firm_id, created_at, id
  LOOP
    base_slug := public._d651_slugify_name(r.name);

    -- If name doesn't yield a valid base, use the same co-{companyId} fallback
    -- as scripts/provision-intake-addresses.ts.
    IF base_slug IS NULL OR length(base_slug) < 3 THEN
      fallback := 'co-' || substring(replace(r.company_id::text, '-', ''), 1, 8);
      base_slug := fallback;
    END IF;

    -- Enforce validator length bounds. isValidFirmSlug requires 3-32 chars
    -- with alphanumeric anchors. If base is <3 chars after fallback, skip.
    IF length(base_slug) < 3 THEN
      RAISE WARNING 'skip firm_client %: cannot derive valid slug (name=%, company_id=%)',
        r.id, r.name, r.company_id;
      CONTINUE;
    END IF;

    -- Ensure alphanumeric anchors — validator regex requires first & last char
    -- to be [a-z0-9]. Our slugify already strips leading/trailing dashes,
    -- and 'co-' fallback starts with 'c' + ends with [a-z0-9], so both paths
    -- are already anchor-safe. Defensive check:
    IF base_slug !~ '^[a-z0-9]' OR base_slug !~ '[a-z0-9]$' THEN
      RAISE WARNING 'skip firm_client %: derived slug fails anchor check (slug=%)',
        r.id, base_slug;
      CONTINUE;
    END IF;

    -- Collision resolution: try base, then base-2, base-3, ... until unique
    -- within firm_id. Cap the base at 30 chars if we need a -N suffix, so the
    -- final slug still fits in 32 chars for suffixes up to -99.
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.firm_clients
       WHERE firm_id = r.firm_id
         AND slug = candidate
         AND id <> r.id
    ) LOOP
      candidate := substring(base_slug, 1, 30) || '-' || suffix::text;
      suffix := suffix + 1;
      IF suffix > 100 THEN
        RAISE EXCEPTION 'collision suffix overflow for firm % base %', r.firm_id, base_slug;
      END IF;
    END LOOP;

    UPDATE public.firm_clients SET slug = candidate WHERE id = r.id;
  END LOOP;
END
$backfill$;

-- §4. Validator CHECK constraint — matches lib/intake/address.ts isValidFirmSlug.
--     Applied only to non-null values so new rows can be inserted without a
--     slug and get one via an application-layer default, but any non-null
--     value must be valid.
ALTER TABLE public.firm_clients
  ADD CONSTRAINT firm_clients_slug_valid_ck
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');

-- §5. Uniqueness — one slug per firm. Partial index so NULLs don't conflict
--     (Postgres treats NULLs as distinct by default, but partial makes intent
--     explicit and slightly faster).
CREATE UNIQUE INDEX IF NOT EXISTS firm_clients_firm_id_slug_uidx
  ON public.firm_clients (firm_id, slug)
  WHERE slug IS NOT NULL;

-- §6. Clean up the helper — it was single-use and shouldn't linger in the
--     schema. New rows should get slugs from the application layer, not this
--     helper (which won't be re-executed).
DROP FUNCTION public._d651_slugify_name(text);

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260716_00_d6_5_part1_1_firm_clients_slug.sql

-- >>> begin 20260717010000_d65_p2_block1_visual_fingerprint.sql
-- Phase D6.5 Part 2 — Block 1: Visual Invoice Fingerprint Pipeline
-- Additive only. IF NOT EXISTS everywhere. No ALTER on existing columns.

-- ─── ap_intake_bills (text extraction landing zone) ───────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL,
  company_id          UUID NOT NULL,
  firm_client_id      UUID,
  intake_message_id   UUID REFERENCES public.intake_messages(id),
  resolved_vendor_id  UUID,
  mime_type           TEXT,
  raw_text            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_firm_company
  ON public.ap_intake_bills (firm_id, company_id);

ALTER TABLE public.ap_intake_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_service_role'
  ) THEN
    CREATE POLICY ap_intake_bills_service_role ON public.ap_intake_bills
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bills_tenant_select ON public.ap_intake_bills
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Table: vendor_invoice_fingerprints ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_invoice_fingerprints (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id            UUID NOT NULL,
  vendor_id          UUID NOT NULL,
  version            INTEGER NOT NULL,
  bill_id            UUID REFERENCES public.ap_intake_bills(id),
  provenance         TEXT NOT NULL DEFAULT 'live_intake'
                     CHECK (provenance IN ('live_intake', 'onboarding_harvest')),
  layout_bboxes      JSONB NOT NULL,
  font_families      JSONB NOT NULL,
  color_palette      JSONB NOT NULL,
  phash              BYTEA NOT NULL,
  dhash              BYTEA NOT NULL,
  extractor_version  TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vif_unique_firm_vendor_version UNIQUE (firm_id, vendor_id, version)
);

CREATE INDEX IF NOT EXISTS ix_vif_firm_vendor
  ON public.vendor_invoice_fingerprints (firm_id, vendor_id);

CREATE INDEX IF NOT EXISTS ix_vif_bill
  ON public.vendor_invoice_fingerprints (bill_id)
  WHERE bill_id IS NOT NULL;

ALTER TABLE public.vendor_invoice_fingerprints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_service_role'
  ) THEN
    CREATE POLICY vif_service_role ON public.vendor_invoice_fingerprints
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_select'
  ) THEN
    CREATE POLICY vif_tenant_select ON public.vendor_invoice_fingerprints
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_write'
  ) THEN
    CREATE POLICY vif_tenant_write ON public.vendor_invoice_fingerprints
      FOR ALL TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Entitlement flag: ap_intake ─────────────────────────────────────────
-- Canonical registry: lib/entitlements/registry.ts ADDON_REGISTRY + engagement_addons.addon_code CHECK.
-- ap_intake already present — no duplicate insert required.

-- ─── L4 assertion registry (ISA assertions_catalog is a fixed 8-enum) ────
CREATE TABLE IF NOT EXISTS public.ap_intake_assertion_registry (
  assertion_id      TEXT PRIMARY KEY,
  layer             TEXT NOT NULL,
  severity_default  TEXT NOT NULL,
  evaluator_module  TEXT NOT NULL,
  description       TEXT NOT NULL
);

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'fingerprint_drift_within_threshold',
  'L4',
  'HIGH',
  'ap-intake/assertions/fingerprint-drift-within-threshold',
  'Bill fingerprint drift from prior version must stay within configured '
  || 'thresholds (layout 15%, symmetric font-set diff, Delta-E 20 color, '
  || '8-bit pHash Hamming) or route to reviewer.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── AP ledger event type registry ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_ledger_event_types (
  event_type         TEXT PRIMARY KEY,
  actor_type         TEXT NOT NULL,
  is_merkle_chained  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained)
VALUES ('fingerprint.new_version_created', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log category: visual_fingerprint ──────────────────────────
ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;

ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (
    action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint'
    )
  );
-- <<< end 20260717010000_d65_p2_block1_visual_fingerprint.sql

-- >>> begin 20260707214500_d65_p2_block7a2_prepilot_security.sql
-- Phase D6.5 Part 2 — Block 7a.2 — Pre-Pilot Security Hardening
--
-- Resolves 8 pre-existing ERROR advisors before NY contractor pilot go-live:
--   Group A: RLS disabled on 3 public tables
--   Group B: SECURITY DEFINER on 2 views
--   Group C: user-editable JWT metadata half in 3 super-admin policies (privilege escalation)
--
-- Additive-only. No data touched. No existing tables altered.
-- Super-admin convention: app_metadata.role = 'super_admin' (app_metadata is not user-editable).
-- [ESC] stripped source txn marker: BEGIN;


-- =============================================================================
-- GROUP A — Enable RLS on 3 tables
-- =============================================================================

-- A1. engagement_posting_policy — firm-scoped read for firm members, service role manages
ALTER TABLE public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagement_posting_policy_service_role_all"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "engagement_posting_policy_firm_members_select"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagements e
      JOIN public.firm_memberships fm
        ON fm.firm_id = e.firm_id
      WHERE e.id = engagement_posting_policy.engagement_id
        AND fm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.engagement_posting_policy IS
  'Per-engagement posting policy. RLS: service_role full access; authenticated firm members read via engagements.firm_id → firm_memberships.';

-- A2. ap_intake_ledger_event_types — global reference catalog, permissive read
ALTER TABLE public.ap_intake_ledger_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_ledger_event_types_service_role_all"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_ledger_event_types_authenticated_select"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_ledger_event_types IS
  'Global reference catalog of AP intake ledger event types. Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- A3. ap_intake_assertion_registry — global reference catalog, permissive read
ALTER TABLE public.ap_intake_assertion_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_assertion_registry_service_role_all"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_assertion_registry_authenticated_select"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_assertion_registry IS
  'Global reference catalog of AP intake assertion definitions (runtime mirror). Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- =============================================================================
-- GROUP B — Convert SECURITY DEFINER views to security_invoker
-- =============================================================================

ALTER VIEW public.company_billing_compat SET (security_invoker = true);
ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);

-- =============================================================================
-- GROUP C — Remove user-editable JWT metadata privilege-escalation half from super-admin policies
--
-- Codebase super-admin convention (app/signin/page.tsx:33):
--   data.user?.app_metadata?.role === "super_admin"
--
-- The OR user-editable JWT metadata half is user-editable via Supabase auth → privilege escalation.
-- We drop and recreate with app_metadata-only.
-- =============================================================================

-- C1. support_tickets
DROP POLICY IF EXISTS "Super admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Super admins can manage support tickets"
  ON public.support_tickets
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C2. free_review_leads
DROP POLICY IF EXISTS "Super admins can manage free review leads" ON public.free_review_leads;
CREATE POLICY "Super admins can manage free review leads"
  ON public.free_review_leads
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C3. mfg_waitlist
DROP POLICY IF EXISTS "Super admins can manage mfg waitlist" ON public.mfg_waitlist;
CREATE POLICY "Super admins can manage mfg waitlist"
  ON public.mfg_waitlist
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260707214500_d65_p2_block7a2_prepilot_security.sql

-- >>> begin 20260717020000_d65_p2_block2_vendor_mirror.sql
-- ============================================================================
-- D6.5 Part 2 — Block 2: L1 Vendor Existence + Fuzzy Match + vendor_master_mirror
-- Additive-only. Idempotent. Companion to Block 1 (20260717010000).
-- ============================================================================

-- ─── vendor_master_mirror ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_master_mirror (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 UUID NOT NULL,
  firm_client_id          UUID NOT NULL,
  erp_platform            TEXT NOT NULL,
  external_vendor_id      TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  normalized_name         TEXT NOT NULL,
  metaphone_code          TEXT NOT NULL,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  sync_token              TEXT,
  primary_email           TEXT,
  primary_phone           TEXT,
  first_synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_snapshot_hash      TEXT NOT NULL,
  UNIQUE (firm_client_id, erp_platform, external_vendor_id)
);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_firm_client_active
  ON public.vendor_master_mirror (firm_client_id, active);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_normalized
  ON public.vendor_master_mirror (firm_client_id, normalized_name);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_metaphone
  ON public.vendor_master_mirror (firm_client_id, metaphone_code);

ALTER TABLE public.vendor_master_mirror ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_service_role'
  ) THEN
    CREATE POLICY vendor_master_mirror_service_role ON public.vendor_master_mirror
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_tenant_select'
  ) THEN
    CREATE POLICY vendor_master_mirror_tenant_select ON public.vendor_master_mirror
      FOR SELECT TO authenticated
      USING (
        firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ─── ap_intake_bills column adds ─────────────────────────────────────────
ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS vendor_resolution_method      TEXT
    CHECK (vendor_resolution_method IN ('exact','fuzzy_candidate','no_match')),
  ADD COLUMN IF NOT EXISTS vendor_resolution_confidence  NUMERIC(4,3)
    CHECK (vendor_resolution_confidence IS NULL OR (vendor_resolution_confidence >= 0 AND vendor_resolution_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS vendor_candidate_ids          UUID[] DEFAULT '{}'::UUID[];

-- ─── L1 assertion registry insert ────────────────────────────────────────
INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'vendor_resolved_or_quarantined',
  'L1',
  'HIGH',
  'lib/ap-intake/assertions/vendor-resolved-or-quarantined',
  'Every bill row must either resolve to a mirror vendor or emit a quarantine routing signal.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── Ledger event type ───────────────────────────────────────────────────
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('vendor.mirror_refreshed', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log.action_category widening (canonical drop-and-re-add) ──
ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;

ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (
    action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution'
    )
  );
-- <<< end 20260717020000_d65_p2_block2_vendor_mirror.sql

-- >>> begin 20260717030000_d65_p2_block3_quarantine_l3.sql
-- Phase D6.5 Part 2 — Block 3 of 8
-- L3 Bank Change Detection + L2 Quarantine + 4 Gates + NY Bookkeeper Allowlist + Attestation Modal
-- Additive only. IF NOT EXISTS on every DDL. Safe to re-run.

-- [ESC] stripped source txn marker: BEGIN;


-- =========================================================================
-- 3.1 ap_intake_quarantine
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ap_intake_quarantine (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  firm_client_id              UUID NOT NULL,
  bill_id                     UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  intake_message_id           UUID NOT NULL,
  quarantine_reason           TEXT NOT NULL,
  originating_signals         JSONB NOT NULL,
  originating_severity        TEXT NOT NULL CHECK (originating_severity IN ('HIGH','MEDIUM','LOW')),
  status                      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','released','rejected','stale')),
  fraud_score_at_quarantine   NUMERIC(4,3) NOT NULL DEFAULT 0,
  opened_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at                 TIMESTAMPTZ,
  released_by_user_id         UUID,
  release_notes               TEXT,
  UNIQUE (bill_id)
);
CREATE INDEX IF NOT EXISTS ix_quarantine_firm_status ON public.ap_intake_quarantine (firm_id, status);
CREATE INDEX IF NOT EXISTS ix_quarantine_firm_client_status ON public.ap_intake_quarantine (firm_client_id, status);
CREATE INDEX IF NOT EXISTS ix_quarantine_bill ON public.ap_intake_quarantine (bill_id);

ALTER TABLE public.ap_intake_quarantine ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ap_intake_quarantine' AND policyname='ap_intake_quarantine_service_role') THEN
    CREATE POLICY ap_intake_quarantine_service_role ON public.ap_intake_quarantine
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ap_intake_quarantine' AND policyname='ap_intake_quarantine_tenant_select') THEN
    CREATE POLICY ap_intake_quarantine_tenant_select ON public.ap_intake_quarantine
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =========================================================================
-- 3.2 vendor_bank_history (service_role only — no tenant SELECT)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.vendor_bank_history (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  firm_client_id              UUID NOT NULL,
  vendor_id                   UUID NOT NULL,
  routing_number_last4        TEXT NOT NULL,
  account_number_last4        TEXT NOT NULL,
  account_hash_sha256         TEXT NOT NULL,
  first_observed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_observed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observation_count           INT NOT NULL DEFAULT 1,
  last_seen_bill_id           UUID REFERENCES public.ap_intake_bills(id),
  actor_user_id               UUID,
  UNIQUE (firm_client_id, vendor_id, account_hash_sha256)
);
CREATE INDEX IF NOT EXISTS ix_vendor_bank_history_vendor
  ON public.vendor_bank_history (firm_client_id, vendor_id, last_observed_at DESC);

ALTER TABLE public.vendor_bank_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_bank_history' AND policyname='vendor_bank_history_service_role') THEN
    CREATE POLICY vendor_bank_history_service_role ON public.vendor_bank_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =========================================================================
-- 3.3 bookkeeper_release_allowlist (private per-firm data)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bookkeeper_release_allowlist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL,
  user_id          UUID NOT NULL,
  scope            TEXT NOT NULL DEFAULT 'quarantine_release'
                     CHECK (scope IN ('quarantine_release')),
  granted_by       UUID,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  note             TEXT,
  UNIQUE (firm_id, user_id, scope)
);
CREATE INDEX IF NOT EXISTS ix_bookkeeper_allowlist_firm_active
  ON public.bookkeeper_release_allowlist (firm_id) WHERE revoked_at IS NULL;

ALTER TABLE public.bookkeeper_release_allowlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookkeeper_release_allowlist' AND policyname='bookkeeper_release_allowlist_service_role') THEN
    CREATE POLICY bookkeeper_release_allowlist_service_role ON public.bookkeeper_release_allowlist
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookkeeper_release_allowlist' AND policyname='bookkeeper_release_allowlist_firm_admin_select') THEN
    CREATE POLICY bookkeeper_release_allowlist_firm_admin_select ON public.bookkeeper_release_allowlist
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- =========================================================================
-- 3.4 quarantine_release_attempts (audit trail — every attempt logged)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quarantine_release_attempts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  quarantine_id            UUID NOT NULL REFERENCES public.ap_intake_quarantine(id),
  bill_id                  UUID NOT NULL,
  actor_user_id            UUID NOT NULL,
  attempted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attestation_text         TEXT NOT NULL,
  gate_results             JSONB NOT NULL,
  overall_pass             BOOLEAN NOT NULL,
  blocking_gates           TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
);
CREATE INDEX IF NOT EXISTS ix_quarantine_release_attempts_quarantine
  ON public.quarantine_release_attempts (quarantine_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS ix_quarantine_release_attempts_actor
  ON public.quarantine_release_attempts (actor_user_id);

ALTER TABLE public.quarantine_release_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quarantine_release_attempts' AND policyname='quarantine_release_attempts_service_role') THEN
    CREATE POLICY quarantine_release_attempts_service_role ON public.quarantine_release_attempts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quarantine_release_attempts' AND policyname='quarantine_release_attempts_tenant_select') THEN
    CREATE POLICY quarantine_release_attempts_tenant_select ON public.quarantine_release_attempts
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =========================================================================
-- 3.5 ap_intake_bills column adds
-- =========================================================================
ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS fraud_score_current       NUMERIC(4,3) NOT NULL DEFAULT 0
    CHECK (fraud_score_current >= 0 AND fraud_score_current <= 1),
  ADD COLUMN IF NOT EXISTS quarantine_id             UUID REFERENCES public.ap_intake_quarantine(id),
  ADD COLUMN IF NOT EXISTS bank_account_hash_current TEXT;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_quarantine
  ON public.ap_intake_bills (quarantine_id) WHERE quarantine_id IS NOT NULL;

-- =========================================================================
-- 3.6 Assertion registry inserts (L3 + L2)
-- =========================================================================
INSERT INTO public.ap_intake_assertion_registry (assertion_id, layer, severity_default, evaluator_module, description) VALUES
  ('bank_info_matches_vendor_history', 'L3', 'HIGH',
    'lib/ap-intake/assertions/bank-info-matches-vendor-history',
    'Extracted vendor bank info must match a known-good entry in vendor_bank_history or trigger quarantine.'),
  ('quarantine_release_requires_all_gates', 'L2', 'HIGH',
    'lib/ap-intake/assertions/quarantine-release-requires-all-gates',
    'A quarantined bill can only be released when all 4 gates (qc-01..qc-04) pass and are persisted.')
ON CONFLICT (assertion_id) DO NOTHING;

-- =========================================================================
-- 3.7 Ledger event type inserts (6 new)
-- =========================================================================
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.quarantined',            'system', TRUE),
  ('bill.release_requested',      'user',   TRUE),
  ('bill.released',               'user',   TRUE),
  ('bill.release_blocked',        'system', TRUE),
  ('vendor.bank_info_observed',   'system', TRUE),
  ('vendor.bank_change_detected', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- =========================================================================
-- 3.8 ai_action_log.action_category widening
-- =========================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;

  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation'
    ));
END $$;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717030000_d65_p2_block3_quarantine_l3.sql

-- >>> begin 20260717040000_d65_p2_block4_duplicate_detection.sql
-- Phase D6.5 Part 2 — Block 4: L5 Multi-Strategy Duplicate Detection
-- Additive-only. Idempotent.

-- [ESC] stripped source txn marker: BEGIN;


ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date         DATE,
  ADD COLUMN IF NOT EXISTS invoice_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS content_hash_sha256  TEXT;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_content_hash
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, content_hash_sha256)
  WHERE content_hash_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_amount_date
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_amount_cents, invoice_date)
  WHERE invoice_amount_cents IS NOT NULL AND invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_invoice_number
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ap_intake_bill_duplicates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  matched_bill_id          UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  strategy_id              TEXT NOT NULL CHECK (strategy_id IN (
    'S1_exact_content_hash',
    'S2_amount_vendor_date',
    'S3_invoice_number_vendor',
    'S4_fuzzy_amount_window'
  )),
  confidence               NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity                 TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM')),
  evidence                 JSONB NOT NULL,
  detected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (bill_id, matched_bill_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_bill
  ON public.ap_intake_bill_duplicates (bill_id);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_firm_client_time
  ON public.ap_intake_bill_duplicates (firm_client_id, detected_at DESC);

ALTER TABLE public.ap_intake_bill_duplicates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_service_role'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_service_role
      ON public.ap_intake_bill_duplicates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_tenant_select
      ON public.ap_intake_bill_duplicates
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON TABLE public.ap_intake_bill_duplicates IS
  'Phase D6.5 Part 2 Block 4: append-only ledger of L5 multi-strategy duplicate-bill detections.';

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'no_duplicate_bills_posted',
  'L5',
  'HIGH',
  'lib/ap-intake/assertions/no-duplicate-bills-posted',
  'No duplicate bill may proceed to posting without quarantine or explicit release.'
) ON CONFLICT (assertion_id) DO NOTHING;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.duplicate_detected', 'system', TRUE),
  ('bill.duplicate_flagged',  'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;

  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection'
    ));
END $$;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717040000_d65_p2_block4_duplicate_detection.sql

-- >>> begin 20260717050000_d65_p2_block5_anomaly_score_merkle.sql
-- Phase D6.5 Part 2 — Block 5
-- L6 statistical anomaly + L11 fraud score aggregation + Merkle-chained ledger
-- ADDITIVE ONLY.

-- [ESC] stripped source txn marker: BEGIN;


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bill_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  invoice_amount_cents     BIGINT,
  invoice_date             DATE,
  invoice_number           TEXT,
  received_at              TIMESTAMPTZ NOT NULL,
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bill_id)
);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_vendor_received
  ON public.bill_history (firm_client_id, vendor_id, received_at DESC);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_amount
  ON public.bill_history (firm_client_id, vendor_id, invoice_amount_cents)
  WHERE invoice_amount_cents IS NOT NULL;

ALTER TABLE public.bill_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fraud_score_signals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                   UUID NOT NULL,
  firm_client_id            UUID NOT NULL,
  bill_id                   UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  layer                     TEXT NOT NULL CHECK (layer IN ('L3','L4','L5','L6')),
  signal_code               TEXT NOT NULL,
  severity                  TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  contribution              NUMERIC(4,3) NOT NULL CHECK (contribution >= 0 AND contribution <= 1),
  evidence                  JSONB NOT NULL,
  disposition               TEXT NOT NULL DEFAULT 'pending'
    CHECK (disposition IN ('pending','confirmed','dismissed','escalated')),
  disposition_note          TEXT,
  disposed_at               TIMESTAMPTZ,
  disposed_by_user_id       UUID,
  detected_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aggregated_score_snapshot NUMERIC(4,3) NOT NULL,
  UNIQUE (bill_id, layer, signal_code)
);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_bill
  ON public.fraud_score_signals (bill_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_disposition
  ON public.fraud_score_signals (firm_client_id, disposition, detected_at DESC);

ALTER TABLE public.fraud_score_signals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_events
  ADD COLUMN IF NOT EXISTS event_hash          TEXT,
  ADD COLUMN IF NOT EXISTS previous_event_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_index         BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_events_chain_index
  ON public.ledger_events (chain_index)
  WHERE chain_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ledger_events_event_hash
  ON public.ledger_events (event_hash)
  WHERE event_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ledger_chain_head (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  current_chain_index      BIGINT NOT NULL DEFAULT -1,
  current_event_hash       TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ledger_chain_head (id, current_chain_index, current_event_hash)
VALUES (1, -1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ledger_chain_head ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.publish_ledger_event(
  p_event_type              TEXT,
  p_event_category          TEXT,
  p_event_version           INTEGER,
  p_firm_id                 UUID,
  p_firm_client_id          UUID,
  p_engagement_id           UUID,
  p_portco_id               UUID,
  p_close_period_id         TEXT,
  p_aggregate_type          TEXT,
  p_aggregate_id            TEXT,
  p_actor_type              TEXT,
  p_actor_id                TEXT,
  p_event_payload           JSONB,
  p_event_metadata          JSONB,
  p_causation_event_id      UUID,
  p_event_payload_canonical TEXT
)
RETURNS TABLE(event_id UUID, event_hash TEXT, chain_index BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_head             public.ledger_chain_head%ROWTYPE;
  v_new_chain_index  BIGINT;
  v_new_event_id     UUID := gen_random_uuid();
  v_prev_hash        TEXT;
  v_hash_input       TEXT;
  v_new_hash         TEXT;
BEGIN
  SELECT * INTO v_head FROM public.ledger_chain_head WHERE id = 1 FOR UPDATE;
  v_new_chain_index := v_head.current_chain_index + 1;
  v_prev_hash := v_head.current_event_hash;

  v_hash_input := COALESCE(v_prev_hash, '') || v_new_event_id::TEXT || p_event_type || p_event_payload_canonical;
  v_new_hash := encode(digest(v_hash_input::bytea, 'sha256'), 'hex');

  INSERT INTO public.ledger_events (
    event_id, event_type, event_category, event_version,
    firm_id, firm_client_id, engagement_id, portco_id, close_period_id,
    aggregate_type, aggregate_id,
    actor_type, actor_id,
    event_payload, event_metadata, causation_event_id,
    event_hash, previous_event_hash, chain_index
  ) VALUES (
    v_new_event_id, p_event_type, p_event_category, p_event_version,
    p_firm_id, p_firm_client_id, p_engagement_id, p_portco_id, p_close_period_id,
    p_aggregate_type, p_aggregate_id,
    p_actor_type, p_actor_id,
    p_event_payload, p_event_metadata, p_causation_event_id,
    v_new_hash, v_prev_hash, v_new_chain_index
  );

  UPDATE public.ledger_chain_head
     SET current_chain_index = v_new_chain_index,
         current_event_hash  = v_new_hash,
         updated_at          = NOW()
   WHERE id = 1;

  event_id := v_new_event_id;
  event_hash := v_new_hash;
  chain_index := v_new_chain_index;
  RETURN NEXT;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bill_history' AND policyname = 'bill_history_service_role'
  ) THEN
    CREATE POLICY bill_history_service_role ON public.bill_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fraud_score_signals' AND policyname = 'fraud_score_signals_service_role'
  ) THEN
    CREATE POLICY fraud_score_signals_service_role ON public.fraud_score_signals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ledger_chain_head' AND policyname = 'ledger_chain_head_service_role'
  ) THEN
    CREATE POLICY ledger_chain_head_service_role ON public.ledger_chain_head
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.anomaly_detected', 'system', TRUE),
  ('bill.anomaly_flagged', 'system', TRUE),
  ('bill.fraud_score_updated', 'system', TRUE),
  ('bill.fraud_score_quarantine', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;
  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;
  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection',
      'statistical_anomaly_detection','fraud_score_aggregation'
    ));
END $$;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717050000_d65_p2_block5_anomaly_score_merkle.sql

-- >>> begin 20260717060000_d65_p2_block6a_requisitions_harvest_l3.sql
-- Phase D6.5 Part 2 — Block 6a
-- L0 Requisitions + L0.5 Baseline Harvest + L3 Three-Way-Match + Pilot Allowlist + Numbering RPC
-- Additive-only. Idempotent chunks. No user_id literals.
-- [ESC] stripped source txn marker: BEGIN;


-- =========================================================
-- Chunk 1: Widen engagement_addons.addon_code CHECK
-- (Also reconciles quarantine_review which exists in TS registry but not in DB CHECK)
-- =========================================================
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake',
    'ap_pay',
    'ar_invoicing',
    'ar_cash_app',
    'ar_collections',
    'voice_collections',
    'quarantine_review',
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  ));

-- =========================================================
-- Chunk 2: pilot_feature_allowlist (PRIVATE per-firm feature gates)
-- Mirrors bookkeeper_release_allowlist shape.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pilot_feature_allowlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  feature_code  TEXT NOT NULL CHECK (feature_code IN (
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  )),
  granted_by    TEXT,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  note          TEXT,
  UNIQUE (firm_id, feature_code)
);
CREATE INDEX IF NOT EXISTS idx_pilot_feature_allowlist_firm
  ON public.pilot_feature_allowlist (firm_id) WHERE revoked_at IS NULL;
ALTER TABLE public.pilot_feature_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pilot_feature_allowlist_service_all ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_service_all
  ON public.pilot_feature_allowlist
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pilot_feature_allowlist_firm_admin_select ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_firm_admin_select
  ON public.pilot_feature_allowlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = pilot_feature_allowlist.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 3: firm_memberships.can_approve column
-- =========================================================
ALTER TABLE public.firm_memberships
  ADD COLUMN IF NOT EXISTS can_approve BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_firm_memberships_can_approve
  ON public.firm_memberships (firm_id, user_id) WHERE can_approve = TRUE;

-- =========================================================
-- Chunk 4: Document numbering (PO-YYYY-NNNN, REQ-YYYY-NNNN, GR-YYYY-NNNN)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_document_numbering_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  doc_type          TEXT NOT NULL CHECK (doc_type IN ('purchase_order','requisition','goods_receipt')),
  prefix            TEXT NOT NULL,
  next_seq          INTEGER NOT NULL DEFAULT 1 CHECK (next_seq > 0),
  seq_width         INTEGER NOT NULL DEFAULT 4 CHECK (seq_width BETWEEN 3 AND 8),
  reset_annually    BOOLEAN NOT NULL DEFAULT TRUE,
  current_year      INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, doc_type)
);
ALTER TABLE public.company_document_numbering_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdnc_service_all ON public.company_document_numbering_config;
CREATE POLICY cdnc_service_all
  ON public.company_document_numbering_config
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_document_number(
  p_company_id UUID,
  p_doc_type   TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_now_year INTEGER := EXTRACT(YEAR FROM NOW())::INT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_width INTEGER;
  v_default_prefix TEXT;
BEGIN
  v_default_prefix := CASE p_doc_type
    WHEN 'purchase_order' THEN 'PO'
    WHEN 'requisition'    THEN 'REQ'
    WHEN 'goods_receipt'  THEN 'GR'
    ELSE (SELECT 'DOC') END;

  INSERT INTO public.company_document_numbering_config (company_id, doc_type, prefix)
  VALUES (p_company_id, p_doc_type, v_default_prefix)
  ON CONFLICT (company_id, doc_type) DO NOTHING;

  SELECT * INTO v_row
  FROM public.company_document_numbering_config
  WHERE company_id = p_company_id AND doc_type = p_doc_type
  FOR UPDATE;

  IF v_row.reset_annually AND v_row.current_year <> v_now_year THEN
    UPDATE public.company_document_numbering_config
    SET next_seq = 2, current_year = v_now_year, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := 1;
  ELSE
    UPDATE public.company_document_numbering_config
    SET next_seq = v_row.next_seq + 1, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := v_row.next_seq;
  END IF;

  v_prefix := v_row.prefix;
  v_width := v_row.seq_width;
  RETURN v_prefix || '-' || v_now_year::TEXT || '-' || LPAD(v_seq::TEXT, v_width, '0');
END;
$$;

-- =========================================================
-- Chunk 5: baseline_harvest_runs (audit trail for L0.5)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.baseline_harvest_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL,
  firm_client_id    UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  source            TEXT NOT NULL CHECK (source IN ('qbo','csv')),
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  actor_id          TEXT,
  counts            JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message     TEXT,
  correlation_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_baseline_harvest_runs_firm_client
  ON public.baseline_harvest_runs (firm_client_id, started_at DESC);
ALTER TABLE public.baseline_harvest_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bhr_service_all ON public.baseline_harvest_runs;
CREATE POLICY bhr_service_all ON public.baseline_harvest_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS bhr_firm_select ON public.baseline_harvest_runs;
CREATE POLICY bhr_firm_select ON public.baseline_harvest_runs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = baseline_harvest_runs.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 6: purchase_orders + purchase_order_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  po_number             TEXT NOT NULL,
  vendor_id             UUID,
  vendor_external_id    TEXT,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','partially_received','closed','cancelled')),
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_at  TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  requisition_id        UUID,
  source                TEXT NOT NULL DEFAULT 'requisition' CHECK (source IN ('requisition','harvest_qbo','harvest_csv','manual')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  memo                  TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, po_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_source_external
  ON public.purchase_orders (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor
  ON public.purchase_orders (firm_client_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (firm_client_id, status);

CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity_ordered  NUMERIC(14,4) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price_cents  BIGINT NOT NULL DEFAULT 0,
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (purchase_order_id, line_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_service_all ON public.purchase_orders;
CREATE POLICY po_service_all ON public.purchase_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS poli_service_all ON public.purchase_order_line_items;
CREATE POLICY poli_service_all ON public.purchase_order_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS po_firm_select ON public.purchase_orders;
CREATE POLICY po_firm_select ON public.purchase_orders
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = purchase_orders.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS poli_firm_select ON public.purchase_order_line_items;
CREATE POLICY poli_firm_select ON public.purchase_order_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      JOIN public.firm_memberships fm ON fm.firm_id = po.firm_id
      WHERE po.id = purchase_order_line_items.purchase_order_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 7: requisitions + requisition_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.requisitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  engagement_id         UUID,
  requisition_number    TEXT NOT NULL,
  requester_user_id     UUID NOT NULL,
  approver_user_id      UUID,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','converted_to_po')),
  vendor_id             UUID,
  vendor_hint_text      TEXT,
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  needed_by             DATE,
  justification         TEXT,
  approved_at           TIMESTAMPTZ,
  approved_by           UUID,
  rejected_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  purchase_order_id     UUID,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, requisition_number)
);
CREATE INDEX IF NOT EXISTS idx_requisitions_firm_client_status
  ON public.requisitions (firm_client_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_approver
  ON public.requisitions (approver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requester
  ON public.requisitions (requester_user_id, status);

CREATE TABLE IF NOT EXISTS public.requisition_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id    UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents  BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (requisition_id, line_number)
);

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS fk_purchase_orders_requisition;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT fk_purchase_orders_requisition
  FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE SET NULL;
ALTER TABLE public.requisitions
  DROP CONSTRAINT IF EXISTS fk_requisitions_po;
ALTER TABLE public.requisitions
  ADD CONSTRAINT fk_requisitions_po
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS req_service_all ON public.requisitions;
CREATE POLICY req_service_all ON public.requisitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS reqli_service_all ON public.requisition_line_items;
CREATE POLICY reqli_service_all ON public.requisition_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS req_firm_select ON public.requisitions;
CREATE POLICY req_firm_select ON public.requisitions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisitions.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS reqli_firm_select ON public.requisition_line_items;
CREATE POLICY reqli_firm_select ON public.requisition_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.requisitions r
      JOIN public.firm_memberships fm ON fm.firm_id = r.firm_id
      WHERE r.id = requisition_line_items.requisition_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 8: goods_receipts + goods_receipt_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  purchase_order_id     UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  gr_number             TEXT NOT NULL,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by_user_id   UUID,
  status                TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','harvest_qbo','harvest_csv')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, gr_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_source_external
  ON public.goods_receipts (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goods_receipt_line_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id          UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id    UUID NOT NULL REFERENCES public.purchase_order_line_items(id) ON DELETE RESTRICT,
  quantity_received         NUMERIC(14,4) NOT NULL CHECK (quantity_received > 0),
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (goods_receipt_id, purchase_order_line_id)
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gr_service_all ON public.goods_receipts;
CREATE POLICY gr_service_all ON public.goods_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS grli_service_all ON public.goods_receipt_line_items;
CREATE POLICY grli_service_all ON public.goods_receipt_line_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS gr_firm_select ON public.goods_receipts;
CREATE POLICY gr_firm_select ON public.goods_receipts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = goods_receipts.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS grli_firm_select ON public.goods_receipt_line_items;
CREATE POLICY grli_firm_select ON public.goods_receipt_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.goods_receipts gr
      JOIN public.firm_memberships fm ON fm.firm_id = gr.firm_id
      WHERE gr.id = goods_receipt_line_items.goods_receipt_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 9: bill_history harvest-ready refactor (5 sub-steps)
-- =========================================================
ALTER TABLE public.bill_history
  ALTER COLUMN bill_id DROP NOT NULL;

ALTER TABLE public.bill_history
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'intake' CHECK (source IN ('intake','harvest_qbo','harvest_csv','manual')),
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS three_way_match_status TEXT CHECK (three_way_match_status IN ('matched','no_po','price_variance','quantity_variance','po_closed','not_evaluated')),
  ADD COLUMN IF NOT EXISTS three_way_match_signals JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.bill_history bh
SET company_id = fc.company_id
FROM public.firm_clients fc
WHERE bh.firm_client_id = fc.id AND bh.company_id IS NULL;

ALTER TABLE public.bill_history
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.bill_history DROP CONSTRAINT IF EXISTS bill_history_bill_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_bill_id
  ON public.bill_history (bill_id) WHERE bill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_source_external
  ON public.bill_history (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

ALTER TABLE public.bill_history
  DROP CONSTRAINT IF EXISTS bill_history_identity_check;
ALTER TABLE public.bill_history
  ADD CONSTRAINT bill_history_identity_check
  CHECK (
    bill_id IS NOT NULL
    OR (source IN ('harvest_qbo','harvest_csv') AND source_external_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_bill_history_firm_client_source
  ON public.bill_history (firm_client_id, source);

-- =========================================================
-- Chunk 10: vendor_master_mirror additive columns for baseline harvest
-- =========================================================
ALTER TABLE public.vendor_master_mirror
  ADD COLUMN IF NOT EXISTS baseline_source TEXT CHECK (baseline_source IN ('qbo','csv')),
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id);
CREATE INDEX IF NOT EXISTS idx_vendor_master_mirror_baseline_source
  ON public.vendor_master_mirror (firm_client_id, baseline_source)
  WHERE baseline_source IS NOT NULL;

-- =========================================================
-- Chunk 11: qbo_coa_mirror (read-only Chart of Accounts)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qbo_coa_mirror (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  external_account_id   TEXT NOT NULL,
  account_number        TEXT,
  account_name          TEXT NOT NULL,
  account_type          TEXT,
  account_subtype       TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  first_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, external_account_id)
);
ALTER TABLE public.qbo_coa_mirror ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_service_all ON public.qbo_coa_mirror;
CREATE POLICY coa_service_all ON public.qbo_coa_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS coa_firm_select ON public.qbo_coa_mirror;
CREATE POLICY coa_firm_select ON public.qbo_coa_mirror
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = qbo_coa_mirror.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 12: Extend ap_intake_ledger_event_types catalog (13 events)
-- =========================================================
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('requisition.created',           'user',   TRUE),
  ('requisition.submitted',         'user',   TRUE),
  ('requisition.approved',          'user',   TRUE),
  ('requisition.rejected',          'user',   TRUE),
  ('requisition.converted_to_po',   'user',   TRUE),
  ('purchase_order.created',        'user',   TRUE),
  ('purchase_order.closed',         'user',   TRUE),
  ('goods_receipt.recorded',        'user',   TRUE),
  ('three_way_match.evaluated',     'system', TRUE),
  ('three_way_match.hit',           'system', TRUE),
  ('baseline_harvest.started',      'user',   TRUE),
  ('baseline_harvest.completed',    'system', TRUE),
  ('baseline_harvest.failed',       'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717060000_d65_p2_block6a_requisitions_harvest_l3.sql

-- [ESC] RLS closure: no CREATE TABLE without ENABLE RLS in this slice.

-- [ESC] Function privilege closure before COMMIT
-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.
-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).
-- disposition public.engagement_posting_policy_preset_consistency() => trigger_only
REVOKE EXECUTE ON FUNCTION public.engagement_posting_policy_preset_consistency() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.engagement_posting_policy_preset_consistency() FROM anon;
REVOKE EXECUTE ON FUNCTION public.engagement_posting_policy_preset_consistency() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_posting_policy_preset_consistency() FROM service_role;
-- disposition public.pre_close_review_items_immutable() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM service_role;
-- disposition public.validate_assertions_array(text[]) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.validate_assertions_array(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_assertions_array(text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_assertions_array(text[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_assertions_array(text[]) FROM service_role;
-- disposition public.close_gap_review_items_touch_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.close_gap_review_items_touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_gap_review_items_touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_gap_review_items_touch_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.close_gap_review_items_touch_updated_at() FROM service_role;
-- disposition public.mfa_audit_log_prevent_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.mfa_audit_log_prevent_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mfa_audit_log_prevent_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mfa_audit_log_prevent_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mfa_audit_log_prevent_mutation() FROM service_role;
-- disposition public.user_webauthn_credentials_prevent_column_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.user_webauthn_credentials_prevent_column_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_webauthn_credentials_prevent_column_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_webauthn_credentials_prevent_column_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_webauthn_credentials_prevent_column_mutation() FROM service_role;
-- disposition public._d651_slugify_name(text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public._d651_slugify_name(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._d651_slugify_name(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._d651_slugify_name(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._d651_slugify_name(text) FROM service_role;
-- disposition public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text) TO service_role;
-- disposition public.next_document_number(uuid,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.next_document_number(uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_document_number(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_document_number(uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid,text) TO service_role;
COMMIT;
