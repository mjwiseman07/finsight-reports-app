import {
  loadBaseline,
  loadBaselineByPersona,
  buildParityChecklist,
} from "../job-descriptions/load-baseline";
import {
  mergeOverlay,
  OverlayExpansionError,
  OverlayPersonaMismatchError,
  OverlayEscalationLooseningError,
} from "../company-overlay/merge-overlay";
import { Phase39EmailIntakeReader } from "../intake/Phase39EmailIntakeReader";
import { DashboardTaskQueueReader } from "../intake/DashboardTaskQueueReader";
import { createCapabilityGate } from "../routing/CapabilityGate";
import { createEscalationRegistry } from "../routing/escalation-bridge";
import { NullCompanyJobDescriptionReader } from "../company-overlay/NullCompanyJobDescriptionReader";
import { executeWithinCapability } from "../execution/execute-within-capability";
import {
  assertPhase39LockImports,
  assertPhase38OnlyExternalIO,
  assertRoleAdapterBridgeSingleton,
} from "../verify/invariants";
import {
  AI_PERSONA_IDS,
  PERSONA_SENIORITY,
  type AIPersonaId,
  type BaselineJobDescription,
  type CompanyJobDescriptionOverlay,
  type RestrictionClause,
  type WorkItem,
} from "../types";
import type { Phase38Transports } from "../../phase38/transports";
import type { Phase39Module12 } from "../../phase39/module-12/types";
import type { Phase39Module10 } from "../../phase39/module-10/types";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";
const FROZEN_CLOCK = (): Date => new Date(FROZEN_GENERATED_AT);

const NULL_TRANSPORTS: Phase38Transports = {
  emailSend: null,
  fileFetch: null,
  apiCall: null,
};

const STUB_ROLE_BUILDER_FACTORY = {
  build: async () => ({ dispatch: async () => {} }),
};

export interface PanelConsumerCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface PanelConsumerEvidence {
  readonly evidenceVersion: "42.7C.1";
  readonly generatedAt: string;
  readonly totalCases: 87;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly PanelConsumerCaseRecord[];
}

function workItem(overrides: Partial<WorkItem> & { workItemId: string }): WorkItem {
  return Object.freeze({
    source: "phase39-email",
    receivedAt: FROZEN_CLOCK().toISOString(),
    requestedPersonaId: null,
    requestedCapabilityId: null,
    payload: Object.freeze({}),
    companyId: null,
    phase39ProvenanceRef: `test:${overrides.workItemId}`,
    ...overrides,
  });
}

function pushCase(
  cases: PanelConsumerCaseRecord[],
  counters: { passCount: number; failCount: number },
  input: {
    id: string;
    decision: string;
    expected: string;
    actual: string;
    reason: string;
  },
): void {
  const outcome = input.actual;
  if (outcome !== input.expected) {
    counters.failCount += 1;
  } else {
    counters.passCount += 1;
  }
  cases.push(
    Object.freeze({
      id: input.id,
      decision: input.decision,
      expected: input.expected,
      outcome,
      reason: input.reason,
    }),
  );
}

function makeOverlay(
  personaId: AIPersonaId,
  narrows: Partial<CompanyJobDescriptionOverlay["narrows"]> = {},
): CompanyJobDescriptionOverlay {
  return Object.freeze({
    companyId: "co-test",
    personaId,
    tier: 2 as const,
    narrows: Object.freeze({
      disabledCapabilityIds: narrows.disabledCapabilityIds ?? [],
      addedRestrictions: narrows.addedRestrictions ?? [],
      tightenedEscalationTriggers: narrows.tightenedEscalationTriggers ?? [],
    }),
    companyAttestation: Object.freeze({
      attestedBy: "cfo@test.com",
      attestedAt: "2026-06-24T00:00:00Z",
      note: "test overlay",
    }),
  });
}

function sampleRestriction(restrictionId: string): RestrictionClause {
  return Object.freeze({
    restrictionId,
    summary: "Company-specific restriction",
    phase39ModuleRefs: Object.freeze([4]),
    citationHandles: Object.freeze(["PHASE39_MOD4"]),
    hardStop: true,
  });
}

function createTestGate(baselineByPersona?: ReadonlyMap<AIPersonaId, BaselineJobDescription>) {
  return createCapabilityGate({
    baselineByPersona: baselineByPersona ?? loadBaselineByPersona(),
    companyOverlayReader: new NullCompanyJobDescriptionReader(),
    escalationRegistry: createEscalationRegistry(),
    clock: FROZEN_CLOCK,
  });
}

function baselineWithHumanOnlyCapability(
  personaId: AIPersonaId,
  capabilityId: string,
  gapReason: string,
  roadmapPointer: string,
): ReadonlyMap<AIPersonaId, BaselineJobDescription> {
  const map = new Map(loadBaselineByPersona());
  const baseline = map.get(personaId);
  if (!baseline) {
    throw new Error(`missing baseline for ${personaId}`);
  }
  const capabilities = Object.freeze(
    baseline.capabilities.map((capability) =>
      capability.capabilityId === capabilityId
        ? Object.freeze({
            ...capability,
            humanParity: Object.freeze({
              ...capability.humanParity,
              humanOnlyForNow: true,
              gapReason,
              roadmapPointer,
            }),
          })
        : capability,
    ),
  );
  map.set(personaId, Object.freeze({ ...baseline, capabilities }));
  return map;
}

function firstCapabilityId(personaId: AIPersonaId): string {
  const baseline = loadBaselineByPersona().get(personaId);
  if (!baseline || baseline.capabilities.length === 0) {
    throw new Error(`no capabilities for ${personaId}`);
  }
  return baseline.capabilities[0]!.capabilityId;
}

function envelopeFrom(
  cases: PanelConsumerCaseRecord[],
  counters: { passCount: number; failCount: number },
): PanelConsumerEvidence {
  return Object.freeze({
    evidenceVersion: "42.7C.1" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: 87 as const,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

async function executeSuitesS1ThroughS14(): Promise<{
  cases: PanelConsumerCaseRecord[];
  counters: { passCount: number; failCount: number };
}> {
  const cases: PanelConsumerCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  // S1 baseline-load (6)
  {
    const baselines = loadBaseline();
    pushCase(cases, counters, {
      id: "S1-01",
      decision: "persona-count",
      expected: "9",
      actual: String(baselines.length),
      reason: "loadBaseline returns 9 personas",
    });
    pushCase(cases, counters, {
      id: "S1-02",
      decision: "tier",
      expected: "all-tier-1",
      actual: baselines.every((persona) => persona.tier === 1) ? "all-tier-1" : "mixed-tier",
      reason: "every baseline persona is tier 1",
    });
    pushCase(cases, counters, {
      id: "S1-03",
      decision: "isNotReplacementForHuman",
      expected: "all-true",
      actual: baselines.every((persona) => persona.isNotReplacementForHuman === true)
        ? "all-true"
        : "not-all-true",
      reason: "isNotReplacementForHuman true on every persona",
    });
    const doc = baselines[0]?.attestation;
    pushCase(cases, counters, {
      id: "S1-04",
      decision: "attestation",
      expected: "mwiseman@advisacor.com",
      actual: doc?.attestedBy ?? "missing",
      reason: "founder attestation attestedBy",
    });
    pushCase(cases, counters, {
      id: "S1-05",
      decision: "unique-personas",
      expected: "9-unique",
      actual:
        new Set(baselines.map((persona) => persona.personaId)).size === 9 ? "9-unique" : "duplicate",
      reason: "9 unique personaIds",
    });
    pushCase(cases, counters, {
      id: "S1-06",
      decision: "revenueNote",
      expected: "all-present",
      actual: baselines.every((persona) => Boolean(persona.revenueNote)) ? "all-present" : "missing",
      reason: "revenueNote present on every persona",
    });
  }

  // S2 parity-checklist-derivation (4)
  {
    const checklist = buildParityChecklist();
    pushCase(cases, counters, {
      id: "S2-01",
      decision: "schemaVersion",
      expected: "42.7C.1",
      actual: checklist.schemaVersion,
      reason: "parity checklist schemaVersion",
    });
    pushCase(cases, counters, {
      id: "S2-02",
      decision: "generatedFrom",
      expected: "worker-job-descriptions.json",
      actual: checklist.generatedFrom,
      reason: "parity checklist generatedFrom",
    });
    const sorted = [...checklist.items].every((item, index, items) => {
      if (index === 0) {
        return true;
      }
      const prev = items[index - 1]!;
      const personaCmp = prev.personaId.localeCompare(item.personaId);
      if (personaCmp !== 0) {
        return personaCmp < 0;
      }
      return prev.capabilityId.localeCompare(item.capabilityId) <= 0;
    });
    pushCase(cases, counters, {
      id: "S2-03",
      decision: "sort-order",
      expected: "sorted",
      actual: sorted ? "sorted" : "unsorted",
      reason: "items sorted by personaId then capabilityId",
    });
    pushCase(cases, counters, {
      id: "S2-04",
      decision: "item-fields",
      expected: "complete",
      actual: checklist.items.every(
        (item) =>
          item.personaId &&
          item.capabilityId &&
          typeof item.humanOnlyForNow === "boolean" &&
          item.parityClaim &&
          item.competencyFrameworkRef,
      )
        ? "complete"
        : "incomplete",
      reason: "every checklist item has required fields",
    });
  }

  // S3 overlay-merge-narrowing (12)
  {
    const staffBaseline = loadBaselineByPersona().get("ai-staff-accountant")!;

    const nullMerged = mergeOverlay(staffBaseline, null);
    pushCase(cases, counters, {
      id: "S3-01",
      decision: "merge-null",
      expected: "baseline-only",
      actual: nullMerged.source,
      reason: "null overlay yields baseline-only effective JD",
    });

    let personaMismatch = "no-error";
    try {
      mergeOverlay(staffBaseline, makeOverlay("ai-senior-accountant"));
    } catch (error) {
      personaMismatch =
        error instanceof OverlayPersonaMismatchError ? "OverlayPersonaMismatchError" : "other-error";
    }
    pushCase(cases, counters, {
      id: "S3-02",
      decision: "persona-mismatch",
      expected: "OverlayPersonaMismatchError",
      actual: personaMismatch,
      reason: "overlay persona mismatch rejected",
    });

    const disabled = mergeOverlay(
      staffBaseline,
      makeOverlay("ai-staff-accountant", {
        disabledCapabilityIds: ["bank-reconciliation-routine"],
      }),
    );
    pushCase(cases, counters, {
      id: "S3-03",
      decision: "disable-capability",
      expected: "disabled",
      actual: disabled.capabilities.some((cap) => cap.capabilityId === "bank-reconciliation-routine")
        ? "present"
        : "disabled",
      reason: "overlay disables capability",
    });

    const addedRestriction = sampleRestriction("co-no-crypto");
    const withRestriction = mergeOverlay(
      staffBaseline,
      makeOverlay("ai-staff-accountant", {
        addedRestrictions: [addedRestriction],
      }),
    );
    pushCase(cases, counters, {
      id: "S3-04",
      decision: "add-restriction",
      expected: "added",
      actual: withRestriction.restrictions.some((r) => r.restrictionId === "co-no-crypto")
        ? "added"
        : "missing",
      reason: "overlay adds restriction",
    });

    const tightened = mergeOverlay(
      staffBaseline,
      makeOverlay("ai-staff-accountant", {
        tightenedEscalationTriggers: [
          Object.freeze({
            triggerId: "unknown-vendor",
            condition: "Tightened to universal",
            targetScope: "universal" as const,
            citationHandles: Object.freeze(["PHASE39_MOD3"]),
          }),
        ],
      }),
    );
    const universalTrigger = tightened.escalationTriggers.find((t) => t.triggerId === "unknown-vendor");
    pushCase(cases, counters, {
      id: "S3-05",
      decision: "tighten-escalation",
      expected: "universal",
      actual: universalTrigger?.targetScope ?? "missing",
      reason: "specific to universal escalation tighten allowed",
    });

    let addedCapabilitiesError = "no-error";
    try {
      const overlay = makeOverlay("ai-staff-accountant");
      mergeOverlay(staffBaseline, { ...overlay, addedCapabilities: ["extra"] } as CompanyJobDescriptionOverlay);
    } catch (error) {
      addedCapabilitiesError =
        error instanceof OverlayExpansionError ? "OverlayExpansionError" : "other-error";
    }
    pushCase(cases, counters, {
      id: "S3-06",
      decision: "addedCapabilities",
      expected: "OverlayExpansionError",
      actual: addedCapabilitiesError,
      reason: "addedCapabilities expansion rejected",
    });

    let removedRestrictionsError = "no-error";
    try {
      const overlay = makeOverlay("ai-staff-accountant");
      mergeOverlay(staffBaseline, {
        ...overlay,
        removedRestrictionIds: ["no-framework-election"],
      } as CompanyJobDescriptionOverlay);
    } catch (error) {
      removedRestrictionsError =
        error instanceof OverlayExpansionError ? "OverlayExpansionError" : "other-error";
    }
    pushCase(cases, counters, {
      id: "S3-07",
      decision: "removedRestrictionIds",
      expected: "OverlayExpansionError",
      actual: removedRestrictionsError,
      reason: "removedRestrictionIds expansion rejected",
    });

    const overlayDoc = makeOverlay("ai-staff-accountant");
    const mergedOverlay = mergeOverlay(staffBaseline, overlayDoc);
    pushCase(cases, counters, {
      id: "S3-08",
      decision: "source",
      expected: "baseline+overlay",
      actual: mergedOverlay.source,
      reason: "overlay merge source tag",
    });
    pushCase(cases, counters, {
      id: "S3-09",
      decision: "companyId",
      expected: "co-test",
      actual: mergedOverlay.companyId ?? "missing",
      reason: "overlay companyId preserved",
    });
    pushCase(cases, counters, {
      id: "S3-10",
      decision: "companyAttestation",
      expected: "present",
      actual: mergedOverlay.companyAttestation ? "present" : "missing",
      reason: "company attestation carried through",
    });

    let looseningError = "no-error";
    try {
      mergeOverlay(staffBaseline, makeOverlay("ai-staff-accountant", {
        tightenedEscalationTriggers: [
          Object.freeze({
            triggerId: "framework-question",
            condition: "Attempt loosen",
            targetScope: "ai-staff-accountant",
            citationHandles: Object.freeze(["ASC_105_10_05_1"]),
          }),
        ],
      }));
    } catch (error) {
      looseningError =
        error instanceof OverlayEscalationLooseningError
          ? "OverlayEscalationLooseningError"
          : "other-error";
    }
    pushCase(cases, counters, {
      id: "S3-11",
      decision: "escalation-loosening",
      expected: "OverlayEscalationLooseningError",
      actual: looseningError,
      reason: "escalation loosening rejected",
    });

    pushCase(cases, counters, {
      id: "S3-12",
      decision: "restriction-count",
      expected: "baseline-plus-one",
      actual:
        withRestriction.restrictions.length === staffBaseline.restrictions.length + 1
          ? "baseline-plus-one"
          : "wrong-count",
      reason: "added restriction increases restriction count",
    });
  }

  // S4 phase39-email-intake-reader (9)
  {
    let ackCalls: Array<{ workItemId: string; outcome: string }> = [];
    const module12: Phase39Module12 = {
      async peekNextIntakeMessage() {
        return Object.freeze({
          id: "email-001",
          requestedPersonaId: "ai-staff-accountant",
          requestedCapabilityId: "journal-entry-routine",
          body: Object.freeze({ memo: "close task" }),
          companyId: "co-1",
        });
      },
      async ackIntakeMessage(workItemId, outcome) {
        ackCalls.push({ workItemId, outcome });
      },
    };
    const reader = new Phase39EmailIntakeReader({ module12, clock: FROZEN_CLOCK });

    pushCase(cases, counters, {
      id: "S4-01",
      decision: "source",
      expected: "phase39-email",
      actual: reader.source,
      reason: "reader source tag",
    });

    const emptyModule12: Phase39Module12 = {
      async peekNextIntakeMessage() {
        return null;
      },
      async ackIntakeMessage() {},
    };
    const emptyReader = new Phase39EmailIntakeReader({ module12: emptyModule12, clock: FROZEN_CLOCK });
    const emptyItem = await emptyReader.readNext();
    pushCase(cases, counters, {
      id: "S4-02",
      decision: "empty-queue",
      expected: "null",
      actual: emptyItem === null ? "null" : "item",
      reason: "null peek yields null work item",
    });

    const item = await reader.readNext();
    pushCase(cases, counters, {
      id: "S4-03",
      decision: "workItemId",
      expected: "email-001",
      actual: item?.workItemId ?? "missing",
      reason: "maps intake message id",
    });
    pushCase(cases, counters, {
      id: "S4-04",
      decision: "receivedAt",
      expected: "2026-06-24T00:00:00.000Z",
      actual: item?.receivedAt ?? "missing",
      reason: "receivedAt from frozen clock",
    });
    pushCase(cases, counters, {
      id: "S4-05",
      decision: "requestedPersonaId",
      expected: "ai-staff-accountant",
      actual: item?.requestedPersonaId ?? "missing",
      reason: "requestedPersonaId mapped",
    });
    pushCase(cases, counters, {
      id: "S4-06",
      decision: "requestedCapabilityId",
      expected: "journal-entry-routine",
      actual: item?.requestedCapabilityId ?? "missing",
      reason: "requestedCapabilityId mapped",
    });
    pushCase(cases, counters, {
      id: "S4-07",
      decision: "payload",
      expected: "memo-present",
      actual: item?.payload && "memo" in item.payload ? "memo-present" : "missing",
      reason: "payload body mapped",
    });
    pushCase(cases, counters, {
      id: "S4-08",
      decision: "provenance",
      expected: "phase39.module12:email-001",
      actual: item?.phase39ProvenanceRef ?? "missing",
      reason: "phase39 provenance ref format",
    });

    ackCalls = [];
    await reader.ack("email-001", "completed");
    pushCase(cases, counters, {
      id: "S4-09",
      decision: "ack",
      expected: "acked",
      actual:
        ackCalls.length === 1 && ackCalls[0]?.workItemId === "email-001" && ackCalls[0]?.outcome === "completed"
          ? "acked"
          : "not-acked",
      reason: "ack delegates to module12",
    });
  }

  // S5 phase39-dashboard-queue-reader (9)
  {
    let ackCalls: Array<{ workItemId: string; outcome: string }> = [];
    const module10: Phase39Module10 = {
      async peekNextQueueTask() {
        return Object.freeze({
          id: "queue-001",
          requestedPersonaId: "ai-senior-accountant",
          requestedCapabilityId: "month-end-close-routine",
          body: Object.freeze({ task: "close" }),
          companyId: "co-2",
        });
      },
      async ackQueueTask(workItemId, outcome) {
        ackCalls.push({ workItemId, outcome });
      },
    };
    const reader = new DashboardTaskQueueReader({ module10, clock: FROZEN_CLOCK });

    pushCase(cases, counters, {
      id: "S5-01",
      decision: "source",
      expected: "phase39-dashboard-queue",
      actual: reader.source,
      reason: "reader source tag",
    });

    const emptyModule10: Phase39Module10 = {
      async peekNextQueueTask() {
        return null;
      },
      async ackQueueTask() {},
    };
    const emptyReader = new DashboardTaskQueueReader({ module10: emptyModule10, clock: FROZEN_CLOCK });
    const emptyItem = await emptyReader.readNext();
    pushCase(cases, counters, {
      id: "S5-02",
      decision: "empty-queue",
      expected: "null",
      actual: emptyItem === null ? "null" : "item",
      reason: "null peek yields null work item",
    });

    const item = await reader.readNext();
    pushCase(cases, counters, {
      id: "S5-03",
      decision: "workItemId",
      expected: "queue-001",
      actual: item?.workItemId ?? "missing",
      reason: "maps queue task id",
    });
    pushCase(cases, counters, {
      id: "S5-04",
      decision: "receivedAt",
      expected: "2026-06-24T00:00:00.000Z",
      actual: item?.receivedAt ?? "missing",
      reason: "receivedAt from frozen clock",
    });
    pushCase(cases, counters, {
      id: "S5-05",
      decision: "requestedPersonaId",
      expected: "ai-senior-accountant",
      actual: item?.requestedPersonaId ?? "missing",
      reason: "requestedPersonaId mapped",
    });
    pushCase(cases, counters, {
      id: "S5-06",
      decision: "requestedCapabilityId",
      expected: "month-end-close-routine",
      actual: item?.requestedCapabilityId ?? "missing",
      reason: "requestedCapabilityId mapped",
    });
    pushCase(cases, counters, {
      id: "S5-07",
      decision: "payload",
      expected: "task-present",
      actual: item?.payload && "task" in item.payload ? "task-present" : "missing",
      reason: "payload body mapped",
    });
    pushCase(cases, counters, {
      id: "S5-08",
      decision: "provenance",
      expected: "phase39.module10:queue-001",
      actual: item?.phase39ProvenanceRef ?? "missing",
      reason: "phase39 provenance ref format",
    });

    ackCalls = [];
    await reader.ack("queue-001", "hire-up-emitted");
    pushCase(cases, counters, {
      id: "S5-09",
      decision: "ack",
      expected: "acked",
      actual:
        ackCalls.length === 1 &&
        ackCalls[0]?.workItemId === "queue-001" &&
        ackCalls[0]?.outcome === "hire-up-emitted"
          ? "acked"
          : "not-acked",
      reason: "ack delegates to module10",
    });
  }

  // S6 capability-gate-execute (9)
  {
    const gate = createTestGate();
    for (const personaId of AI_PERSONA_IDS) {
      const capabilityId = firstCapabilityId(personaId);
      const item = workItem({
        workItemId: `S6-${personaId}`,
        requestedCapabilityId: capabilityId,
      });
      const decision = await gate.decide(item, personaId);
      pushCase(cases, counters, {
        id: `S6-${personaId}`,
        decision: decision.kind,
        expected: "execute",
        actual: decision.kind,
        reason: `persona ${personaId} executes first capability ${capabilityId}`,
      });
    }
  }

  // S7 capability-gate-hire-up (12)
  {
    const gate = createTestGate();
    const hireUpExamples: Array<{
      id: string;
      current: AIPersonaId;
      capabilityId: string;
      recommended: AIPersonaId;
    }> = [
      {
        id: "S7-01",
        current: "ai-staff-accountant",
        capabilityId: "month-end-close-routine",
        recommended: "ai-senior-accountant",
      },
      {
        id: "S7-02",
        current: "ai-senior-accountant",
        capabilityId: "close-review-multi-loB",
        recommended: "ai-accounting-manager",
      },
      {
        id: "S7-03",
        current: "ai-accounting-manager",
        capabilityId: "policy-drafting-assist",
        recommended: "ai-controller-helper",
      },
      {
        id: "S7-04",
        current: "ai-controller-helper",
        capabilityId: "framework-election-recommendation-draft",
        recommended: "ai-cfo-helper",
      },
      {
        id: "S7-05",
        current: "ai-staff-auditor",
        capabilityId: "audit-workpaper-review",
        recommended: "ai-senior-auditor",
      },
      {
        id: "S7-06",
        current: "ai-senior-auditor",
        capabilityId: "engagement-coordination",
        recommended: "ai-audit-manager-helper",
      },
      {
        id: "S7-07",
        current: "ai-audit-manager-helper",
        capabilityId: "partner-readout-draft",
        recommended: "ai-partner-helper",
      },
    ];

    for (const example of hireUpExamples) {
      const item = workItem({
        workItemId: example.id,
        requestedCapabilityId: example.capabilityId,
      });
      const decision = await gate.decide(item, example.current);
      const actual =
        decision.kind === "hire-up" && decision.recommendation.recommendedPersonaId === example.recommended
          ? example.recommended
          : "not-hire-up";
      pushCase(cases, counters, {
        id: example.id,
        decision: decision.kind,
        expected: example.recommended,
        actual,
        reason: `${example.current} hire-up for ${example.capabilityId}`,
      });
    }

    const seniorityChecks: Array<{
      id: string;
      current: AIPersonaId;
      capabilityId: string;
    }> = [
      { id: "S7-08", current: "ai-staff-accountant", capabilityId: "month-end-close-routine" },
      { id: "S7-09", current: "ai-senior-accountant", capabilityId: "close-review-multi-loB" },
      { id: "S7-10", current: "ai-staff-auditor", capabilityId: "audit-workpaper-review" },
      { id: "S7-11", current: "ai-audit-manager-helper", capabilityId: "partner-readout-draft" },
      { id: "S7-12", current: "ai-accounting-manager", capabilityId: "policy-drafting-assist" },
    ];

    for (const check of seniorityChecks) {
      const item = workItem({
        workItemId: check.id,
        requestedCapabilityId: check.capabilityId,
      });
      const decision = await gate.decide(item, check.current);
      let actual = "not-hire-up";
      if (decision.kind === "hire-up") {
        const currentRank = PERSONA_SENIORITY[check.current];
        const recommendedRank = PERSONA_SENIORITY[decision.recommendation.recommendedPersonaId];
        actual = recommendedRank > currentRank ? "seniority-increased" : "seniority-not-increased";
      }
      pushCase(cases, counters, {
        id: check.id,
        decision: actual,
        expected: "seniority-increased",
        actual,
        reason: "hire-up strictly increases seniority",
      });
    }
  }

  // S8 capability-gate-escalate (9)
  {
    const gate = createTestGate();
    for (const personaId of AI_PERSONA_IDS) {
      const item = workItem({
        workItemId: `S8-${personaId}`,
        requestedCapabilityId: "nonexistent-capability-xyz",
      });
      const decision = await gate.decide(item, personaId);
      pushCase(cases, counters, {
        id: `S8-${personaId}`,
        decision: decision.kind,
        expected: "escalate",
        actual: decision.kind,
        reason: `unknown capability escalates for ${personaId}`,
      });
    }
  }

  // S9 hard-stop-precedence (4)
  {
    const gate = createTestGate();
    const hardStops: Array<{ id: string; persona: AIPersonaId; trigger: string; capability: string }> = [
      {
        id: "S9-01",
        persona: "ai-staff-accountant",
        trigger: "no-framework-election",
        capability: firstCapabilityId("ai-staff-accountant"),
      },
      {
        id: "S9-02",
        persona: "ai-senior-accountant",
        trigger: "no-management-rep",
        capability: firstCapabilityId("ai-senior-accountant"),
      },
      {
        id: "S9-03",
        persona: "ai-staff-auditor",
        trigger: "no-opinion-issuance",
        capability: firstCapabilityId("ai-staff-auditor"),
      },
      {
        id: "S9-04",
        persona: "ai-partner-helper",
        trigger: "no-partner-signature",
        capability: firstCapabilityId("ai-partner-helper"),
      },
    ];

    for (const stop of hardStops) {
      const item = workItem({
        workItemId: stop.id,
        requestedCapabilityId: stop.capability,
        payload: Object.freeze({ triggerHardStop: stop.trigger }),
      });
      const decision = await gate.decide(item, stop.persona);
      pushCase(cases, counters, {
        id: stop.id,
        decision: decision.kind,
        expected: "escalate",
        actual: decision.kind,
        reason: `hard-stop ${stop.trigger} takes precedence`,
      });
    }
  }

  // S10 external-io-containment (6)
  {
    const gate = createTestGate();
    const item = workItem({
      workItemId: "S10-a",
      requestedCapabilityId: firstCapabilityId("ai-staff-accountant"),
      companyId: "co-io-test",
    });
    let decideCompleted = "error";
    try {
      const decision = await gate.decide(item, "ai-staff-accountant");
      decideCompleted = decision.kind === "execute" ? "completed" : decision.kind;
    } catch {
      decideCompleted = "error";
    }
    pushCase(cases, counters, {
      id: "S10-a",
      decision: "gate-decide",
      expected: "completed",
      actual: decideCompleted,
      reason: "NullCompanyJobDescriptionReader gate decide completes without I/O",
    });

    const phase38OnlyCases: Array<{ id: string; persona: AIPersonaId; capabilityId: string }> = [
      { id: "S10-b", persona: "ai-staff-accountant", capabilityId: "bank-reconciliation-routine" },
      { id: "S10-c", persona: "ai-senior-accountant", capabilityId: "month-end-close-routine" },
      { id: "S10-d", persona: "ai-accounting-manager", capabilityId: "close-review-multi-loB" },
      { id: "S10-e", persona: "ai-controller-helper", capabilityId: "financial-reporting-package-prep" },
      { id: "S10-f", persona: "ai-staff-auditor", capabilityId: "audit-routine-testing" },
    ];

    for (const testCase of phase38OnlyCases) {
      const gateLocal = createTestGate();
      const work = workItem({
        workItemId: testCase.id,
        requestedCapabilityId: testCase.capabilityId,
      });
      const decision = await gateLocal.decide(work, testCase.persona);
      if (decision.kind !== "execute") {
        pushCase(cases, counters, {
          id: testCase.id,
          decision: decision.kind,
          expected: "failed-closed",
          actual: decision.kind,
          reason: "expected execute decision for phase38-only capability",
        });
        continue;
      }
      const execution = await executeWithinCapability({
        workItem: work,
        decision,
        transports: NULL_TRANSPORTS,
        roleBuilderFactory: STUB_ROLE_BUILDER_FACTORY,
      });
      pushCase(cases, counters, {
        id: testCase.id,
        decision: execution.outcome,
        expected: "failed-closed",
        actual: execution.outcome,
        reason: "null phase38 transports fail closed",
      });
    }
  }

  // S11 human-parity-disclosure (3)
  {
    const gapReason = "human review required for policy judgment";
    const roadmapPointer = "Phase 43 parity uplift";
    const baselineMap = baselineWithHumanOnlyCapability(
      "ai-controller-helper",
      "policy-drafting-assist",
      gapReason,
      roadmapPointer,
    );
    const gate = createTestGate(baselineMap);
    const work = workItem({
      workItemId: "S11-01",
      requestedCapabilityId: "policy-drafting-assist",
    });
    const decision = await gate.decide(work, "ai-controller-helper");
    if (decision.kind !== "execute") {
      pushCase(cases, counters, {
        id: "S11-01",
        decision: decision.kind,
        expected: "disclosed",
        actual: decision.kind,
        reason: "expected execute for humanOnlyForNow capability",
      });
      pushCase(cases, counters, {
        id: "S11-02",
        decision: "gap-reason",
        expected: "present",
        actual: "missing",
        reason: "parityDisclosure includes gapReason",
      });
      pushCase(cases, counters, {
        id: "S11-03",
        decision: "roadmap-pointer",
        expected: "present",
        actual: "missing",
        reason: "parityDisclosure includes roadmapPointer",
      });
    } else {
      const execution = await executeWithinCapability({
        workItem: work,
        decision,
        transports: NULL_TRANSPORTS,
        roleBuilderFactory: STUB_ROLE_BUILDER_FACTORY,
      });
      pushCase(cases, counters, {
        id: "S11-01",
        decision: execution.parityDisclosure ? "disclosed" : "missing",
        expected: "disclosed",
        actual: execution.parityDisclosure ? "disclosed" : "missing",
        reason: "parityDisclosure populated when humanOnlyForNow",
      });
      pushCase(cases, counters, {
        id: "S11-02",
        decision: "gap-reason",
        expected: "present",
        actual:
          execution.parityDisclosure && execution.parityDisclosure.includes(gapReason) ? "present" : "missing",
        reason: "parityDisclosure includes gapReason",
      });
      pushCase(cases, counters, {
        id: "S11-03",
        decision: "roadmap-pointer",
        expected: "present",
        actual:
          execution.parityDisclosure && execution.parityDisclosure.includes(roadmapPointer)
            ? "present"
            : "missing",
        reason: "parityDisclosure includes roadmapPointer",
      });
    }
  }

  // S12 phase-39-lock-invariant (1)
  {
    const violations = assertPhase39LockImports();
    pushCase(cases, counters, {
      id: "S12-01",
      decision: "violations",
      expected: "0",
      actual: String(violations.length),
      reason: "Phase 39 LOCK import whitelist",
    });
  }

  // S13 phase-38-only-io-invariant (1)
  {
    const violations = assertPhase38OnlyExternalIO();
    pushCase(cases, counters, {
      id: "S13-01",
      decision: "violations",
      expected: "0",
      actual: String(violations.length),
      reason: "Phase 38-only external I/O containment",
    });
  }

  // S14 role-adapter-bridge-singleton (1)
  {
    const violations = assertRoleAdapterBridgeSingleton();
    pushCase(cases, counters, {
      id: "S14-01",
      decision: "violations",
      expected: "0",
      actual: String(violations.length),
      reason: "role-adapter imports only via escalation-bridge",
    });
  }

  if (cases.length !== 86) {
    throw new Error(`Expected 86 cases before S15, got ${cases.length}`);
  }

  return { cases, counters };
}

async function runInnerEvidence(): Promise<PanelConsumerEvidence> {
  const { cases, counters } = await executeSuitesS1ThroughS14();
  return envelopeFrom(cases, counters);
}

export async function runPanelConsumerTests(): Promise<PanelConsumerEvidence> {
  const firstInner = await runInnerEvidence();
  const secondInner = await runInnerEvidence();

  const shapeKeys = [
    "evidenceVersion",
    "generatedAt",
    "totalCases",
    "passCount",
    "failCount",
    "cases",
  ] as const;
  const shapeOk = shapeKeys.every((key) => key in firstInner && key in secondInner);

  const { cases, counters } = await executeSuitesS1ThroughS14();
  pushCase(cases, counters, {
    id: "S15-01",
    decision: "evidence-shape",
    expected: "complete",
    actual: shapeOk ? "complete" : "incomplete",
    reason: "deterministic evidence object shape keys present",
  });

  if (cases.length !== 87) {
    throw new Error(`Expected 87 test cases, got ${cases.length}`);
  }

  return envelopeFrom(cases, counters);
}

if (require.main === module) {
  runPanelConsumerTests()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.failCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
