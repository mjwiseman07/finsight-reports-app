import { describe, it } from "vitest";

describe("Q8e — RLS service-role-only tables", () => {
  it.todo(
    "je_line_attachments/je_line_evidence/je_post_attempts/je_posting_audit/stripe_webhook_events_legacy have service_role_all policy and no anon/authenticated grants (asserted in migration DO $$ blocks)",
  );
});
