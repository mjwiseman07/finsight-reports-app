/**
 * Phase MEM-LIFECYCLE Block 3 — Zod validators
 *
 * Fail-closed at the SSOT boundary. If a call site passes a malformed input,
 * we throw before touching the DB or the AuditLogWriter.
 *
 * Assertions: locked PCAOB-6 (presentation_disclosure), matching Block 1 CHECK.
 */

import { z } from "zod";
import { ASSERTIONS } from "@/lib/audit-ready/assertion-taxonomy";

const pcaobAssertionSchema = z.enum(ASSERTIONS);

const pilotStatusSchema = z.enum([
  "pending",
  "active",
  "paused",
  "cancelled",
  "expired",
]);

const actorViaSchema = z.enum([
  "direct-api",
  "admin-script",
  "stripe-webhook",
  "cdc-auditor",
]);

const actorKindSchema = z.enum(["human", "ai-worker", "system", "cron"]);

const evidenceRefSchema = z.object({
  kind: z.enum(["stripe_event", "pbc_upload", "qbo_report", "admin_note"]),
  uri: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 must be 64 lowercase hex chars"),
});

const subjectSchema = z
  .object({
    pilotSlotId: z.string().uuid(),
    companyId: z.string().uuid().optional(),
    firmId: z.string().uuid().optional(),
  })
  .refine(
    (s) => (s.companyId != null) !== (s.firmId != null),
    { message: "subject must have exactly one of companyId or firmId" },
  );

const actorSchema = z.object({
  kind: actorKindSchema,
  userId: z.string().uuid().nullable(),
  via: actorViaSchema,
});

export const recordTransitionInputSchema = z.object({
  subject: subjectSchema,
  actor: actorSchema,
  fromStatus: pilotStatusSchema,
  toStatus: pilotStatusSchema,
  reasonCode: z.string().min(1).max(120),
  reasonText: z.string().max(2000).nullable(),
  assertionsCovered: z.array(pcaobAssertionSchema).readonly(),
  classificationHint: z.string().max(200).nullable(),
  evidenceRefs: z.array(evidenceRefSchema).readonly(),
  payload: z.record(z.string(), z.unknown()),
  eventAt: z.date().optional(),
});

export const recordCreationInputSchema = z.object({
  subject: subjectSchema,
  actor: actorSchema,
  initialStatus: pilotStatusSchema,
  reasonCode: z.string().min(1).max(120),
  reasonText: z.string().max(2000).nullable(),
  assertionsCovered: z.array(pcaobAssertionSchema).readonly(),
  classificationHint: z.string().max(200).nullable(),
  evidenceRefs: z.array(evidenceRefSchema).readonly(),
  payload: z.record(z.string(), z.unknown()),
  eventAt: z.date().optional(),
});

export const recordAssertionEvidenceInputSchema = z.object({
  subject: subjectSchema,
  actor: actorSchema,
  assertionsCovered: z
    .array(pcaobAssertionSchema)
    .min(1, "at least one assertion required")
    .readonly(),
  classificationHint: z.string().max(200).nullable(),
  evidenceRefs: z
    .array(evidenceRefSchema)
    .min(1, "at least one evidence ref required")
    .readonly(),
  reasonCode: z.string().min(1).max(120),
  reasonText: z.string().max(2000).nullable(),
  payload: z.record(z.string(), z.unknown()),
  eventAt: z.date().optional(),
});
