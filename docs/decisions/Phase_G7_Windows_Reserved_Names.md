# Phase G7 — Windows Reserved Device Names

**Decision date:** 2026-06-27  
**Commit:** G7-C5.5e (SHA filled at commit time)  
**Status:** LOCKED for G7 external-truth corpus

## Problem

Windows reserves certain path segments as device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`). Git on Windows cannot index files under `tests/external-truth/filings/con/`, even though Node.js and editors can read them via special paths.

Construction vertical id in metadata is **`con`** (per G7 planning). On-disk folder must use a safe alias.

## Decision

| Vertical id (metadata) | On-disk folder | Rationale |
| --- | --- | --- |
| `con` | `construction/` | Avoid `CON` reserved name; preserve vertical id in `source.json` / `extracted.json` |

Mapping implemented in `scripts/external-truth/lib/verticalFolderName.ts` and re-exported from `scripts/external-truth/utils.ts` via `filingDir()`.

## Precedent

Same pattern as npm packages renaming `con` folders on Windows CI. Advisacor applies alias only at filesystem boundary; validators and gap register continue to use vertical id `con`.

## Auditor notes

- All construction filings: `source.json.vertical === "con"`, path contains `filings/construction/`.
- Cross-platform clones on Linux/macOS may use either name in docs; **Windows canonical path is `construction/`**.
- No framework comingling: folder alias does not alter `framework` or `frameworkBinding` fields.

## SHA placeholder

Parent commit for this decision: see `git log -1` on G7-C5.5e.
