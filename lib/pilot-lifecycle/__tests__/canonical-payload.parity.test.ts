import { describe, it, expect } from "vitest";
import { composeCanonicalPayload } from "../canonical-payload";

/**
 * Locked fixtures captured 2026-08-04 from prod via
 * SELECT public.pilot_lifecycle_events_canonical_payload(...)
 * against project jzmdgwwiestcmmeuhhkr.
 *
 * If the DB function changes, regenerate these strings and update this file.
 * Do NOT "fix" the TS to pass a wrong fixture.
 */

const FIXTURE_CREATED =
  '{"firm_id": null, "payload": {}, "event_at": "2026-08-04T20:00:00.000000Z", "actor_via": "direct-api", "to_status": "pending", "actor_kind": "system", "company_id": "00000000-0000-0000-0000-000000000001", "event_kind": "pilot.lifecycle.created", "from_status": null, "reason_code": "created", "reason_text": null, "actor_user_id": null, "evidence_refs": [], "pilot_slot_id": "00000000-0000-0000-0000-000000000010", "schema_version": "42.7E.1", "assertions_covered": [], "classification_hint": null}';

const FIXTURE_TRANSITION =
  '{"firm_id": "00000000-0000-0000-0000-000000000100", "payload": {"livemode": true, "stripe_event_id": "evt_test_1"}, "event_at": "2026-08-04T20:01:00.123456Z", "actor_via": "stripe-webhook", "to_status": "active", "actor_kind": "external", "company_id": null, "event_kind": "pilot.lifecycle.transition", "from_status": "pending", "reason_code": "stripe_paid", "reason_text": "checkout completed", "actor_user_id": null, "evidence_refs": [{"uri": "evt_1", "kind": "stripe_event", "sha256": "abc"}], "pilot_slot_id": "00000000-0000-0000-0000-000000000010", "schema_version": "42.7E.1", "assertions_covered": ["existence", "rights_obligations"], "classification_hint": "saas_arr"}';

const FIXTURE_EVIDENCE =
  '{"firm_id": "00000000-0000-0000-0000-000000000100", "payload": {"sha256": "e3b0c442...", "evidence_uri": "s3://bucket/key"}, "event_at": "2026-08-04T20:02:00.000000Z", "actor_via": "direct-api", "to_status": null, "actor_kind": "user", "company_id": null, "event_kind": "pilot.lifecycle.assertion.evidence-attached", "from_status": null, "reason_code": "evidence", "reason_text": null, "actor_user_id": "00000000-0000-0000-0000-000000000099", "evidence_refs": [{"uri": "s3://bucket/key", "kind": "pbc_upload", "sha256": "e3b0c442"}], "pilot_slot_id": "00000000-0000-0000-0000-000000000010", "schema_version": "42.7E.1", "assertions_covered": ["completeness", "existence"], "classification_hint": null}';

const FIXTURE_NESTED =
  '{"firm_id": "00000000-0000-0000-0000-000000000100", "payload": {"meta": {"ok": true, "retries": 0}, "actor": {"ip": null, "via": "stripe-webhook"}, "reason": "user_requested"}, "event_at": "2026-08-04T20:03:00.000000Z", "actor_via": "admin-script", "to_status": "cancelled", "actor_kind": "user", "company_id": null, "event_kind": "pilot.lifecycle.transition", "from_status": "active", "reason_code": "user_requested", "reason_text": null, "actor_user_id": null, "evidence_refs": [], "pilot_slot_id": "00000000-0000-0000-0000-000000000010", "schema_version": "42.7E.1", "assertions_covered": ["existence"], "classification_hint": null}';

describe("composeCanonicalPayload — parity with pilot_lifecycle_events_canonical_payload()", () => {
  it("created event with empty payload", () => {
    const s = composeCanonicalPayload({
      event_kind: "pilot.lifecycle.created",
      event_at: "2026-08-04T20:00:00+00:00",
      schema_version: "42.7E.1",
      pilot_slot_id: "00000000-0000-0000-0000-000000000010",
      from_status: null,
      to_status: "pending",
      classification_hint: null,
      company_id: "00000000-0000-0000-0000-000000000001",
      firm_id: null,
      actor_kind: "system",
      actor_user_id: null,
      actor_via: "direct-api",
      assertions_covered: [],
      evidence_refs: [],
      reason_code: "created",
      reason_text: null,
      payload: {},
    });
    expect(s).toBe(FIXTURE_CREATED);
  });

  it("status transition with actor payload + evidence_refs", () => {
    const s = composeCanonicalPayload({
      event_kind: "pilot.lifecycle.transition",
      event_at: "2026-08-04T20:01:00.123456+00:00",
      schema_version: "42.7E.1",
      pilot_slot_id: "00000000-0000-0000-0000-000000000010",
      from_status: "pending",
      to_status: "active",
      classification_hint: "saas_arr",
      company_id: null,
      firm_id: "00000000-0000-0000-0000-000000000100",
      actor_kind: "external",
      actor_user_id: null,
      actor_via: "stripe-webhook",
      // Unsorted input — DB/ORDER BY sorts alphabetically
      assertions_covered: ["rights_obligations", "existence"],
      evidence_refs: [
        { kind: "stripe_event", uri: "evt_1", sha256: "abc" },
      ],
      reason_code: "stripe_paid",
      reason_text: "checkout completed",
      payload: { stripe_event_id: "evt_test_1", livemode: true },
    });
    expect(s).toBe(FIXTURE_TRANSITION);
  });

  it("evidence attached with NULL to_status", () => {
    const s = composeCanonicalPayload({
      event_kind: "pilot.lifecycle.assertion.evidence-attached",
      event_at: "2026-08-04T20:02:00+00:00",
      schema_version: "42.7E.1",
      pilot_slot_id: "00000000-0000-0000-0000-000000000010",
      from_status: null,
      to_status: null,
      classification_hint: null,
      company_id: null,
      firm_id: "00000000-0000-0000-0000-000000000100",
      actor_kind: "user",
      actor_user_id: "00000000-0000-0000-0000-000000000099",
      actor_via: "direct-api",
      assertions_covered: ["existence", "completeness"],
      evidence_refs: [
        {
          kind: "pbc_upload",
          uri: "s3://bucket/key",
          sha256: "e3b0c442",
        },
      ],
      reason_code: "evidence",
      reason_text: null,
      payload: { evidence_uri: "s3://bucket/key", sha256: "e3b0c442..." },
    });
    expect(s).toBe(FIXTURE_EVIDENCE);
  });

  it("deep nested payload — shortlex keys at every level", () => {
    const s = composeCanonicalPayload({
      event_kind: "pilot.lifecycle.transition",
      event_at: "2026-08-04T20:03:00+00:00",
      schema_version: "42.7E.1",
      pilot_slot_id: "00000000-0000-0000-0000-000000000010",
      from_status: "active",
      to_status: "cancelled",
      classification_hint: null,
      company_id: null,
      firm_id: "00000000-0000-0000-0000-000000000100",
      actor_kind: "user",
      actor_user_id: null,
      actor_via: "admin-script",
      assertions_covered: ["existence"],
      evidence_refs: [],
      reason_code: "user_requested",
      reason_text: null,
      payload: {
        reason: "user_requested",
        actor: { via: "stripe-webhook", ip: null },
        meta: { retries: 0, ok: true },
      },
    });
    expect(s).toBe(FIXTURE_NESTED);
  });
});
