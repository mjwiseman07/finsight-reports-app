# Executable squash/baseline candidate — Option 2 txn remediation 2026-09-06

**Authorization:** candidate transaction-boundary remediation only.  
**PR #314:** draft. **Chosen model:** OPTION_2_SECURE_MULTI_VERSION_SPLIT.

## Bound pins
- From PR HEAD: `142fa46ec9cc46de71dee88e2526ffc123d3172b`
- Candidate ancestor: `9b0c3b1a…` seal `99f556…` / 1,130,762 bytes
- Option D: SHA-256 `9dc080cf…` · 151 entries

## Compatibility basis
See `docs/migration-remediation/evidence/executable-squash-candidate-module4-txn-compatibility.json`.

## Marker bookkeeping (138 vs 139)
- **138** = Option D assembled files in app+security splits
- **+1** ESC remediation patch begin marker (not an Option D entry)
- Prior review’s “139” counted both; authoritative OD accounting remains **144+6+1=151**

## Next
Third independent source review. No Docker/SQL/dump until PASS_SOURCE_REVIEW.
