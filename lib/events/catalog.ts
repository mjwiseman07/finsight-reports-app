/**
 * D-Assertions — Ledger event subtype registry under assertion category.
 */
export const ASSERTION_EVENT_TYPES = [
  "gap_review_item.resolved",
  "assertion.manual_test.created",
  "assertion.manual_test.attached",
  "assertion.evidence_strength.assessed",
] as const;

export type AssertionEventType = (typeof ASSERTION_EVENT_TYPES)[number];

export function isAssertionEventType(eventType: string): eventType is AssertionEventType {
  return (ASSERTION_EVENT_TYPES as readonly string[]).includes(eventType);
}
