/**
 * Phase MEM-LIFECYCLE Block 3 / 3.5 — public SSOT surface for pilot lifecycle events.
 *
 * This is the ONLY module that mutates pilot lifecycle state. Block 4 rewrites
 * subscription-sync + stripe-pilot-checkout to consume from here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogWriter } from "@/lib/intelligence/synthetic/standards/audit/types";
import type {
  PilotLifecycleEventRecord,
  RecordAssertionEvidenceInput,
  RecordCreationInput,
  RecordTransitionInput,
} from "./types";
import {
  recordAssertionEvidenceInputSchema,
  recordCreationInputSchema,
  recordTransitionInputSchema,
} from "./schemas";
import { writeLifecycleEvent } from "./write-event";

export type PilotLifecycleDeps = {
  readonly supabase: SupabaseClient;
  readonly auditWriter: AuditLogWriter;
};

export async function recordTransition(
  input: RecordTransitionInput,
  deps: PilotLifecycleDeps,
): Promise<PilotLifecycleEventRecord> {
  const parsed = recordTransitionInputSchema.parse(input);
  return writeLifecycleEvent(
    {
      eventKind: "pilot.lifecycle.transition",
      subject: parsed.subject,
      actor: parsed.actor,
      fromStatus: parsed.fromStatus,
      toStatus: parsed.toStatus,
      reasonCode: parsed.reasonCode,
      reasonText: parsed.reasonText,
      assertionsCovered: parsed.assertionsCovered,
      classificationHint: parsed.classificationHint,
      evidenceRefs: parsed.evidenceRefs,
      payload: parsed.payload,
      eventAt: parsed.eventAt ?? new Date(),
    },
    deps,
  );
}

export async function recordCreation(
  input: RecordCreationInput,
  deps: PilotLifecycleDeps,
): Promise<PilotLifecycleEventRecord> {
  const parsed = recordCreationInputSchema.parse(input);
  return writeLifecycleEvent(
    {
      eventKind: "pilot.lifecycle.created",
      subject: parsed.subject,
      actor: parsed.actor,
      fromStatus: null,
      toStatus: parsed.initialStatus,
      reasonCode: parsed.reasonCode,
      reasonText: parsed.reasonText,
      assertionsCovered: parsed.assertionsCovered,
      classificationHint: parsed.classificationHint,
      evidenceRefs: parsed.evidenceRefs,
      payload: parsed.payload,
      eventAt: parsed.eventAt ?? new Date(),
    },
    deps,
  );
}

export async function recordAssertionEvidence(
  input: RecordAssertionEvidenceInput,
  deps: PilotLifecycleDeps,
): Promise<PilotLifecycleEventRecord> {
  const parsed = recordAssertionEvidenceInputSchema.parse(input);
  return writeLifecycleEvent(
    {
      eventKind: "pilot.lifecycle.assertion.evidence-attached",
      subject: parsed.subject,
      actor: parsed.actor,
      fromStatus: null,
      // Block 3.5: to_status NULL is legal for evidence-attached (no state change).
      toStatus: null,
      reasonCode: parsed.reasonCode,
      reasonText: parsed.reasonText,
      assertionsCovered: parsed.assertionsCovered,
      classificationHint: parsed.classificationHint,
      evidenceRefs: parsed.evidenceRefs,
      payload: parsed.payload,
      eventAt: parsed.eventAt ?? new Date(),
    },
    deps,
  );
}

export type {
  RecordTransitionInput,
  RecordCreationInput,
  RecordAssertionEvidenceInput,
  PilotLifecycleEventRecord,
  PilotLifecycleEventKind,
  PilotLifecycleActor,
  PilotLifecycleActorVia,
  PilotLifecycleActorKind,
  PcaobAssertion,
  EvidenceRef,
  PilotLifecycleSubject,
  PilotStatus,
} from "./types";

export { PILOT_LIFECYCLE_TO_AUDIT_KIND } from "./types";
export { toDbActorKind } from "./write-event";
