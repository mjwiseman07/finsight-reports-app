# G7-C7a-2b — FA Top-Holdings + SPY-NQ + VFIAX-NCSR Remainder (dispatch slot)

**Status:** Planned — batch-execute after C7a-8, **before C7a-9**  
**Predecessor (batch):** C7a-1b  
**Does not expand C7a-2** — FA remainder mopped in dedicated dispatch sub-commit

## Dispatch batch sequence (C7a-8 → C7a-9)

```
C7a-1 ✓ → C7a-2 ✓ → C7a-3 → C7a-3a → C7a-4 → C7a-5 → C7a-6 → C7a-7 → C7a-8
  → C7a-1b (CON remainder)
  → C7a-2b (FA remainder)   ← this slot
  → C7a-9 → … → C7a-15
```

## `-b` remainder slot convention

After each primary `C7a-N` sub-commit completes, if that vertical still has `fix-now` gaps beyond the closed cluster, document a `C7a-Nb` dispatch slot — **do not retroactively expand** the primary commit. All `-b` slots batch-execute between C7a-8 and C7a-9. Document each slot as it surfaces during primary execution.

| Slot | Vertical | Gaps | Status |
| --- | --- | --- | --- |
| C7a-1b | CON | 8 | Planned — see `C7a-1b.md` |
| C7a-2b | FA | 12 | Planned — this doc |

## Scope

- **Top-holdings cluster** — GAP-0034, GAP-0041, GAP-0048, GAP-0055
- **SPY-NQ cluster** — GAP-0044, GAP-0045, GAP-0047, GAP-0049 (nav / expense / portfolio / realized-unrealized; top-holdings overlaps GAP-0048 above)
- **VFIAX-NCSR cluster** — GAP-0051, GAP-0052, GAP-0054, GAP-0056 (nav / expense / portfolio / realized-unrealized; top-holdings overlaps GAP-0055 above)
- Any other `fa` + `triage=fix-now` still open after C7a-2

## Enumeration at execution

```bash
node scripts/gap-register-export.js --filter triage=fix-now --vertical fa --output reports/c7a-2b-queue.json
```

## Rationale

C7a-2 closed 8 gaps (FXAIX-NCSR + IVV-NCSR nav / expense / portfolio / realized-unrealized). FA fix-now remainder exceeds that cluster boundary; routing to C7a-2b keeps primary sub-commit scopes clean and mirrors the CON → C7a-1b pattern.

## Expected state change (at execution)

87 fix-now / 19 satisfied → **75 fix-now / 31 satisfied** (−12 fix-now, +12 satisfied)

## Current FA fix-now remainder (post C7a-2, as of `50d4108`)

### Top-holdings cluster (4)

| Gap ID | Filing | Assertion |
| --- | --- | --- |
| GAP-0034 | FXAIX-NCSR | top-holdings |
| GAP-0041 | IVV-NCSR | top-holdings |
| GAP-0048 | SPY-NQ | top-holdings |
| GAP-0055 | VFIAX-NCSR | top-holdings |

### SPY-NQ cluster (4 unique assertions)

| Gap ID | Filing | Assertion |
| --- | --- | --- |
| GAP-0044 | SPY-NQ | nav-computation |
| GAP-0045 | SPY-NQ | expense-ratio |
| GAP-0047 | SPY-NQ | portfolio-composition |
| GAP-0049 | SPY-NQ | realized-unrealized-gains |

### VFIAX-NCSR cluster (4 unique assertions)

| Gap ID | Filing | Assertion |
| --- | --- | --- |
| GAP-0051 | VFIAX-NCSR | nav-computation |
| GAP-0052 | VFIAX-NCSR | expense-ratio |
| GAP-0054 | VFIAX-NCSR | portfolio-composition |
| GAP-0056 | VFIAX-NCSR | realized-unrealized-gains |

**Total: 12 gaps** (top-holdings counted once per filing; SPY/VFIAX reuse C7a-2 emitters where assertion overlaps).
