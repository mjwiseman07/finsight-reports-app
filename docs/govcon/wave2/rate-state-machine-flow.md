# FPRA → PBR → Final → ICS Rate-State Machine

All 4 indirect pools wired per Q2=A: overhead, G&A, fringe, materials-handling.

```
FPRA --(variance doc if over ceiling)--> PBR --> FINAL --> ICS
```

## Five reconciliation guarantees

1. No PBR exceeds FPRA ceiling without variance + dcaa-rate-audit
2. Every Final has PBR predecessor
3. ICS reconciles to Final within variance threshold or escalation-audit
4. Timestamp monotonicity (no backdating)
5. No mutation post-ICS-finalization
