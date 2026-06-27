# Architecture-Lane Locks — Master Registry

This directory is the authoritative registry of every LOCK-* annotated tag in this repository. Each entry below corresponds to a single annotated tag. Tag is on the LOCK commit (Commit 3 of the three-commit chain), NEVER on the SHA-fill follow-up commit.

## Registry entries

### LOCK-GC-1 — GovCon/DCAA Wave 1 Reconnaissance Lock

| Field | Value |
|---|---|
| Lock ID | LOCK-GC-1 |
| Vertical | Government Contracting / DCAA-Compliant |
| Wave | 1 (Reconnaissance) |
| Date | 2026-06-25 |
| Baseline SHA | 5814c8d (LOCK-HC-2 SHA-fill) |
| Lock SHA | ca5f35f |
| Attestation | [LOCK-GC-1-Attestation.md](./LOCK-GC-1-Attestation.md) |
| Founder approval | "Approve all defaults" (2026-06-25 02:17 EDT) + "I will go with what you recommend" (2026-06-25 02:27 EDT) |
| Overdelivery | +60% (64 / 40 cases) |

### LOCK-GC-2 — GovCon/DCAA Wave 2 Strong-Build Lock

| Field | Value |
|---|---|
| Lock ID | LOCK-GC-2 |
| Vertical | Government Contracting / DCAA-Compliant |
| Wave | 2 (Strong Build) |
| Date | 2026-06-26 |
| Baseline SHA | 14edb99 (LOCK-GC-1 SHA-fill) |
| Lock SHA | d6ea0ffd3cb9faa9036843c9b02e0cdf341b45d0 |
| Attestation | [LOCK-GC-2-Attestation.md](./LOCK-GC-2-Attestation.md) |
| Founder approval | "Approved" (2026-06-26 19:05 EDT — all 18 §15 defaults) |
| Overdelivery | +97% structural (79/40), +20% K-V (30/25), +50% anti-pattern (12/8), 121 total |

### LOCK-CON-1 — Construction Wave 1 Reconnaissance Lock

| Field | Value |
|---|---|
| Lock ID | LOCK-CON-1 |
| Vertical | Construction |
| Wave | 1 (Reconnaissance) |
| Date | 2026-06-26 |
| Baseline SHA | 5432ea0 (LOCK-GC-2 SHA-fill) |
| Lock SHA | 813b96d80f4585653ca4ed7808601119989d059b |
| Attestation | [LOCK-CON-1-Attestation.md](./LOCK-CON-1-Attestation.md) |
| Founder approval | "Approved" (2026-06-26 21:14 EDT — all 18 §15 defaults at A) |
| Verifier | verify-con-1.js 15/15 |

### LOCK-CON-2 — Construction Wave 2 Strong-Build Lock

| Field | Value |
|---|---|
| Lock ID | LOCK-CON-2 |
| Vertical | Construction |
| Wave | 2 (Strong Build) |
| Date | 2026-06-26 |
| Baseline SHA | 17bdde4 (LOCK-CON-1 SHA-fill) |
| Lock SHA | 928a377e24a4211754d7aa0201323f5dd1600670 |
| Attestation | [LOCK-CON-2-Attestation.md](./LOCK-CON-2-Attestation.md) |
| Founder approval | "Approved" (2026-06-26 21:58 EDT — all 20 §15 defaults at A) |
| Verifier | verify-con-2.js 121/121 |

### LOCK-PS-1 — Professional Services Wave 1 Reconnaissance Lock

| Field | Value |
|---|---|
| Lock ID | LOCK-PS-1 |
| Vertical | Professional Services |
| Wave | 1 (Reconnaissance) |
| Date | 2026-06-26 |
| Baseline SHA | 66960c9 (LOCK-CON-2 SHA-fill) |
| Lock SHA | PENDING_SHA_FILL |
| Attestation | [LOCK-PS-1-Attestation.md](./LOCK-PS-1-Attestation.md) |
| Founder approval | "approved" (2026-06-26 23:03 EDT — all 20 §15 defaults at A) |
| Verifier | verify-ps-1.js 15/15 |

## Retrofit backlog (housekeeping — out of GC-1 scope)

These prior locks pre-date this `locks/` registry pattern. They will be back-filled into INDEX.md in a future Phase 42.7H housekeeping commit:

- LOCK-41.5 (Standards Intelligence, 88b4771)
- LOCK-42.7 (Architecture lane, fc0cb43)
- LOCK-FA-2 (Fund Accounting, d19a4b4, +80%)
- LOCK-HC-2 (Healthcare/PHI, ee64120, +97%, SHA-fill 5814c8d)

Until retrofit, the canonical record for these locks is the REGISTRY_CHANGE_LOG entries and their respective root-level attestation files (where present).
