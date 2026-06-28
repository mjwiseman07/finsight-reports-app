# Phase G7-C7a-3a — HC Assertion-Pack Scope Refinement

**Date:** 2026-06-28  
**Predecessor:** G7-C7a-3 (`591f8ef`)  
**State change:** 86/95/0 → **82/95/0**; satisfied 20 → **24**

## Purpose

Fix assertion-pack scope bug surfaced in C6.1 §2: §501(r) CHNA + community-benefit assertions were firing against taxable HC entities (CVS, HCA, THC, UHS) and producing false-positive gap entries. §501(r) is US IRC and applies only to §501(c)(3) tax-exempt hospitals.

## Changes

1. Precondition gate added to `assertion-packs/healthcare/chna-coverage.ts`
2. Precondition gate added to `assertion-packs/healthcare/community-benefit-coverage.ts`
3. New `assertion-packs/healthcare/taxable-hc-disclosure-coverage.ts` — ASC 606/842/326/280 battery for taxable HC class
4. CVS/HCA/THC/UHS corpus + fixtures tagged `tax_status: "taxable"` explicitly
5. Regression guard `tests/unit/healthcare-assertion-scope-bounds.test.ts`

## Closure mechanism

`closure_mechanism: "assertion-pack-scope-precondition"` — gaps closed by scope refinement, not emitter satisfaction. `emitter_path: null`.

**Note for C7b:** Consider promoting to triage enum `"out-of-scope"` in schema v1.2.0.

## Gaps closed (4)

| Gap ID | Filing | Entity class |
| --- | --- | --- |
| GAP-0085 | CVS-10k | taxable pharmacy_chain |
| GAP-0090 | HCA-10k | taxable hospital_system |
| GAP-0095 | THC-10k | taxable hospital_system |
| GAP-0100 | UHS-10k | taxable hospital_system |

## HC fix-now remainder (10)

bad-debt-vs-charity (5) + payor-mix (5) — later C7a dispatch.

## Framework non-comingling

§501(r) confined to §501(c)(3) hospital scope gates. Taxable HC entities receive ASC 606/842/326/280 assertions only.
