import { mergeOverlay } from "../company-overlay/merge-overlay";
import type { CompanyJobDescriptionReader } from "../company-overlay/CompanyJobDescriptionReader";
import type {
  AIPersonaId,
  BaselineJobDescription,
  EffectiveJobDescription,
  RoutingDecision,
  WorkItem,
} from "../types";
import { AI_PERSONA_IDS, PERSONA_SENIORITY } from "../types";
import type { EscalationRegistry } from "./escalation-bridge";
import { buildHireUpRecommendation, getRevenueNoteForPersona } from "./HireUpRecommendation";

export interface CapabilityGateDeps {
  readonly baselineByPersona: ReadonlyMap<AIPersonaId, BaselineJobDescription>;
  readonly companyOverlayReader: CompanyJobDescriptionReader;
  readonly escalationRegistry: EscalationRegistry;
  readonly clock: () => Date;
}

export interface CapabilityGate {
  decide(item: WorkItem, currentPersonaId: AIPersonaId): Promise<RoutingDecision>;
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function inferCapabilityId(item: WorkItem, effectiveJD: EffectiveJobDescription): string | null {
  const capabilityIds = effectiveJD.capabilities.map((capability) => capability.capabilityId);
  if (capabilityIds.length === 0) {
    return null;
  }

  const payloadText = JSON.stringify(item.payload).toLowerCase();
  for (const capabilityId of capabilityIds) {
    const tokens = capabilityId.split("-");
    if (tokens.some((token) => token.length > 3 && payloadText.includes(token))) {
      return capabilityId;
    }
  }

  const hash = simpleHash(`${item.workItemId}:${JSON.stringify(item.payload)}`);
  return capabilityIds[hash % capabilityIds.length] ?? null;
}

function appliesHardStop(item: WorkItem, effectiveJD: EffectiveJobDescription): boolean {
  const triggerId = item.payload.triggerHardStop;
  if (typeof triggerId !== "string") {
    return false;
  }
  return effectiveJD.restrictions.some(
    (restriction) => restriction.hardStop && restriction.restrictionId === triggerId,
  );
}

function hasCapability(effectiveJD: EffectiveJobDescription, capabilityId: string): boolean {
  return effectiveJD.capabilities.some((capability) => capability.capabilityId === capabilityId);
}

function getEffectiveJD(
  deps: CapabilityGateDeps,
  companyId: string | null,
  personaId: AIPersonaId,
): EffectiveJobDescription {
  const baseline = deps.baselineByPersona.get(personaId);
  if (!baseline) {
    throw new Error(`Missing baseline JD for persona ${personaId}`);
  }
  const overlay = companyId ? deps.companyOverlayReader.read(companyId, personaId) : null;
  return mergeOverlay(baseline, overlay);
}

function chooseScope(
  item: WorkItem,
  effectiveJD: EffectiveJobDescription,
): "universal" | AIPersonaId {
  const scopeFromPayload = item.payload.escalationTargetScope;
  if (scopeFromPayload === "universal" || AI_PERSONA_IDS.includes(scopeFromPayload as AIPersonaId)) {
    return scopeFromPayload as "universal" | AIPersonaId;
  }
  const trigger = effectiveJD.escalationTriggers[0];
  return trigger?.targetScope ?? "universal";
}

function findHigherPersonaWithCapability(
  deps: CapabilityGateDeps,
  item: WorkItem,
  companyId: string | null,
  currentPersonaId: AIPersonaId,
  capabilityId: string,
): AIPersonaId | null {
  const currentSeniority = PERSONA_SENIORITY[currentPersonaId];
  const candidates = AI_PERSONA_IDS.filter((personaId) => PERSONA_SENIORITY[personaId] > currentSeniority)
    .sort((left, right) => PERSONA_SENIORITY[left] - PERSONA_SENIORITY[right]);

  for (const personaId of candidates) {
    const effectiveJD = getEffectiveJD(deps, companyId, personaId);
    if (
      hasCapability(effectiveJD, capabilityId) &&
      !appliesHardStop(item, effectiveJD)
    ) {
      return personaId;
    }
  }
  return null;
}

export function createCapabilityGatePure(deps: CapabilityGateDeps): CapabilityGate {
  return {
    async decide(item: WorkItem, currentPersonaId: AIPersonaId): Promise<RoutingDecision> {
      const effectiveJD = getEffectiveJD(deps, item.companyId, currentPersonaId);
      const capabilityId =
        item.requestedCapabilityId ?? inferCapabilityId(item, effectiveJD);

      if (!capabilityId) {
        const ticket = deps.escalationRegistry.register({
          reason: "Unable to infer capability for work item",
          targetScope: chooseScope(item, effectiveJD),
          humanFallback: { email: "mwiseman@advisacor.com", available: true },
          companyId: item.companyId,
        });
        return Object.freeze({ kind: "escalate", escalationTicket: ticket });
      }

      if (appliesHardStop(item, effectiveJD)) {
        const ticket = deps.escalationRegistry.register({
          reason: `Hard-stop restriction triggered for capability ${capabilityId}`,
          targetScope: chooseScope(item, effectiveJD),
          humanFallback: { email: "mwiseman@advisacor.com", available: true },
          companyId: item.companyId,
        });
        return Object.freeze({ kind: "escalate", escalationTicket: ticket });
      }

      if (hasCapability(effectiveJD, capabilityId)) {
        return Object.freeze({
          kind: "execute",
          personaId: currentPersonaId,
          capabilityId,
          effectiveJD,
        });
      }

      const recommendedPersonaId = findHigherPersonaWithCapability(
        deps,
        item,
        item.companyId,
        currentPersonaId,
        capabilityId,
      );

      if (
        recommendedPersonaId &&
        PERSONA_SENIORITY[recommendedPersonaId] > PERSONA_SENIORITY[currentPersonaId]
      ) {
        const recommendedJD = getEffectiveJD(deps, item.companyId, recommendedPersonaId);
        const capability = recommendedJD.capabilities.find((entry) => entry.capabilityId === capabilityId);
        const recommendation = buildHireUpRecommendation({
          currentPersonaId,
          recommendedPersonaId,
          capabilityId,
          citationHandles: capability?.citationHandles ?? [],
          revenueNote: getRevenueNoteForPersona(deps.baselineByPersona, recommendedPersonaId),
          recommendationId: `hire-up-${item.workItemId}-${capabilityId}`,
        });
        return Object.freeze({ kind: "hire-up", recommendation });
      }

      const ticket = deps.escalationRegistry.register({
        reason: `Capability ${capabilityId} is beyond any attested persona JD`,
        targetScope: chooseScope(item, effectiveJD),
        humanFallback: { email: "mwiseman@advisacor.com", available: true },
        companyId: item.companyId,
      });
      return Object.freeze({ kind: "escalate", escalationTicket: ticket });
    },
  };
}
