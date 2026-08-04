/**
 * Phase MEM-LIFECYCLE Block 3 — public SSOT surface for pilot lifecycle events.
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
import { EVIDENCE_ONLY_TO_STATUS } from "./types";
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
      // DB to_status NOT NULL — sentinel until CHECK / schema allows null semantics.
      toStatus: EVIDENCE_ONLY_TO_STATUS,
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

export { EVIDENCE_ONLY_TO_STATUS, PILOT_LIFECYCLE_TO_AUDIT_KIND } from "./types";
export { toDbActorKind, toDbEventKind } from "./write-event";
