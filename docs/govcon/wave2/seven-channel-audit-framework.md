# Seven-Channel Audit Framework

| # | Channel | Scope |
|---|---|---|
| 1 | treatment-resolver-audit | Standards |
| 2 | memory-framework-dimension | Standards |
| 3 | escalation-audit | Universal |
| 4 | panel-decision-audit | 42.7 |
| 5 | org-edge-audit | 42.7 |
| 6 | phi-access-audit | HC-2 |
| 7 | **dcaa-rate-audit** | **GC-2 (default-ON)** |

`dcaa-rate-audit` schema: evidenceVersion `GC.2.K-LOCK.0`, retention 7 years, `containsGovernmentContractData: true` on every event.

Single entry-point emitter enforced — no direct sink writes.
