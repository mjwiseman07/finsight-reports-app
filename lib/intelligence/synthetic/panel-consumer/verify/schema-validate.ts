import type { WorkerJobDescriptionsDocument } from "../types";
import { AI_PERSONA_IDS } from "../types";

const EXPECTED_ATTESTED_BY = "mwiseman@advisacor.com";

export function validateWorkerJobDescriptionsDocument(doc: WorkerJobDescriptionsDocument): void {
  if (doc.schemaVersion !== "42.7C.1") {
    throw new Error(`schemaVersion must be 42.7C.1, got ${doc.schemaVersion}`);
  }
  if (doc.attestation.attestedBy !== EXPECTED_ATTESTED_BY) {
    throw new Error(`attestation.attestedBy must be ${EXPECTED_ATTESTED_BY}`);
  }
  if (doc.isNotReplacementForHuman !== true) {
    throw new Error("isNotReplacementForHuman must be true");
  }
  if (doc.humanWorkerParityDoctrine !== true) {
    throw new Error("humanWorkerParityDoctrine must be true");
  }
  if (!Array.isArray(doc.personas) || doc.personas.length !== 9) {
    throw new Error("personas must contain exactly 9 entries");
  }

  const seen = new Set<string>();
  for (const persona of doc.personas) {
    if (!AI_PERSONA_IDS.includes(persona.personaId)) {
      throw new Error(`invalid personaId: ${persona.personaId}`);
    }
    if (seen.has(persona.personaId)) {
      throw new Error(`duplicate personaId: ${persona.personaId}`);
    }
    seen.add(persona.personaId);
    if (persona.tier !== 1) {
      throw new Error(`persona ${persona.personaId}: tier must be 1`);
    }
    if (persona.isNotReplacementForHuman !== true) {
      throw new Error(`persona ${persona.personaId}: isNotReplacementForHuman must be true`);
    }
    if (!persona.revenueNote) {
      throw new Error(`persona ${persona.personaId}: revenueNote required`);
    }
    for (const capability of persona.capabilities) {
      if (!capability.phase39ModuleRefs.length) {
        throw new Error(`capability ${capability.capabilityId}: phase39ModuleRefs required`);
      }
      if (capability.externalIO !== "none" && capability.externalIO !== "phase38-only") {
        throw new Error(`capability ${capability.capabilityId}: invalid externalIO`);
      }
      if (!capability.humanParity.competencyFrameworkRef) {
        throw new Error(`capability ${capability.capabilityId}: humanParity.competencyFrameworkRef required`);
      }
      if (capability.humanParity.humanOnlyForNow && !capability.humanParity.gapReason) {
        throw new Error(`capability ${capability.capabilityId}: gapReason required when humanOnlyForNow`);
      }
    }
    for (const restriction of persona.restrictions) {
      if (!restriction.phase39ModuleRefs.includes(4)) {
        throw new Error(`restriction ${restriction.restrictionId}: must include phase39 module 4`);
      }
    }
    for (const trigger of persona.escalationTriggers) {
      if (trigger.targetScope !== "universal" && !AI_PERSONA_IDS.includes(trigger.targetScope)) {
        throw new Error(`trigger ${trigger.triggerId}: invalid targetScope`);
      }
    }
  }

  for (const expected of AI_PERSONA_IDS) {
    if (!seen.has(expected)) {
      throw new Error(`missing personaId: ${expected}`);
    }
  }
}
