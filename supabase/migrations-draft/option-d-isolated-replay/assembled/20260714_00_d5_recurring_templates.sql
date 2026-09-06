-- D5.0 — Recurring / Template Entries — schema
--
-- Depends on: D0 (firm_clients), D2 (je_post_attempts, je_posting_audit).
-- Adds:
--   - firm_clients.timezone (NEW column)
--   - firm_clients.recurring_auto_post_enabled (NEW column, default false)
--   - je_posting_audit.source_type CHECK expanded to include 'recurring'
--   - recurring_templates table
--   - recurring_schedule_lines table
--   - recurring_fires table
--   - RLS on all three new tables
--   - Immutability trigger on recurring_fires (terminal statuses frozen)
--
-- Idempotent: safe to re-apply.
--
-- NOTE (drift resolution): the firm-user join table in this codebase is
-- public.firm_memberships(firm_id, user_id) (created in
-- 20260530_create_client_briefings.sql), NOT firm_members. All three RLS
-- policies below use firm_memberships accordingly.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extend firm_clients (timezone + auto-post gate)
-- -----------------------------------------------------------------------------
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';

ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS recurring_auto_post_enabled boolean NOT NULL DEFAULT false;

-- Backfill timezone from client_briefing_settings where present.
-- Idempotent: only updates rows still on the default.
UPDATE public.firm_clients fc
   SET timezone = cbs.timezone
  FROM public.client_briefing_settings cbs
 WHERE cbs.client_id = fc.id
   AND cbs.timezone IS NOT NULL
   AND fc.timezone = 'America/New_York'
   AND cbs.timezone <> 'America/New_York';

-- -----------------------------------------------------------------------------
-- 2. Extend je_posting_audit.source_type to include 'recurring'
-- -----------------------------------------------------------------------------
-- The CHECK constraint was inlined without a name in the D2 migration, so we
-- have to find and drop the current CHECK on source_type, then re-add with the
-- expanded set. This is idempotent: if already expanded, the second attempt is
-- a no-op because we guard on the constraint's current definition.
DO $$
DECLARE
  con_name text;
  con_def  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO con_name, con_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'je_posting_audit'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) ILIKE '%source_type%'
   LIMIT 1;

  IF con_name IS NOT NULL AND con_def NOT ILIKE '%''recurring''%' THEN
    EXECUTE format('ALTER TABLE public.je_posting_audit DROP CONSTRAINT %I', con_name);
    ALTER TABLE public.je_posting_audit
      ADD CONSTRAINT je_posting_audit_source_type_check
      CHECK (source_type IN ('rule','anomaly','flux','manual','reversal','recurring'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. recurring_templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  template_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id      uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  template_type       text NOT NULL
                        CHECK (template_type IN ('fixed','straight_line','schedule')),
  je_payload_template jsonb NOT NULL,
  -- Cadence
  cadence             text NOT NULL
                        CHECK (cadence IN (
                          'weekly','biweekly','semimonthly',
                          'monthly','quarterly','annual','custom_days'
                        )),
  custom_days         integer CHECK (custom_days IS NULL OR custom_days > 0),
  day_of_month        integer CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
  day_of_week         integer CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),
  month_of_year       integer CHECK (month_of_year IS NULL OR (month_of_year BETWEEN 1 AND 12)),
  timezone            text NOT NULL DEFAULT 'America/New_York',
  -- Straight-line / schedule
  starting_balance    numeric(18,2),
  total_periods       integer CHECK (total_periods IS NULL OR total_periods > 0),
  periods_elapsed     integer NOT NULL DEFAULT 0 CHECK (periods_elapsed >= 0),
  -- Lifecycle
  start_date          date NOT NULL,
  end_date            date,
  next_fire_date      date NOT NULL,
  last_fired_at       timestamptz,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','ended','archived')),
  -- Mode
  auto_post           boolean NOT NULL DEFAULT false,
  origin              text NOT NULL DEFAULT 'user'
                        CHECK (origin IN ('user','ai_suggested','ai_accepted','imported_qbo')),
  origin_memory_id    text,
  -- Reinforcement counters
  fire_count          integer NOT NULL DEFAULT 0 CHECK (fire_count >= 0),
  post_count          integer NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  skip_count          integer NOT NULL DEFAULT 0 CHECK (skip_count >= 0),
  reject_count        integer NOT NULL DEFAULT 0 CHECK (reject_count >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by_user_id  uuid,
  ended_by_user_id    uuid,
  ended_at            timestamptz,
  CONSTRAINT custom_days_required CHECK (
    cadence <> 'custom_days' OR custom_days IS NOT NULL
  ),
  CONSTRAINT straight_line_requires_balance CHECK (
    template_type <> 'straight_line'
    OR (starting_balance IS NOT NULL AND total_periods IS NOT NULL AND total_periods > 0)
  ),
  CONSTRAINT end_after_start CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_fire
  ON public.recurring_templates (next_fire_date)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_templates_firm_client
  ON public.recurring_templates (firm_client_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_origin_memory
  ON public.recurring_templates (origin_memory_id)
  WHERE origin_memory_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. recurring_schedule_lines (per-period amounts for template_type='schedule')
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_schedule_lines (
  schedule_line_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid NOT NULL REFERENCES public.recurring_templates(template_id) ON DELETE CASCADE,
  period_index      integer NOT NULL CHECK (period_index >= 1),
  amount            numeric(18,2) NOT NULL,
  memo_override     text,
  CONSTRAINT recurring_schedule_lines_period_uniq UNIQUE (template_id, period_index)
);

CREATE INDEX IF NOT EXISTS idx_recurring_schedule_lines_template
  ON public.recurring_schedule_lines (template_id, period_index);

-- -----------------------------------------------------------------------------
-- 5. recurring_fires (audit trail — every scheduled fire event)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_fires (
  fire_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        uuid NOT NULL REFERENCES public.recurring_templates(template_id) ON DELETE CASCADE,
  firm_client_id     uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  fire_date          date NOT NULL,
  fired_at           timestamptz NOT NULL DEFAULT now(),
  period_index       integer NOT NULL CHECK (period_index >= 1),
  status             text NOT NULL
                       CHECK (status IN ('proposed','posted','skipped','rejected','failed','cash_basis')),
  je_attempt_id      uuid REFERENCES public.je_post_attempts(attempt_id),
  qbo_je_id          text,
  proposal_id        uuid,
  reviewer_user_id   uuid,
  reviewed_at        timestamptz,
  amount_override    numeric(18,2),
  skip_reason        text,
  reject_reason      text,
  error_detail       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_fires_period_uniq UNIQUE (template_id, period_index)
);

CREATE INDEX IF NOT EXISTS idx_recurring_fires_firm_client
  ON public.recurring_fires (firm_client_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_fires_template
  ON public.recurring_fires (template_id, period_index DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_fires_status
  ON public.recurring_fires (status, fired_at DESC)
  WHERE status IN ('proposed','failed');
CREATE INDEX IF NOT EXISTS idx_recurring_fires_qbo_je
  ON public.recurring_fires (qbo_je_id)
  WHERE qbo_je_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Touch triggers (updated_at auto-advance)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_recurring_templates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_templates_touch ON public.recurring_templates;
CREATE TRIGGER trg_recurring_templates_touch
  BEFORE UPDATE ON public.recurring_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_recurring_templates_updated_at();

CREATE OR REPLACE FUNCTION public.touch_recurring_fires_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_fires_touch ON public.recurring_fires;
CREATE TRIGGER trg_recurring_fires_touch
  BEFORE UPDATE ON public.recurring_fires
  FOR EACH ROW EXECUTE FUNCTION public.touch_recurring_fires_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Fire immutability: once a fire reaches a terminal status, block mutation
--    of the terminal decision fields. Same idempotency-first pattern as
--    d4_uncategorized_proposals.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_recurring_fire_immutability()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('posted','skipped','rejected','cash_basis') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.je_attempt_id IS DISTINCT FROM OLD.je_attempt_id
       OR NEW.qbo_je_id IS DISTINCT FROM OLD.qbo_je_id THEN
      RAISE EXCEPTION 'Recurring fire decision fields are immutable once terminal (fire_id=%, status=%)',
        OLD.fire_id, OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_fires_immutability ON public.recurring_fires;
CREATE TRIGGER trg_recurring_fires_immutability
  BEFORE UPDATE ON public.recurring_fires
  FOR EACH ROW EXECUTE FUNCTION public.guard_recurring_fire_immutability();

-- -----------------------------------------------------------------------------
-- 8. RLS — same firm-scoped pattern as the client_briefings tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.recurring_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedule_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_fires           ENABLE ROW LEVEL SECURITY;

-- Templates: firm-scoped via firm_clients.firm_id
DROP POLICY IF EXISTS recurring_templates_firm_scope   ON public.recurring_templates;
DROP POLICY IF EXISTS recurring_templates_service_role ON public.recurring_templates;
CREATE POLICY recurring_templates_firm_scope ON public.recurring_templates
  FOR ALL
  TO authenticated
  USING (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY recurring_templates_service_role ON public.recurring_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Schedule lines: inherit access from parent template
DROP POLICY IF EXISTS recurring_schedule_lines_firm_scope   ON public.recurring_schedule_lines;
DROP POLICY IF EXISTS recurring_schedule_lines_service_role ON public.recurring_schedule_lines;
CREATE POLICY recurring_schedule_lines_firm_scope ON public.recurring_schedule_lines
  FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT template_id FROM public.recurring_templates
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT template_id FROM public.recurring_templates
    )
  );
CREATE POLICY recurring_schedule_lines_service_role ON public.recurring_schedule_lines
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fires: firm-scoped via firm_client_id (denormalized for RLS speed)
DROP POLICY IF EXISTS recurring_fires_firm_scope   ON public.recurring_fires;
DROP POLICY IF EXISTS recurring_fires_service_role ON public.recurring_fires;
CREATE POLICY recurring_fires_firm_scope ON public.recurring_fires
  FOR ALL
  TO authenticated
  USING (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY recurring_fires_service_role ON public.recurring_fires
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
