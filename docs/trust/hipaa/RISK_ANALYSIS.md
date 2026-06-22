> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Security Rule — Risk Analysis (PHI Path)

Per 45 CFR 164.308(a)(1)(ii)(A). **Field-level PHI classification is PLACEHOLDER until 42.5K closes** (Janice Q7a). Every field row below carries `42.5K-PENDING` — this is proof of the dependency, not a substitute for classification work.

## 1. Field inventory (reference only)

**Source of truth:** `PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md` (42N1) — not duplicated here. **minimumCellSize** canonical: Safe Harbor default **11** per **42.5L** Phase 42 HIPAA integration (`HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE`).

| field_name | minimum_cell_size | phi_classification |
|---|---|---|
| kpi_net_days_in_ar | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_gross_days_in_ar | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_cash_collection_pct | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_gross_collection_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_denial_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_clean_claim_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_days_cash_on_hand | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_operating_margin | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_bad_debt_pct_gross | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_charity_care_pct_gross | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_cost_to_charge_ratio | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_ar_aging_buckets | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_dnfb_days | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_pos_collection_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_case_mix_index | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_alos | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_occupancy_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_block_utilization | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_wrvu_per_fte | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_hh_visits_recert | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_adc | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_readmission_rate | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_hcahps | 11 | 42.5K-PENDING — Janice Q7a classification input required |
| kpi_pdpm_nta_acuity | 11 | 42.5K-PENDING — Janice Q7a classification input required |

## 2. Threat enumeration

Standard HIPAA risk-analysis threat categories assessed against each safeguard category (administrative, physical, technical, organizational, documentation):

| Threat category | Description | Safeguard categories assessed |
|---|---|---|
| Unauthorized access | Access by persons or systems without appropriate authorization | Administrative, technical, physical |
| Improper disclosure | PHI disclosed outside permitted uses or minimum necessary | Administrative, technical, organizational |
| Alteration / destruction | Unauthorized modification or deletion of ePHI | Technical, administrative, documentation |
| Denial of availability | Interruption of access to systems containing ePHI | Administrative (contingency), technical |

## 3. Likelihood / impact rating

**DEFERRED to 42.5K closure.** Cannot assign field-level likelihood or impact without Janice Q7a PHI-adjacent-field classification. Ratings will be populated when 42.5K closes and this document is re-run.

## 4. Risk treatment

High-level treatment categories (specific per-field treatment **DEFERRED to 42.5K closure**):

| Treatment | Description |
|---|---|
| Mitigate via spine control | Universal control spine (isolation, RBAC, audit, encryption, PHI ingestion gate) |
| Mitigate via overlay safeguard | HIPAA overlay safeguards path (**42.5K** when closed) |
| Transfer via BAA | Subprocessor with PHI access under executed BAA per **42.5U** |
| Accept with documented rationale | Residual risk accepted with founder + alternate review |

## 5. Re-analysis triggers

Re-run this risk analysis when:

1. **42.5K closes** — replace placeholder field classification
2. **42.5Q boundary changes** — any `socScopeBoundary.getDeclaredBoundary()` update
3. **New subprocessor with PHI access** — **42.5U** registry change
4. **Spine code change** touching `ops/compliance/spine/` or `ops/control-spine/`

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
