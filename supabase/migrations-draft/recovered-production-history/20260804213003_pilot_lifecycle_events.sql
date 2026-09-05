-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213003
-- NAME: pilot_lifecycle_events
-- DATABASE_MD5_UTF8: 34ca62d02d68fac9fc81bf485ba1a02c
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5454
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 1 — pilot_slots lifecycle memory event log

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identity
  event_kind text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  schema_version text NOT NULL DEFAULT '42.7E.1',

  -- Subject
  pilot_slot_id uuid NOT NULL,
  from_status text NULL,
  to_status text NOT NULL,
  classification_hint text NULL,

  -- Isolation (caller-resolved from pilot_slots)
  company_id uuid NULL,
  firm_id uuid NULL,

  -- Actor
  actor_kind text NOT NULL,
  actor_user_id uuid NULL,
  actor_via text NOT NULL,

  -- Assertion tagging (LOCKED PCAOB-6 taxonomy)
  assertions_covered text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Evidence linkage
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_code text NOT NULL,
  reason_text text NULL,

  -- Payload
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Hash chain (populated by BEFORE INSERT trigger in Block 2)
  prev_hash text NULL,
  row_hash text NULL,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT pilot_lifecycle_events_event_kind_chk
    CHECK (event_kind IN (
      'pilot.lifecycle.transition',
      'pilot.lifecycle.drift-detected',
      'pilot.lifecycle.auto-reconciled',
      'pilot.lifecycle.escalated',
      'pilot.lifecycle.recurred'
    )),
  CONSTRAINT pilot_lifecycle_events_actor_kind_chk
    CHECK (actor_kind IN ('user', 'system', 'external')),
  CONSTRAINT pilot_lifecycle_events_actor_via_chk
    CHECK (actor_via IN (
      'panel-consumer',
      'role-adapter',
      'org-edge',
      'direct-api',
      'admin-script',
      'stripe-webhook',
      'cdc-auditor'
    )),
  CONSTRAINT pilot_lifecycle_events_isolation_chk
    CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL),
  CONSTRAINT pilot_lifecycle_events_assertions_subset_chk
    CHECK (assertions_covered <@ ARRAY[
      'existence',
      'completeness',
      'accuracy',
      'valuation',
      'rights_obligations',
      'presentation_disclosure'
    ]::text[])
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_pilot_slot_event_at_idx
  ON public.pilot_lifecycle_events (pilot_slot_id, event_at DESC);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_company_event_at_idx
  ON public.pilot_lifecycle_events (company_id, event_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_firm_event_at_idx
  ON public.pilot_lifecycle_events (firm_id, event_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_event_kind_at_idx
  ON public.pilot_lifecycle_events (event_kind, event_at DESC);

ALTER TABLE public.pilot_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events;

CREATE POLICY pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
    OR
    (firm_id IS NOT NULL AND firm_id IN (
      SELECT firm_id FROM public.firm_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
  );

COMMENT ON TABLE public.pilot_lifecycle_events IS
  'Phase MEM-LIFECYCLE Block 1. First production table storing memory-builder output. Immutable, hash-chained record of every pilot_slots state transition. All writes go through lib/pilot-lifecycle SSOT module (Block 3) and the BEFORE INSERT hash-chain trigger (Block 2). Feeds Timeline UI (Block 5), state machine (Block 6), Coverage PDF (Block 7), RFC 3161 anchoring (Block 9). No TTL — retention is permanent per audit doctrine.';

COMMENT ON COLUMN public.pilot_lifecycle_events.event_kind IS
  'AuditEventKind extension. Reserved namespace pilot.lifecycle.* per audit README convention. See lib/audit-log-writer/types (Block 3 extension).';

COMMENT ON COLUMN public.pilot_lifecycle_events.classification_hint IS
  'Free-text hint for the >2-target-state case (e.g., cancelled vs converted vs drifted). Frontier UX research (2026) recommends Classification as a distinct ISA 315 assertion; we preserve the information here without forking the LOCKED PCAOB-6 taxonomy.';

COMMENT ON COLUMN public.pilot_lifecycle_events.assertions_covered IS
  'Subset of LOCKED PCAOB-6 taxonomy (lib/audit-ready/assertion-taxonomy.ts). CHECK constraint enforces subset. For pilot_slots lifecycle events, typical values: {existence, completeness, accuracy}. Do NOT extend without updating Provisional #6 Component E.';

COMMENT ON COLUMN public.pilot_lifecycle_events.evidence_refs IS
  'jsonb array of evidence pointers. Shape: [{"kind":"stripe.event","id":"evt_...","url":"stripe:dashboard:..."},{"kind":"webhook.event","id":"we_..."},{"kind":"pilot_slot.snapshot","id":"...","hash":"sha256:..."}]. Drives the Trullion-shape evidence drawer in Block 5.';

COMMENT ON COLUMN public.pilot_lifecycle_events.row_hash IS
  'sha256(prev_hash || canonical_payload). Computed in-transaction by BEFORE INSERT trigger (Block 2). NEVER writeable from application layer.';

COMMENT ON COLUMN public.pilot_lifecycle_events.prev_hash IS
  'row_hash of the immediately-prior row for the same (company_id, firm_id) partition. NULL only for the first row per partition. Trigger enforces.';