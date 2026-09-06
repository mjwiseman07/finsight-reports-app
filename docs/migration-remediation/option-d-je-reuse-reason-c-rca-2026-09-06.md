# Root cause — test C reuse_reason + 25P02 cascade

## Classification (C)

**Incorrect fixture/input construction**, with a binding-definition gap that made the intended approval-ID proof unreachable.

1. Test C only overrode `id` and reused A/B’s `"c"×64` idempotency key.
2. RPC lookup is key-first, then approval_id. Same key → `reuse_reason='idempotency_key'` (correct for those inputs).
3. Intended C proof: same approval + same business binding + **distinct** valid 64-hex key → `reuse_reason='approval_id'`.
4. `je_execution_immutable_binding_matches` incorrectly treated `idempotency_key` as an immutable binding field, so a distinct key could never reuse via approval_id (would raise binding conflict). Key is a lookup identity (`UNIQUE`), not part of approval-level business binding.

Not classified as: incorrect test expectation alone; incorrect returned reason for the submitted inputs; or wrong key-before-approval precedence.

## Authoritative reuse-reason contract

| Inputs | Result |
|--------|--------|
| Same idempotency key + same binding | `reused`, `reuse_reason=idempotency_key` (test B) |
| Different idempotency key + same approval + same business binding | `reused`, `reuse_reason=approval_id` (test C) |
| Same approval + conflicting business binding | `je_execution_binding_conflict` (test D) |
| Same key + conflicting business binding | `je_execution_binding_conflict` |
| Invalid idempotency grammar | check constraint fail-closed |

Precedence remains: **idempotency_key lookup first**, then **approval_id**. Unique constraints unchanged.

## Exact C inputs (remediation)

- `approval_id` = A’s approval (`IDS.approval`)
- `idempotency_key` = distinct `d`×64 (not `c`×64)
- Business binding fields identical to A (proposal/hashes/connection/etc.)
- Event payload `idempotency_key` matches the distinct key
- New execution `id` for the attempt row payload (reuse returns existing row)

## 25P02 cascade source

**D** (passed expected rejection): `RAISE EXCEPTION je_execution_binding_conflict` on the shared suite `BEGIN` without SAVEPOINT. C’s assertion failure does not abort SQL. E–J then fail with SQLSTATE **25P02**. F/H are also expected-rejection sites and need the same SAVEPOINT wrapper so they cannot become the next poison source.
