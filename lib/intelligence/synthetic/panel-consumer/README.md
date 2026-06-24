# Industry Panel Consumer (Phase 42.7C)

Vertical-agnostic consumer that loads the 9 founder-authored AI worker job descriptions (Tier 1 baseline) and an optional per-company narrowing overlay (Tier 2), accepts work items from Phase 39 modules 12 and 10 via concrete readers, and routes each item through a 3-branch capability gate: **execute / hire-up / escalate**.

## Doctrine
- **Human-worker parity:** every capability claim carries an explicit parity assertion vs a human worker at the same level. Gaps are flagged `humanOnlyForNow: true` with a documented reason and roadmap pointer. AI worker = worker, not tool.
- **Not a replacement for human:** every JD repeats `isNotReplacementForHuman: true`. Every `HireUpRecommendation` carries `humanFallbackAvailable: true`. The founder remains the named universal-scope fallback at `mwiseman@advisacor.com`.
- **Phase 39 LOCK:** this consumer reads from Phase 39 via locked module interfaces only. No edits inside `phase39/`.
- **Phase 38 only for I/O:** the consumer performs zero direct external I/O. All real-world I/O is dispatched through Phase 38 transports injected at the execution boundary.
- **Narrowing-only overlays:** company JDs may restrict their AI worker further but cannot expand beyond the founder's attested baseline.

## Entry points
- `loadBaseline()` — reads `worker-job-descriptions.json`, validates schema, returns immutable `BaselineJobDescription[]`.
- `CapabilityGate.decide(item, currentPersonaId)` — returns a typed `RoutingDecision`.
- `Phase39EmailIntakeReader`, `DashboardTaskQueueReader` — concrete `WorkItemReader` implementations.

## Verification
`npm run verify:panel-consumer` runs 87 tests across schema, overlay merge, intake readers, capability gate, hard-stop precedence, external-I/O containment, parity disclosure, Phase 39 LOCK invariant, Phase 38-only invariant, and deterministic evidence.
