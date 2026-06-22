DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.

# Log-Retention Configuration Baseline

## 1. Purpose

This document commits the baseline log-retention duration values consumed by the FM-1 resolver. Cross-reference FM-1 semantic from **42.5H Overlay Discipline**. The resolver implementation lives in **42.5D + 42.5H** (read-only); this document records the values it consumes.

Configuration source: `ops/compliance/retention/retentionBaseline.ts`.

## 2. Baseline Retention Table

| Category | Duration | Regulatory Floor | Citation | Decision Gate to Raise |
|---|---|---|---|---|
| HIPAA documentation | 2191 days (6 years) | YES — HARD | 45 CFR 164.316(b)(2)(i) | HIPAA counsel (H-7) |
| SOC 2 evidence logs | 730 days (24 months) | No | — | CPA auditor (Phase 42.6A) |
| Security incident logs | 2191 days (6 years) | YES | 45 CFR 164.316(b)(2)(i) via 164.308(a)(6) | HIPAA counsel + CPA |
| Application/system logs | 395 days (13 months) | No | — | CPA + counsel per jurisdiction (H-6) |

Baseline durations are **starting floors**; auditor and HIPAA counsel may raise at Phase 42.6 engagement.

## 3. FM-1 Resolver Semantic (cross-reference, not reimplemented)

Spine retention for a given tenant = **MAX** of:

- All applicable baseline category values
- All attached overlay floor values (e.g. HIPAA overlay)
- Per-tenant config values

Per-tenant config CAN RAISE retention; CANNOT LOWER below any floor (baseline or overlay). Attempts to lower emit a compliance-violation audit event (42.5D) and are IGNORED.

FM-1 resolver implementation: **42.5D + 42.5H** committed earlier. This document does NOT re-document the resolver; it documents the values the resolver consumes.

## 4. HIPAA 6-Year Floor Rationale

45 CFR 164.316(b)(2)(i): "A covered entity or business associate must retain the documentation required by paragraph (b)(1) of this section for 6 years from the date of its creation or the date when it last was in effect, whichever is later."

Applies to: policies and procedures, system activity reviews, sanction actions, incident response logs, BAA documentation, training records, security risk assessments, contingency plan tests, encryption key management records.

Conversion: 6 years × 365.25 (Julian average) = 2191.5 days → ROUND UP to 2191 days (round up = safer; rounding DOWN would violate the floor by 12 hours).

**Tenant deletion request handling:** HIPAA retention obligation OVERRIDES tenant deletion requests for HIPAA-overlay-tenant ePHI documentation. Process documented at **42.5V** HIPAA Compliance Pack (Wave 5).

## 5. Cross-Overlay Resolution Examples

**Example A — Non-healthcare tenant, application log:**

- Baseline application/system logs: 395 days
- No HIPAA overlay attached → no HIPAA contribution
- No per-tenant config → no per-tenant contribution
- **Resolved retention: 395 days**

**Example B — Healthcare-overlay tenant, ePHI audit event:**

- Baseline HIPAA documentation: 2191 days
- HIPAA overlay floor: 2191 days (45 CFR 164.316(b)(2)(i))
- **Resolved retention: MAX(2191, 2191) = 2191 days**

**Example C — Healthcare-overlay tenant, application log (non-PHI):**

- Baseline application/system logs: 395 days
- HIPAA overlay floor for non-PHI logs: 395 days (HIPAA Security Rule does not extend documentation floor to non-PHI application logs)
- Note: implementation must DETERMINE the log carries no PHI via the **42.5M** ingestion gate before applying the 395-day floor; if PHI tag present, log falls under HIPAA documentation = 2191 days.
- **Resolved retention: 395 days IF PHI-tag absent; 2191 days IF PHI-tag present.**

**Example D — Hypothetical jurisdiction-specific raise (deferred, illustrative):**

- Tenant resident in jurisdiction with 7-year application log retention requirement (illustrative; H-6 deferral)
- Jurisdiction overlay (future) declares 2557-day floor
- Resolved retention: MAX(395 baseline, 2557 jurisdiction overlay) = 2557 days
- **This case is NOT currently implemented. H-6 captures the deferral.**

## 6. Jurisdiction-Specific Deferral (H-6)

42.5T does NOT enumerate state-specific or country-specific retention requirements. At Phase 42.6 engagement, HIPAA counsel + CPA review jurisdiction reach (state laws, GDPR, sectoral overlays). Any jurisdiction-specific floor identified at engagement is added via overlay (not via baseline modification — preserves FM-1 architecture). Tracking: `docs/trust/retention/H6_JURISDICTION_DEFERRAL.md`.

## 7. Counsel May RAISE Rationale

Counsel review at LOCK-42.6.7 may identify additional retention obligations:

- State-specific privacy law floors (e.g. CCPA 12-month, CMIA-equivalent, NY SHIELD)
- Sectoral overlays (e.g. financial-services industry-specific retention)
- Customer-contractual retention requirements (separate from regulatory)

Any identified raise is implemented BEFORE LOCK-42.6.7 closure. Counsel review is NOT a 42.5T blocker; it is a Phase 42.6 obligation this document anticipates.

## 8. Evidence Collection (placeholder for engagement-time)

- Sample retention configuration applied to a sample tenant per category — auditor verifies resolver output matches baseline + overlays
- Sample purge-after-retention execution — auditor verifies records purged according to resolver-returned duration
- Deletion-request-handling evidence for HIPAA-overlay tenants — 42.5V process produces evidence

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.
