/**
 * Intake bus event catalog. Enforced by lib/events/publisher.ts allowlist.
 *
 * All events are eventCategory = 'intake'.
 */
export const INTAKE_EVENT_TYPES = [
  "intake_message_received",
  "intake_message_deduped",
  "intake_message_dispatched",
  "intake_message_handler_success",
  "intake_message_handler_failed",
  "intake_message_no_handler",
  "intake_address_provisioned",
  "intake_address_revoked",
] as const;

export type IntakeEventType = (typeof INTAKE_EVENT_TYPES)[number];

export function isIntakeEventType(eventType: string): eventType is IntakeEventType {
  return (INTAKE_EVENT_TYPES as readonly string[]).includes(eventType);
}
