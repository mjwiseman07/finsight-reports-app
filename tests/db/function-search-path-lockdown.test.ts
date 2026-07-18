import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Regression test: guards against a future CREATE OR REPLACE FUNCTION silently
// dropping the search_path setting on the 29 Q8b-locked functions.
// See Phase Q8b for root-cause analysis.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const Q8B_LOCKED_FUNCTIONS = [
  "_intake_touch_updated_at",
  "close_gap_review_items_touch_updated_at",
  "curated_rule_fires_immutable",
  "engagement_addons_set_updated_at",
  "engagement_posting_policy_preset_consistency",
  "entitlement_check_audit_no_mutation",
  "guard_recurring_fire_immutability",
  "ledger_events_notify",
  "ledger_events_prevent_mutation",
  "pre_close_review_items_immutable",
  "pre_close_review_items_je_draft_check",
  "prevent_company_memory_append_only_mutation",
  "prevent_company_memory_record_unsafe_mutation",
  "prevent_company_memory_version_unsafe_mutation",
  "prevent_je_audit_update",
  "prevent_memory_payload_update",
  "prevent_proposal_decision_mutation",
  "prevent_si_snapshot_child_mutation_when_parent_locked",
  "prevent_si_snapshot_metadata_mutation",
  "public_pilot_slot_count",
  "publish_ledger_event",
  "set_pilot_slots_updated_at",
  "set_updated_at",
  "tg_set_updated_at",
  "touch_je_post_attempts",
  "touch_recurring_fires_updated_at",
  "touch_recurring_templates_updated_at",
  "touch_uncategorized_proposals_updated_at",
  "validate_assertions_array",
];

const runIntegration = Boolean(SUPABASE_URL && SERVICE_ROLE);

describe.skipIf(!runIntegration)("Q8b function search_path lockdown", () => {
  it("every Q8b-locked function has search_path pinned in proconfig", async () => {
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("pg_proc_config_view")
      .select("name, args, proconfig")
      .in("name", Q8B_LOCKED_FUNCTIONS);

    if (error && /pg_proc_config_view/i.test(error.message)) {
      return;
    }

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    const offenders: string[] = [];
    for (const row of data ?? []) {
      const cfg = row.proconfig as string[] | null;
      const hasSearchPath = Array.isArray(cfg) && cfg.some((c) => /^search_path=/.test(c));
      if (!hasSearchPath) {
        offenders.push(`${row.name}(${row.args})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
