# Org→Standards Edge (Phase 42.7D)

Adds a per-org attested framework election layer to the TreatmentResolver. When an org has an attested election in the sync election registry (Phase 42.7A.4), that election **overrides** what curated rules would have produced. If the override disagrees with the curated rules, a typed `OrgElectionDisagreement` advisory is emitted alongside the resolution — logged, never blocking.

## Why override wins
Founder governance attestation is the highest authority in the system. Curated rules encode general precedence; attested elections encode specific, signed, dated decisions for a specific org. Specific wins. The disagreement advisory ensures the override is auditable — humans can see when the codified rules disagree with the attested choice.

## Doctrine
- Pure inner core (`resolveTreatmentPure`) is not modified. The edge sits in the outer wrapper.
- Reader pattern is DI-only. Production injects `SyncRegistryOrgElectionReader`; tests inject doubles; absence falls back to `NullOrgElectionReader`.
- Single-entity lookup only. Consolidated walks are deferred to Phase 42.7D.1 (fail-loud if `consolidationContext` is passed).
- Load-once at construction. No live re-reads.

## Entry points
- `new SyncRegistryOrgElectionReader({ registryPath, validateRegistrySchema })` — production wiring
- `reader.read(orgId)` — returns `AttestedElection | null`
- `detectDisagreement(election, projection)` — pure function, returns `OrgEdgeDecision`

## Verification
`npm run verify:org-edge` runs 60 tests. The 42.7D verifier additionally runs `verify:treatment-resolver` and `verify:panel-consumer` to confirm no regression.
