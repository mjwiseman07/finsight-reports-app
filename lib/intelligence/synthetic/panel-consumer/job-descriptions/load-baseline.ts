import workerJobDescriptions from "./worker-job-descriptions.json";
import type {
  AIPersonaId,
  BaselineJobDescription,
  ParityChecklist,
  ParityChecklistItem,
  WorkerJobDescriptionsDocument,
} from "../types";
import { validateWorkerJobDescriptionsDocument } from "../verify/schema-validate";

function deriveParityChecklist(doc: WorkerJobDescriptionsDocument): ParityChecklist {
  const items: ParityChecklistItem[] = [];
  for (const persona of doc.personas) {
    for (const capability of persona.capabilities) {
      items.push({
        personaId: persona.personaId,
        capabilityId: capability.capabilityId,
        humanOnlyForNow: capability.humanParity.humanOnlyForNow,
        parityClaim: capability.humanParity.parityClaim,
        competencyFrameworkRef: capability.humanParity.competencyFrameworkRef,
      });
    }
  }
  items.sort((left, right) => {
    const personaCmp = left.personaId.localeCompare(right.personaId);
    if (personaCmp !== 0) {
      return personaCmp;
    }
    return left.capabilityId.localeCompare(right.capabilityId);
  });
  return Object.freeze({
    schemaVersion: doc.schemaVersion,
    generatedFrom: "worker-job-descriptions.json",
    items: Object.freeze(items),
  });
}

export function loadBaseline(): readonly BaselineJobDescription[] {
  const doc = workerJobDescriptions as WorkerJobDescriptionsDocument;
  validateWorkerJobDescriptionsDocument(doc);

  const ids = doc.personas.map((persona) => persona.personaId);
  const unique = new Set(ids);
  if (unique.size !== 9) {
    throw new Error("loadBaseline: expected 9 unique personas");
  }

  const expectedIds: readonly AIPersonaId[] = [
    "ai-staff-accountant",
    "ai-senior-accountant",
    "ai-accounting-manager",
    "ai-controller-helper",
    "ai-cfo-helper",
    "ai-staff-auditor",
    "ai-senior-auditor",
    "ai-audit-manager-helper",
    "ai-partner-helper",
  ];
  for (const expected of expectedIds) {
    if (!unique.has(expected)) {
      throw new Error(`loadBaseline: missing persona ${expected}`);
    }
  }

  return Object.freeze(
    doc.personas.map((persona) =>
      Object.freeze({
        ...persona,
        capabilities: Object.freeze(persona.capabilities.map((capability) => Object.freeze({ ...capability }))),
        restrictions: Object.freeze(persona.restrictions.map((restriction) => Object.freeze({ ...restriction }))),
        escalationTriggers: Object.freeze(
          persona.escalationTriggers.map((trigger) => Object.freeze({ ...trigger })),
        ),
        attestation: Object.freeze({ ...doc.attestation }),
      }),
    ),
  );
}

export function buildParityChecklist(): ParityChecklist {
  const doc = workerJobDescriptions as WorkerJobDescriptionsDocument;
  validateWorkerJobDescriptionsDocument(doc);
  return deriveParityChecklist(doc);
}

export function loadBaselineByPersona(): ReadonlyMap<AIPersonaId, BaselineJobDescription> {
  const baselines = loadBaseline();
  const map = new Map<AIPersonaId, BaselineJobDescription>();
  for (const baseline of baselines) {
    map.set(baseline.personaId, baseline);
  }
  return map;
}
