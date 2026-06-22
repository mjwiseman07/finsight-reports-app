DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.

# Change Management Procedure (D10)

## 1. Scope

**Changes requiring this procedure:**

- Any commit to `main` of `finsight-reports-app`
- Any commit to phase-locked branches that touches a previously locked phase
- Any infrastructure change (cloud config, secrets rotation, dependency upgrade)
- Any HIPAA-overlay configuration change

**Out of scope:**

- Documentation-only edits to `docs/trust/` drafts (including this procedure)
- Planning documents (`PHASE_*_PLANNING_DOCUMENT.md`, etc.)

## 2. Change request

- Originated as a git branch + PR (GitHub)
- PR description must state: **WHAT** changes, **WHY**, scope (spine? overlay? Phase 42 industry? docs?), expected verifier/probe impact (CHK count changes? PC changes?)
- For spine/overlay changes: PR must state which **CHK-XX** and **PC-XX** are affected
- For docs-only operational drafts: brief change rationale sufficient

## 3. Peer review (compensating control for two-person shop)

- **Peer = the OTHER founder** (not self-review)
- Peer reviewer checks:
  - (a) Code/doc correctness
  - (b) Verifier + probe both green pre-merge
  - (c) Phase-ledger discipline (no rewriting locked phase history)
  - (d) DRAFT banner discipline on trust docs
- If peer reviewer is unavailable > 72 hours: change waits. No emergency self-merge to `main`. Hotfix path (section 4) is the only exception.

## 4. Hotfix path (Critical CVSS or active-incident only)

- Single-founder commit permitted **ONLY** for Critical CVSS patch or active production incident
- Both founders paged simultaneously at hotfix initiation
- Peer review required post-hoc within 24 hours
- Hotfix logged in exception register; auditor reviews exception count at engagement

## 5. Rollback procedure

- Every change must declare its rollback path in the PR description
- **Spine/overlay changes:** rollback = `git revert <commit>` + re-run verifier + probe to confirm prior-state recovery
- **Infrastructure changes:** rollback path documented in PR; tested in non-prod where feasible
- **DB migrations:** forward-compatible OR reversible migration script committed alongside

## 6. Change log

- The **git ledger IS the primary change log**
- Phase-locked commits never history-rewrite; force-push forbidden
- Tags applied at LOCK-42.5.X / LOCK-42.6.X gates
- Phase 42 immutable lock at `b11adcd` is the canonical example

## 7. Compensating controls for two-person shop

- No "founder X owns module Y exclusively" — both founders peer-review every module
- No "founder X waives review for founder Y" — the procedure is symmetric
- Quarterly review of merged-without-peer-review hotfixes; if count > 2 per quarter, procedure tightened or staffing reconsidered

## 8. Evidence collection (placeholder for engagement-time)

- Sample of PRs from observation window reviewed by auditor
- Peer-review presence/absence audited per PR
- Hotfix exception register reviewed
- Rollback test execution (any one) demonstrated during engagement

Change log retention: per **42.5T** log-retention baseline.

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.
