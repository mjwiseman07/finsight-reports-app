DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.

# Business Continuity and Disaster Recovery Plan (D9)

## 1. Scope

**In continuity scope:**

- Advisacor production application
- Customer data store
- HIPAA overlay audit log store
- Identity/authentication state
- Secrets/key custody (cross-reference **42.5E**)

**Out of scope:**

- Marketing, billing, CRM systems (separate continuity considerations)

## 2. Recovery objectives (starting targets — auditor confirms)

- **RPO (Recovery Point Objective): ≤ 24 hours** — maximum acceptable data loss from incident time to most recent recoverable backup
- **RTO (Recovery Time Objective): ≤ 72 hours** — maximum acceptable time from incident declaration to restored service

Rationale: two-person shop; accounting/financial-automation workload (not 24/7 critical-care); customer expectations consistent with SaaS accounting tools at this stage. Auditor and engaged HIPAA counsel review at Phase 42.6.

## 3. Backup strategy

- **Database:** full daily backup + transaction log shipping; retained per **42.5T**
- **Object storage:** versioned + cross-region replicated
- **Secrets/keys:** backed up to separate custody per **42.5E**
- **Source code:** hosted at GitHub (`mjwiseman07/finsight-reports-app`) + local-machine replicas on both founders' workstations
- **Audit logs (HIPAA):** retained per **42.5T** (HIPAA-overlay retention floor, typically 6+ years)

## 4. HIPAA contingency-plan ties (D3 cross-reference)

45 CFR 164.308(a)(7) requires:

| Requirement | Coverage |
|-------------|----------|
| (i) Data backup plan | Section 3 |
| (ii) Disaster recovery plan | Section 5 |
| (iii) Emergency mode operation plan | Section 6 |
| (iv) Testing and revision procedures | Section 7 |
| (v) Applications and data criticality analysis | Section 8 |

## 5. Disaster recovery procedure (high level)

1. **Incident declaration:** either founder may declare; declaration triggers founder-2 notification within 30 minutes
2. **Damage assessment:** ≤ 4 hours from declaration
3. **Recovery decision** (full restore vs partial vs failover): ≤ 8 hours from declaration
4. **Service restoration target:** ≤ 72 hours (RTO) from declaration
5. **Post-incident review:** written report within 14 days; lessons feed D8/D9/D10 updates

## 6. Emergency mode operation

If production cannot be restored within RTO, customer notification within 24 hours of declaration. Customer-side read-only data export available via separate disaster portal (placeholder — design at engagement).

## 7. Testing and revision (compensating control for two-person shop)

- Quarterly tabletop exercise (founders walk through scenario)
- Annual full-restoration test from backup to isolated environment (auditor witnesses at engagement)
- Tested-restoration log retained per **42.5T** (template: `TESTED_RESTORATION_LOG_TEMPLATE.md`)
- Plan revised on any (a) infrastructure change, (b) HIPAA-overlay scope change, (c) tested-restoration deviation

## 8. Applications and data criticality analysis

| Tier | Systems | Recovery priority |
|------|---------|-------------------|
| Tier 1 | Authentication, customer data store, audit log store | Cannot operate without |
| Tier 2 | Reporting/dashboards, panel rendering | Degraded operation acceptable |
| Tier 3 | Marketing dashboards, internal analytics | Deferred during recovery |

## 9. Compensating controls for two-person shop

- No single-founder dependency: both founders have full disaster-recovery credentials in offline custody
- Disaster credentials retrieval procedure documented; tested annually
- Family-emergency continuity: founder unavailability > 72 hours triggers contingency notification to engaged CPA + HIPAA counsel at Phase 42.6 time

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.
