import { describe, expect, it } from "vitest";
import fs from "node:fs";

const MIGRATION_PATH = "supabase/migrations/20260706140000_d_entitlements_followup.sql";

describe("d-entitlements-followup migration shape", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  it("backfills into stripe_webhook_events from stripe_webhook_events_legacy", () => {
    expect(sql).toMatch(/INSERT INTO public\.stripe_webhook_events/);
    expect(sql).toMatch(/FROM public\.stripe_webhook_events_legacy/);
  });

  it("uses ON CONFLICT DO NOTHING for idempotency", () => {
    expect(sql).toMatch(/ON CONFLICT\s*\(stripe_event_id\)\s*DO NOTHING/i);
  });

  it("embeds legacy-only columns in raw_payload.__legacy_meta", () => {
    expect(sql).toMatch(/__legacy_meta/);
    expect(sql).toMatch(/api_version/);
    expect(sql).toMatch(/subscription_id/);
    expect(sql).toMatch(/processing_ms/);
  });

  it("appends annotation row to entitlement_check_audit (never UPDATE)", () => {
    expect(sql).toMatch(/INSERT INTO public\.entitlement_check_audit/);
    expect(sql).toMatch(/ops:d-entitlements-followup/);
    expect(sql).not.toMatch(/UPDATE\s+public\.entitlement_check_audit/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.entitlement_check_audit/i);
  });

  it("does NOT drop the legacy table in this PR (verify-then-drop)", () => {
    expect(sql).not.toMatch(/DROP\s+TABLE\s+.*stripe_webhook_events_legacy/i);
  });

  it("marks legacy table with DEPRECATED comment", () => {
    expect(sql).toMatch(/COMMENT ON TABLE public\.stripe_webhook_events_legacy/);
    expect(sql).toMatch(/DEPRECATED/);
  });

  it("uses DO block to guard annotation idempotency", () => {
    expect(sql).toMatch(/annotation_exists/);
  });
});
