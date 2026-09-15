import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORIZED_MAPPING_ARTIFACT_SHA256,
  AUTHORIZED_OPERATOR_DECISION,
  assertCutoverPreconditions,
  type CutoverInventoryObservation,
} from "@/lib/review-assist-pro/cutover-preconditions";

const DECISION_PATH = join(
  process.cwd(),
  "docs/security/ra-pro-cutover-operator-decision.json",
);

function baseline(overrides: Partial<CutoverInventoryObservation> = {}) {
  return {
    authorizing_ra_pro_slots: 4,
    company_owned_slots: 3,
    firm_owned_slots: 1,
    authorizing_slots_after_snapshot: 0,
    billing_company_id_column_present: false,
    migration_version_present: false,
    unexpired_processing_leases: 0,
    unreviewed_held_or_retryable_ra_pro_events: 0,
    cutover_commerce_gate_closed: true,
    mapping_artifact_sha256: AUTHORIZED_MAPPING_ARTIFACT_SHA256,
    ...overrides,
  } satisfies CutoverInventoryObservation;
}

describe("RA Pro cutover operator decision + preconditions", () => {
  it("committed decision JSON matches sealed constants and forbids backfill", () => {
    // Prefer Git blob bytes when available; fall back to worktree after LF restore.
    const json = JSON.parse(readFileSync(DECISION_PATH, "utf8"));
    expect(json.mapping_artifact_sha256).toBe(AUTHORIZED_MAPPING_ARTIFACT_SHA256);
    expect(json.actions).toEqual(AUTHORIZED_OPERATOR_DECISION.actions);
    expect(json.backfill_authorized).toBe(false);
    expect(json.expected_linked_firms_after_migration).toBe(0);
    expect(json.handle_collision_count).toBe(0);
    expect(json.company_uniqueness_collision).toBe(false);
    expect(json.firm_uniqueness_collision).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(JSON.stringify(json)).not.toMatch(/@/);
    expect(JSON.stringify(json)).not.toMatch(/cus_|sub_|evt_/);
  });

  it("worktree decision file is LF-only (gitattributes / restore)", () => {
    const buf = readFileSync(DECISION_PATH);
    expect(buf.includes(0x0d)).toBe(false);
  });

  it("production-shaped NO_CUTOVER × 4 inventory passes preconditions", () => {
    expect(assertCutoverPreconditions(baseline())).toEqual({ ok: true });
  });

  it("count or classification drift blocks cutover", () => {
    expect(assertCutoverPreconditions(baseline({ authorizing_ra_pro_slots: 5 })).ok).toBe(
      false,
    );
    expect(assertCutoverPreconditions(baseline({ company_owned_slots: 2 })).ok).toBe(
      false,
    );
  });

  it("new slot after snapshot blocks cutover", () => {
    expect(
      assertCutoverPreconditions(baseline({ authorizing_slots_after_snapshot: 1 })),
    ).toEqual({ ok: false, code: "NEW_SLOT_AFTER_SNAPSHOT" });
  });

  it("open commerce gate blocks cutover preconditions", () => {
    expect(
      assertCutoverPreconditions(baseline({ cutover_commerce_gate_closed: false })),
    ).toEqual({ ok: false, code: "CUTOVER_COMMERCE_GATE_NOT_CLOSED" });
  });

  it("mapping artifact SHA drift blocks cutover", () => {
    expect(
      assertCutoverPreconditions(
        baseline({ mapping_artifact_sha256: "0".repeat(64) }),
      ),
    ).toEqual({ ok: false, code: "MAPPING_ARTIFACT_SHA_DRIFT" });
  });
});
