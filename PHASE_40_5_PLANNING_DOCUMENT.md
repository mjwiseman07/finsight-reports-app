# Phase 40.5 Planning Document - Final

## Integration & Connector Platform

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 40.5 - Integration & Connector Platform  
**Status:** Planning Locked - Ready for Cursor Implementation  
**Depends On:** Phase 40 locked - all 18 modules verified across Waves 1-6  
**Namespace:** `lib/intelligence/foundation/integrations/`  
**Verifier:** `scripts/verify-si-integration-platform.js`

## Purpose

Phase 40.5 is the hardened, governed integration layer every department and AI worker consumes to reach real external systems.

It bridges Advisacor's verified internal architecture from Phases 34-40 with real customer data. This is the first phase whose contracts describe connections to live external systems.

At this planning-and-contract layer, Phase 40.5 remains metadata and contract definitions only. Live connection execution is built and tested against real sandboxes in a later implementation pass, gated on real-data testing.

Nothing in Advisacor touches a real customer's books until this layer exists. Phase 40.5 is the true prerequisite for any customer pilot.

## Phase 40.5 Exit Criteria

Phase 40.5 is complete and lockable only when all of the following are true:

- Integration verifier exits `0`.
- TypeScript is clean across the namespace.
- Every connector has its own per-connector audit doc committed.
- No `executable: true` marker exists anywhere in the namespace.
- Phase 40 handoff hash matches across consuming modules.
- Per-tenant credential isolation is verified at both firm and client tenant levels.
- Every newly connected integration starts read-only.
- Write mode is off by default.
- Fail-closed behavior on credential error is verified.
- Fail-closed behavior on OAuth token refresh failure is verified.
- Webhook signature verification is enforced.
- Invalid webhook signatures fail closed.
- Inbound data classification is applied at ingress.
- Undetermined inbound classification fails closed to high sensitivity.
- Every connector operation produces a `ConnectorActivityEntry`.
- No credential value appears in any log, output, artifact, or URL.
- Cross-isolation test passes: no tenant A credential or data appears in any tenant B artifact.

## Phase 40.5 Non-Goals

Phase 40.5 does not include:

- Live execution of writes to customer systems in this contract layer.
- Storing credential or token values in plain text anywhere.
- Autonomous enabling of write mode.
- Bypassing Phase 39 or Phase 40 governance.
- New accounting, audit, or coordination capability.

Live execution is a later, separately tested pass.

## Non-Negotiable Guardrails

Every newly connected integration starts in read-only mode.

Write mode is a deliberate, separately approved customer action requiring:

- Explicit human approval by an authorized customer admin.
- Documented use case and scope.
- Acknowledgment of write-mode risk.
- Governance flowing through Phase 40.
- Audit trail entry in Phase 40P.
- Optional notification to a designated approver chain.

Read-only mode never produces any external write under any condition.

Every write action is recommendation-only by default. Write mode is enabled per integration only by explicit human approval.

Per-tenant credential isolation is mandatory. Tenancy is two-tier:

- `firmTenant` is the accounting firm.
- `clientTenant` is each client of the firm.

Credentials are isolated at both levels. A firm may not access a client tenant's connector credentials except through explicit client authorization recorded in Phase 40P governance.

All credentials are encrypted at rest, never logged, and never placed in artifacts, outputs, or URLs.

Credential failures fail closed. A credential failure stops the operation and surfaces the issue. It never proceeds with a fallback or partial credential.

OAuth token refresh failures fail closed. Tokens are referenced by handle only, never stored or passed in plain text.

Webhook signatures are verified on every inbound delivery. Invalid signatures fail closed.

Inbound data classification is applied at ingress:

- `containsPHI`
- `containsPII`
- `dataSensitivityTier`

If classification cannot be determined, the system defaults to high sensitivity and `containsPHI: true`.

Every output carries `executable: false`.

Every artifact carries separate:

- `customerIsolation`
- `firmIsolation`
- `clientIsolation`

Every artifact carries `containsPHI`.

All IDs are deterministic and derived using `stableSnapshotHash`.

All modules fail closed on missing identifiers.

No AI model inference is allowed in the connector layer.

Per-connector rate limiting and retry logic are required.

Connector health observation surfaces to Phase 40G Organizational Health.

Connection failure escalation surfaces to Phase 40F Escalation Intelligence.

Cross-tenant rate limit coordination prevents one tenant from consuming another tenant's share of upstream API capacity.

File-based connectors follow the same recommendation-only, fail-closed, isolation discipline as API connectors.

## Integrations In Scope

Phase 40.5 covers the following integration families:

- ERPs: QuickBooks Online, Xero, Sage Intacct, NetSuite, Microsoft Dynamics.
- Banking: Plaid, direct bank feeds, BAI2 files.
- Payments: Stripe, ACH processors, card networks.
- Document stores: Google Drive, SharePoint, Dropbox, Box.
- Email: Google Workspace, Microsoft 365.
- HRIS and payroll: Gusto, ADP, Rippling, Paychex.
- CRM: Salesforce, HubSpot.
- E-commerce: Shopify, Amazon, WooCommerce.
- EDI: AP and AR enterprise-scale trading partner flows.

Native connectors are built demand-first. QuickBooks comes first because the validated customer pipeline uses QuickBooks.

## Long-Tail Connector Coverage Strategy

The long tail is covered through three mechanisms:

- Universal canonical import/export path from Phase 39.
- File-based connectors for BAI2, OFX/QFX, CSV, Excel, EDI X12, and custom flat files.
- Future Phase 48 Expertise Marketplace for third-party connector contributions.

Native, file-based, canonical, and future marketplace connector paths all share the same contract layer and guardrails.

## Module Order

Every module from 40.5B onward imports contract types only from 40.5A. No module defines its own contract types.

### Wave 1 - Connector Foundation

- 40.5A Integration Contracts
- 40.5B Inbound Data Classification
- 40.5C Connector Activity Audit Trail
- 40.5D OAuth & Token Lifecycle
- 40.5E Webhook & Event Subscription Layer
- 40.5F Sync State Management
- 40.5G Connector Versioning
- 40.5H Data Residency Compliance
- 40.5I Connector Compliance Designation
- 40.5J Customer Connection Management
- 40.5K Credential Isolation & Vault Interface
- 40.5L Connector Framework
- 40.5M Connection Health & Failure Escalation

### Wave 2 - ERP Connectors

- 40.5N QuickBooks Connector
- 40.5O Xero Connector
- 40.5P Sage Intacct Connector
- 40.5Q NetSuite Connector
- 40.5R Microsoft Dynamics Connector

### Wave 3 - Data Source Connectors

- 40.5S Banking Connectors
- 40.5T Document Store Connectors
- 40.5U Email Connectors

### Wave 4 - Operational Connectors

- 40.5V Payments Connectors
- 40.5W HRIS / Payroll Connectors
- 40.5X CRM Connectors
- 40.5Y E-commerce Connectors
- 40.5Z EDI Connector

### Wave 4.5 - File-Based Connectors

- 40.5AA File-Based Connector Framework
- 40.5AB Secure File Upload & Ingestion

### Wave 5 - Verification and Lock

- 40.5AC Integration Platform Verifier
- 40.5AD Final Phase 40.5 Audit and Lock

## Wave 1 Detail

### 40.5A Integration Contracts

Defines the shared type-only contract layer.

Core contracts include:

- `ConnectorContract`
- `CredentialReferenceContract`
- `ConnectionHealthContract`
- `WriteModeContract`
- `RateLimitContract`

Core fields include:

- `connectorType`
- `connectorKind`
- `authModel`
- `readModeSupported`
- `writeModeSupported`
- `writeModeEnabled`
- `recommendationOnlyByDefault: true`
- `failClosedOnCredentialError: true`
- `credentialNeverLogged: true`
- `perTenantCredentialIsolation: true`
- `executable: false`
- isolation fields
- `containsPHI`

### 40.5B Inbound Data Classification

Every connector classifies inbound data at field level.

Classification includes:

- `containsPHI`
- `containsPII`
- `dataSensitivityTier`
- `inferredFromContent`

If classification cannot be determined, the artifact defaults to high sensitivity and `containsPHI: true`.

### 40.5C Connector Activity Audit Trail

Every connector interaction produces an immutable `ConnectorActivityEntry`.

The entry includes:

- connector ID
- tenant ID
- operation type
- timestamp
- request summary
- response status
- record count affected
- human approval reference for writes
- linked `RecommendationAuditEntry` for write recommendations

Entries are append-only, immutable, never edited or deleted, and support SOC 1, SOC 2, and HIPAA evidence workflows.

### 40.5D OAuth & Token Lifecycle

Defines OAuth contracts for connectors that support OAuth.

Tokens are referenced by vault handle only.

Refresh failures fail closed and trigger:

- Connection health degradation in 40.5M.
- Escalation through Phase 40F.
- Customer-facing reconnection prompt.

Token expiration during unattended operations is a Phase 40F escalation event.

### 40.5E Webhook & Event Subscription Layer

Defines webhook contracts for connectors that support inbound delivery.

Required behavior:

- Signature verification.
- Replay protection.
- Per-tenant endpoint discipline.
- Payload validation.
- Fail closed on invalid signature.
- `ConnectorActivityEntry` on receipt.

Webhook payloads are treated as untrusted external input.

### 40.5F Sync State Management

Maintains per-tenant sync state:

- `lastSyncTimestamp`
- `lastSyncCursor`
- `syncFrequency`
- `missedSyncWindowHandler`
- `staleDataThreshold`

Conflicting data across connectors produces a reconciliation candidate for human review. The system never silently chooses one source over another.

### 40.5G Connector Versioning

Every connector declares:

- `apiVersion`
- `apiVersionLifecycle`
- `apiVersionMigrationRequired`
- `lastUpstreamApiChangeReviewed`

Deprecated upstream API versions are verifier-flagged unless human review is recorded.

### 40.5H Data Residency Compliance

Connectors declare:

- supported regions
- default region
- region pinning support

A connector that cannot satisfy a required region fails closed and is not selectable for that entity.

### 40.5I Connector Compliance Designation

Connectors declare:

- SOC compliance status
- HIPAA BAA availability
- GDPR DPA availability
- data processing region

This feeds Phase 42.5 Trust & Compliance.

### 40.5J Customer Connection Management

Defines customer-facing connection management capabilities:

- View active connections.
- View connection health.
- View last sync time.
- Disconnect connector.
- Re-authenticate expired tokens.
- Toggle write mode with explicit consent.
- View connector activity audit trail.

Write mode enablement requires governance entry in Phase 40P.

### 40.5K Credential Isolation & Vault Interface

Defines credential reference model.

Credentials are referenced by handle, never stored or passed in plain text.

Credential isolation is enforced at both firm and client tenant levels.

Actual vault storage is implemented later and never stored in the repo.

### 40.5L Connector Framework

Defines the common connector abstraction:

- read mode
- write mode off by default
- rate limiting
- retry logic
- recommendation-only writes
- capability negotiation
- cross-tenant rate limit coordination
- sandbox/test mode

Test connections cannot enable write mode.

### 40.5M Connection Health & Failure Escalation

Connector health observations feed Phase 40G.

Connection failures feed Phase 40F.

Each connector defines:

- stale-data grace period
- customer alert grace period
- auto-suspend grace period
- reconnection playbook
- operational telemetry

Telemetry is operational metrics only. It does not profile customer behavior.

## Per-Connector Pattern

Each connector must:

- Conform to 40.5L Connector Framework.
- Import contract types only from 40.5A.
- Declare auth model and read/write capabilities.
- Start read-only.
- Keep write mode off by default.
- Require human approval for write mode.
- Preserve per-tenant credential isolation.
- Never log credentials.
- Classify inbound data at ingress.
- Produce `ConnectorActivityEntry` for every operation.
- Declare OAuth lifecycle where applicable.
- Verify webhook signatures where applicable.
- Maintain sync state.
- Declare API version lifecycle.
- Declare data residency and compliance metadata.
- Fail closed on credential, token, or connection error.
- Reuse Phase 39 ERP adapter contracts where applicable.
- Verify file integrity for file-based connectors.
- Maintain its own per-connector audit doc.

## Honest Implementation Note

Phase 40.5 has two layers:

- Contract layer: buildable now, metadata and static contracts only.
- Live execution layer: actual API calls, OAuth flows, real data pulls, webhook delivery, and sandbox testing.

The contract layer defines how integrations must behave. It does not prove a live connection works.

Every connector's live execution behavior goes on the real-data test register.

## Commercial & Operational Reality

Connector failures will likely be the largest support category.

Connector security incidents are the largest reputational risk.

Real-data connector testing is a significant investment and requires sandbox accounts, OAuth testing, malformed data testing, rate limit testing, token refresh testing, webhook testing, isolation stress testing, soak testing, and load testing.

## Verifier and Lock

### 40.5AC Integration Platform Verifier

The verifier checks:

- directory and file presence
- contract discipline
- deterministic IDs
- fail-closed handling
- `executable: false`
- isolation fields
- write-mode-off-by-default
- recommendation-only-by-default
- credential-never-logged
- firm/client tenant credential isolation
- credential error fail-closed
- connector health and escalation wiring
- cross-isolation
- banned runtime patterns

The verifier rejects:

- missing `ConnectorActivityEntry`
- OAuth connector without token lifecycle
- webhook receipt without signature verification
- inbound data without classification markers
- deprecated API version without human review
- write-capable connector with write mode enabled by default
- write mode enabled without Phase 40P governance entry
- file-based connector without integrity verification
- sandbox/test connection attempting write mode
- cross-connector conflict resolved without human review

The verifier uses Node.js built-ins only and exits `0` on pass, `1` on fail.

### 40.5AD Final Audit and Lock

The final audit reports each area as:

- `PASS`
- `PARTIAL`
- `FAIL`

Phase 40.5 locks only if every audit area passes.

## Namespace and Build Conventions

Namespace:

`lib/intelligence/foundation/integrations/`

Verifier:

`scripts/verify-si-integration-platform.js`

Build cadence:

One module at a time. Implement, verify, TypeScript, audit single module, commit, proceed.

## Recommended First Implementation

Begin with 40.5A Integration Contracts.

Then build 40.5B through 40.5M foundation modules.

Then build QuickBooks first as 40.5N.

Expand additional connectors demand-first.
