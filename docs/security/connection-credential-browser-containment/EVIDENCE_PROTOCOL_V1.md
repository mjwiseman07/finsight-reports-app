# CONTAINMENT_EVIDENCE_V1

## Frame

Exactly one stdout line (optional surrounding blank lines rejected if non-empty):

```
CONTAINMENT_EVIDENCE_V1:<base64url-utf8-json>
```

- Progress and diagnostics: **stderr only**
- Zero frames → `APPLICATOR_EVIDENCE_MISSING`
- Multiple frames → `APPLICATOR_EVIDENCE_MULTIPLE`
- Non-frame stdout content → `APPLICATOR_EVIDENCE_STDOUT_POLLUTED`
- Invalid base64url / UTF-8 / JSON / schema / version → fixed reason codes in `containment-evidence-protocol.js`
- Nonzero child exit **does not** suppress a valid frame

## Required JSON fields

`protocol_version`/`schema_version`, `result_code`, `reason_code`, `phase`, `evidence_source` (`sealed_applicator` | `native_wrapper_fallback`), `mode`, `read_only`, `databaseConnectionAttempts`, `sqlApplicationAttempts`, `advisory_lock_acquired`, `cleanup`, `credential_redaction_confirmation`, optional sanitized `uri_diagnostics`.

Wrapper fallbacks must label `evidence_source: native_wrapper_fallback` and must not present wrapper-observed counters as confirmed applicator values without the wrapper object.
