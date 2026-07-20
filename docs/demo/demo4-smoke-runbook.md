# Phase DEMO-4 — RA + RA Pro Smoke Runbook

**Purpose:** End-to-end validation that Review Assist (RA) and Review Assist Pro (RA Pro) demo firms behave correctly across the super-admin picker, holder bind, QBO OAuth-as-holder, Pulse, and (RA Pro only) Audit-Ready PBC ingest. Run after every deploy that touches demo plumbing, entitlements, Pulse, or Audit-Ready.

**Prerequisites (merged to main):**

| Commit | Phase |
|--------|--------|
| `a40d99c` | DEMO-1 — `pilot_slots` tier_key constraint |
| `71e6267` | DEMO-2 — RA + RA Pro seed |
| `dee283b` | DEMO-3A — `/admin/demo-accounts` picker (bind / assume / release) |
| `20aeaba` | DEMO-3B — OAuth-as-holder + dual-write |
| `4a0c19a` | Hotfix — account settings “Back to dashboard” |
| Env | `DEMO_OAUTH_SIGNING_KEY` in Vercel Development + Preview + Production |

**Environment:** Preview deployment preferred (or Production once DEMO-3B has propagated).

**Signed in as:** `mwiseman@advisacor.com` (super-admin) throughout, unless a fail-fast step says otherwise.

**Source of truth for IDs:** `lib/demo/constants.ts` — never hard-code UUIDs elsewhere.

---

## Schema / API truth (corrections vs early drafts)

Use these names — older drafts referred to `audit_events`, `super_admin_assume`, and `demo-account-mode`.

| Concern | Actual (shipped) |
|---------|------------------|
| Audit table | `public.audit_logs` |
| Assume event | `super_admin_impersonate_firm_start` |
| Release event | `super_admin_impersonate_firm_end` |
| Bind event | `super_admin_bind_demo_holder` |
| Connect-as-holder start | `super_admin_connect_as_holder_start` |
| Connect-as-holder success | **Not written yet** (callback logs only; no `_success` audit row) |
| Impersonation cookie | `advisacor_impersonate_firm_id` (httpOnly, 4h TTL) |
| Bind body | `{ firmClientId, holderUserId }` — **not** `firmId` / `holderEmail` |
| Connect-as-holder body | `{ firmId, holderUserId }` — **not** `holderEmail` |
| Firm display names | `Advisacor Demo — Review Assist Firm` / `… Review Assist Pro Firm` |
| Picker actions | **Assume this firm** / **Release** / **Connect QBO** / **Bind** |
| Bind precondition | Holder must have `accounting_connections.status = 'connected'` — **Connect QBO before Bind** |
| Cookie consumers | Cookie is set/cleared by the picker; **dashboard routes do not yet read it as an override** (DEMO-3A note). Treat Assume as a verified cookie + audit marker; firm-scoped UI may still need explicit firm/client context until a follow-up wires the cookie. |

---

## Fixed IDs (from `lib/demo/constants.ts`)

| Key | Value |
|-----|--------|
| Super-admin user | `a4ebf834-a698-4f79-a945-8498f2e6c45d` |
| RA firm | `11111111-1111-1111-1111-111111111111` |
| RA Pro firm | `22222222-2222-2222-2222-222222222222` |
| RA firm_client | `41111111-1111-1111-1111-111111111111` |
| RA Pro firm_client | `42222222-2222-2222-2222-222222222222` |
| RA company | `31111111-1111-1111-1111-111111111111` |
| RA Pro company | `32222222-2222-2222-2222-222222222222` |
| RA Slot 1 email | `demo-ra-sandbox-1@advisacor.internal` |
| RA Pro Slot 1 email | `demo-rapro-sandbox-1@advisacor.internal` |

Resolve holder auth user ids at smoke time:

```sql
SELECT id, email
FROM auth.users
WHERE email IN (
  'demo-ra-sandbox-1@advisacor.internal',
  'demo-ra-sandbox-2@advisacor.internal',
  'demo-ra-sandbox-3@advisacor.internal',
  'demo-rapro-sandbox-1@advisacor.internal',
  'demo-rapro-sandbox-2@advisacor.internal',
  'demo-rapro-sandbox-3@advisacor.internal'
)
ORDER BY email;
```

---

## Test matrix

| Scenario | RA | RA Pro | Expected |
|----------|:--:|:------:|----------|
| Sign in as super-admin | ✓ | ✓ | `/admin/demo-accounts` reachable |
| Assume firm (cookie + audit) | ✓ | ✓ | Cookie set; audit row written |
| Connect QBO as holder Slot 1 | ✓ | ✓ | Connection on **holder** `user_id`; picker shows Connected |
| Bind Slot 1 (after Connect) | ✓ | ✓ | `firm_clients.owner_user_id` = holder id |
| Cross-firm bind / connect | ✓ | ✓ | **403** |
| Pulse QBO question | ✓ | ✓ | Answer cites QBO data from holder sandbox |
| Audit-Ready PBC ingest | — | ✓ | Parse succeeds; request items listed |
| Audit-Ready blocked on RA | ✓ | — | 403 / upgrade gate / no PBC UI |

---

## Section 1 — Super-admin picker smoke (both tiers)

### 1.1 Sign in as super-admin

1. Open Preview URL in a fresh incognito window.
2. Navigate to `/signin` (or `/sign-in` if that alias exists — use the live sign-in path).
3. Sign in as `mwiseman@advisacor.com` (complete MFA if challenged).
4. Land on `/dashboard` (or continue after MFA).

**Pass:** No errors, no redirect loops, authenticated session established.

### 1.2 Open the demo accounts picker

1. Navigate to `/admin/demo-accounts`.

**Pass:** Page loads. Two firm sections:

- `Advisacor Demo — Review Assist Firm`
- `Advisacor Demo — Review Assist Pro Firm`

Each lists **three** holder slots (emails `@advisacor.internal`).

**Fail-fast:** Non–super-admin users must get redirect to `/signin` (page) or **401/403** on `/api/admin/demo-accounts/*`.

### 1.3 Assume RA demo firm

1. On the RA card, click **Assume this firm**.
2. Confirm the header pill: `Impersonating firm 11111111-…`.
3. In DevTools → Application → Cookies, confirm `advisacor_impersonate_firm_id` = RA firm UUID.

**Pass:** Button label becomes **Assumed**; pill visible; cookie set.

**Audit check:**

```sql
SELECT event_type, actor_user_id, actor_email, target_user_id, company_id, metadata, created_at
FROM audit_logs
WHERE event_type = 'super_admin_impersonate_firm_start'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:

- `actor_user_id` = `a4ebf834-a698-4f79-a945-8498f2e6c45d`
- `actor_email` = `mwiseman@advisacor.com`
- `metadata->>'firm_id'` = RA firm id
- `metadata->>'tier_key'` = `review_assist`

**Known gap:** Assume does **not** auto-redirect to `/dashboard` and does **not** yet rewrite firm-scoped routes. After cookie verification, optionally open `/dashboard` and note whether Audit Ready nav appears (RA should not expose AR surfaces — see §5.5). If the app still shows the operator’s default firm context, record as **PASS with gap** (cookie+audit OK; consumer pending).

### 1.4 Release and assume RA Pro

1. Click **Release** next to the impersonation pill (on `/admin/demo-accounts`).
2. Confirm cookie cleared and pill gone.
3. Click **Assume this firm** on the RA Pro card.

**Pass:** Cookie = RA Pro firm id; pill shows RA Pro firm UUID.

**Audit check:**

```sql
SELECT event_type, count(*) AS n
FROM audit_logs
WHERE event_type IN (
  'super_admin_impersonate_firm_start',
  'super_admin_impersonate_firm_end'
)
  AND created_at >= now() - interval '15 minutes'
GROUP BY 1
ORDER BY 1;
```

Expected (minimum for this section): ≥2 start, ≥1 end.

---

## Section 2 — OAuth-as-holder smoke (both tiers)

> **Order note:** Connect **before** Bind. Bind is disabled until the holder has an active QBO row in `accounting_connections`.

### 2.1 RA firm OAuth round-trip

1. Stay on `/admin/demo-accounts` (super-admin session).
2. On RA Slot 1, click **Connect QBO**.
3. Complete Intuit **sandbox** consent (`appcenter.intuit.com`).
4. Land back on `/admin/demo-accounts?quickBooksConnected=true&holderConnected=<uuid>&connectionId=<uuid>` (or equivalent query params).

**Pass:** Slot 1 QBO column shows **Connected** (not “No connection — connect via DEMO-3B”). Realm id populated.

**DB check (dual-write — DEMO-3B):**

```sql
-- Resolve Slot 1 holder id first, then:
SELECT
  'erp' AS src, ec.id, ec.user_id, ec.realm_id, ec.updated_at
FROM erp_connections ec
WHERE ec.user_id = '<RA_SLOT_1_USER_ID>'
UNION ALL
SELECT
  'accounting' AS src, ac.id, ac.user_id, ac.tenant_or_realm_id, ac.updated_at
FROM accounting_connections ac
WHERE ac.user_id = '<RA_SLOT_1_USER_ID>'
  AND ac.provider = 'quickbooks'
  AND ac.status = 'connected';
```

Expected:

- Both sources present (or at least `accounting_connections` — required for Bind/picker).
- `user_id` = **holder** id, **not** `a4ebf834-…`.

**Audit check:**

```sql
SELECT event_type, actor_user_id, target_user_id, company_id, metadata, created_at
FROM audit_logs
WHERE event_type = 'super_admin_connect_as_holder_start'
ORDER BY created_at DESC
LIMIT 2;
```

Expected: `_start` with `actor_user_id` = super-admin, `target_user_id` = holder, `metadata->>'firm_id'` = RA firm.  
**No** `_success` row yet (known gap).

### 2.2 RA Pro firm OAuth round-trip

Repeat §2.1 for RA Pro Slot 1 (`demo-rapro-sandbox-1@advisacor.internal`).

### 2.3 Cross-firm OAuth rejection

With a valid super-admin session cookie / Bearer token:

```bash
curl -s -o - -w "\nHTTP %{http_code}\n" -X POST "https://<preview-url>/api/admin/quickbooks/connect-as-holder" \
  -H "content-type: application/json" \
  -H "cookie: <advisacor_access_token + MFA cookies if required>" \
  -d '{"firmId":"11111111-1111-1111-1111-111111111111","holderUserId":"<RA_PRO_SLOT_1_USER_ID>"}'
```

**Pass:** **403** (`Holder does not belong to this firm's demo pool`). No new OAuth cookies that would start a successful Intuit flow for the wrong pool.

Unauth call (no cookie):

```bash
curl -s -o - -w "\nHTTP %{http_code}\n" -X POST "https://<preview-url>/api/admin/quickbooks/connect-as-holder" \
  -H "content-type: application/json" \
  -d '{"firmId":"11111111-1111-1111-1111-111111111111","holderUserId":"<any>"}'
```

**Pass:** **401**.

---

## Section 3 — Holder binding smoke (both tiers)

### 3.1 Bind RA holder Slot 1

Precondition: §2.1 Connected.

1. On RA Slot 1, click **Bind**.
2. Confirm Slot 1 shows **ACTIVE** / **Bound**.

**DB check:**

```sql
SELECT owner_user_id, updated_at
FROM firm_clients
WHERE id = '41111111-1111-1111-1111-111111111111';
```

Expected: `owner_user_id` = RA Slot 1 auth user id.

**Audit:**

```sql
SELECT event_type, actor_user_id, target_user_id, metadata, created_at
FROM audit_logs
WHERE event_type = 'super_admin_bind_demo_holder'
ORDER BY created_at DESC
LIMIT 1;
```

### 3.2 Bind RA Pro holder Slot 1

Repeat on RA Pro card. Verify:

```sql
SELECT owner_user_id, updated_at
FROM firm_clients
WHERE id = '42222222-2222-2222-2222-222222222222';
```

### 3.3 Cross-firm bind rejection

```bash
curl -s -o - -w "\nHTTP %{http_code}\n" -X POST "https://<preview-url>/api/admin/demo-accounts/bind-holder" \
  -H "content-type: application/json" \
  -H "cookie: <session cookies>" \
  -d '{"firmClientId":"41111111-1111-1111-1111-111111111111","holderUserId":"<RA_PRO_SLOT_1_USER_ID>"}'
```

**Pass:** **400** or **403** with a clear pool / holder error. `firm_clients.owner_user_id` for the RA client **unchanged**.

(Bind without QBO returns **400** *Holder has no active QBO connection…* — expected if Connect was skipped.)

---

## Section 4 — Pulse smoke (both tiers)

### 4.1 RA firm: ask Pulse a QBO question

1. With RA Slot 1 connected **and** bound, open the product surface that hosts Pulse for the demo RA client (typically `/dashboard` or the reviewer/Pulse entry used by RA).
2. Ask: **What is the current cash balance?**

**Pass:** Pulse returns a dollar figure grounded in the holder’s Intuit sandbox. Prefer a citation / as-of date when the UI shows one.

**No-fabrication check:** Cross-check against the same sandbox Balance Sheet (QBO UI or an authenticated reports API if available for that realm). Figures must match within rounding.

**If Pulse cannot see the holder sandbox:** note whether firm/client selection still ignores `advisacor_impersonate_firm_id` (cookie consumer gap). Do not mark Section 4 PASS until Pulse is reading the bound holder’s connection.

### 4.2 RA Pro firm: deeper Pulse question

1. Bind/connect RA Pro Slot 1 as needed.
2. Ask: **Any AR aging concerns this month?**

**Pass:** Response references aged receivables / buckets and cites QBO data. Record qualitative depth vs RA (no hard metric required).

---

## Section 5 — Audit-Ready PBC ingest smoke (RA Pro only)

### 5.1 Navigate to Audit-Ready (RA Pro)

1. Assumed / operating as RA Pro demo context.
2. Open `/audit-ready` (or the nav item if present).

**Pass:** Engagement list (or empty state) renders without an upgrade wall.

### 5.2 Create engagement

1. Create engagement: name `DEMO-4 Smoke Engagement`, period end = last month-end, size `standard` (or nearest UI equivalents).
2. Save.

**Pass:** Engagement created; detail URL reachable.

### 5.3 Upload sample PBC PDF

1. Use a sanitized PBC request-list PDF (shared fixture if present in the workspace / prior Week 3 AR smoke assets).
2. Upload via the PBC dropzone.
3. Wait until status is `parsed` (or UI equivalent).

**DB check:**

```sql
SELECT id, status, extracted_request_count, parse_error, created_at
FROM audit_ready_pbc_uploads
WHERE engagement_id = '<engagementId>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `status = 'parsed'`, `extracted_request_count > 0`, `parse_error` null.

### 5.4 Request items appear

1. Refresh engagement PBC list.

**Pass:** Request rows with numbers/descriptions; assertion tags when the classifier produced them.

### 5.5 RA firm: Audit-Ready blocked

1. Release / switch to RA demo context (or clear RA Pro selection).
2. Hit `/audit-ready` directly.

**Pass:** **403**, upgrade gate, or empty/blocked UX — **no** successful PBC upload UI for RA-only entitlements.

---

## Section 6 — Release + audit-trail verification

### 6.1 Release cleanly

1. On `/admin/demo-accounts`, click **Release**.
2. Confirm pill gone and cookie `advisacor_impersonate_firm_id` absent (or empty / max-age 0).

**Pass:** No stale impersonation cookie.

### 6.2 Audit trail integrity (last hour)

```sql
SELECT event_type, count(*) AS n
FROM audit_logs
WHERE actor_user_id = 'a4ebf834-a698-4f79-a945-8498f2e6c45d'
  AND created_at >= now() - interval '1 hour'
GROUP BY 1
ORDER BY 1;
```

**Expected minimum after a full run:**

| event_type | min |
|------------|-----|
| `super_admin_impersonate_firm_start` | 2+ |
| `super_admin_impersonate_firm_end` | 2+ |
| `super_admin_bind_demo_holder` | 2+ |
| `super_admin_connect_as_holder_start` | 2+ |

Every row must have non-null `actor_user_id`. Missing actor → **file immediately**.

---

## Section 7 — Fail-fast checks

### 7.1 Impersonation cookie sanity

DevTools → Cookies:

- `advisacor_impersonate_firm_id` present when Assumed, cleared after Release.
- Session cookie `advisacor_access_token` present throughout.

### 7.2 RLS / gate for non–super-admin

As a regular user: open `/admin/demo-accounts`.

**Pass:** Redirect to sign-in or denial — picker never renders firm/holder emails.

### 7.3 Holder connection isolation

1. With Slot 1 Connected, Connect Slot 2 (optional) or Bind Slot 2 after Slot 2 is connected.
2. After binding Slot 2:

```sql
SELECT owner_user_id
FROM firm_clients
WHERE id = '41111111-1111-1111-1111-111111111111';
```

Expected: owner = Slot 2 user id. Slot 1’s `accounting_connections` row **unchanged** (connections stay on the holder; bind only chooses which holder the firm client points at).

---

## Section 8 — Rollback / recovery

### 8.1 Reset a holder binding

```sql
UPDATE firm_clients
SET owner_user_id = (
  SELECT id FROM auth.users WHERE email = 'demo-ra-sandbox-1@advisacor.internal'
)
WHERE id = '41111111-1111-1111-1111-111111111111';
```

### 8.2 Purge a corrupted QBO connection (by holder user_id)

```sql
-- Prefer user_id (connections are per-holder; company_id is not the join key on these tables)
DELETE FROM erp_connections
WHERE user_id = '<HOLDER_USER_ID>';

DELETE FROM accounting_connections
WHERE user_id = '<HOLDER_USER_ID>'
  AND provider = 'quickbooks';
```

Then re-run §2.

### 8.3 Audit forensics

```sql
SELECT event_type, actor_user_id, actor_email, target_user_id, company_id, metadata, created_at
FROM audit_logs
WHERE created_at >= now() - interval '30 minutes'
ORDER BY created_at DESC;
```

Look for missing `actor_user_id`, unexpected metadata, or timing gaps.

---

## Sign-off template

Paste into the DEMO-4 PR / ops note after running:

```
DEMO-4 smoke — <preview-or-prod-url> — <YYYY-MM-DD HH:MM ET>
Section 1 (picker assume/release):     PASS / FAIL / PASS_WITH_GAP
Section 2 (OAuth-as-holder):           PASS / FAIL
Section 3 (holder bind):               PASS / FAIL
Section 4 (Pulse):                     PASS / FAIL / BLOCKED_COOKIE_GAP
Section 5 (Audit-Ready RA Pro + RA):   PASS / FAIL
Section 6 (release + audit_logs):      PASS / FAIL
Section 7 (fail-fast):                 PASS / FAIL

Notes:
- <anything unusual>
- Cookie consumer gap observed? Y/N
audit_logs rows this run (super_admin_* demo/impersonate/bind/connect): <n>
accounting_connections connected for holders after run: <n>
```

---

## Known gaps (deliberately out of scope for this runbook)

- **Impersonation cookie → firm-scoped route override** — not wired; Assume/Release are cookie + audit markers today.
- **`super_admin_connect_as_holder_success`** — not emitted; only `_start` + callback `console.log`.
- **JE-in-Pulse** — PULSE-JE-* not built; do not ask Pulse to post journal entries.
- **PBC tie-out / contract vault** — parse-only; no tie-out engine or contract vault yet.
- **Dashboard shared layout** — account settings back-link shipped; full `/dashboard` chrome remains a separate design item.

These get their own smoke sections as they land.
