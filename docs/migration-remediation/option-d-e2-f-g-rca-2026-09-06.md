# Root cause — E2 / F / G (Option D session 4f4b9309)

## E2 — Patent #6 `previous_event_hash` null

**Classification: fixture / schema-only suite environment** (not a production chaining defect).

`publish_ledger_event` is a **global** Merkle chain via `ledger_chain_head` id=1.  
`previous_event_hash := head.current_event_hash` before insert. Seed migration inserts the singleton `(1, -1, NULL)`.

Option D PR #312 suite DB is schema-only with **zero application rows**, so the head singleton is absent. Every publish then yields `previous_event_hash=NULL` and never advances the head. Reservation + transition still share `aggregate_type=journal_entry_execution` and the same `aggregate_id`.

**Remediation:** seed `ledger_chain_head` singleton in JE reuse seed ops. Do not accept a null predecessor in E2. No forward migration required.

## F — status vs state_version precedence

**Classification: fixture / sequencing** (RPC order is authoritative).

Transition validates **status concurrency before state_version**. After E, `IDS.execution` is `READY_TO_POST`/v2; F still sent `RESERVED`/v1 → status conflict message.

**Contract:** when expected status mismatches, raise status concurrency conflict; state_version is only checked when status matches.

**Remediation:** isolate F while status is still `RESERVED` with a stale `p_expected_state_version` (run F before E; keep SAVEPOINT + health probe).

## G — idempotency CHECK 23514

**Classification: fixture** (`"h"` ∉ `[a-f0-9]`).

CHECK: `idempotency_key ~ '^[a-f0-9]{64}$'`. `"h".repeat(64)` fails before PRECHECK_FAILED transition. Uncontained error aborted the suite txn → H–J 25P02.

**Remediation:** use a valid distinct hex key (e.g. `"0"×64`); keep G as a success path (no rejection SAVEPOINT); add post-G transaction-health probe.
