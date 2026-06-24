import type {
  AIPersonaId,
  BaselineJobDescription,
  CompanyJobDescriptionOverlay,
  EffectiveJobDescription,
  EscalationTrigger,
} from "../types";
import { validateCompanyOverlayDocument } from "../verify/overlay-validate";

export class OverlayExpansionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverlayExpansionError";
  }
}

export class OverlayPersonaMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverlayPersonaMismatchError";
  }
}

export class OverlayEscalationLooseningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverlayEscalationLooseningError";
  }
}

function escalationScopeRank(scope: "universal" | AIPersonaId): number {
  return scope === "universal" ? 100 : 1;
}

function mergeEscalationTriggers(
  baseline: readonly EscalationTrigger[],
  overlay: readonly EscalationTrigger[],
): readonly EscalationTrigger[] {
  const byId = new Map<string, EscalationTrigger>();
  for (const trigger of baseline) {
    byId.set(trigger.triggerId, trigger);
  }
  for (const overlayTrigger of overlay) {
    const existing = byId.get(overlayTrigger.triggerId);
    if (existing) {
      const existingRank = escalationScopeRank(existing.targetScope);
      const overlayRank = escalationScopeRank(overlayTrigger.targetScope);
      if (overlayRank < existingRank) {
        throw new OverlayEscalationLooseningError(
          `Overlay escalation trigger ${overlayTrigger.triggerId} loosens targetScope`,
        );
      }
    }
    byId.set(overlayTrigger.triggerId, overlayTrigger);
  }
  return Object.freeze(Array.from(byId.values()).map((trigger) => Object.freeze({ ...trigger })));
}

export function mergeOverlay(
  baseline: BaselineJobDescription,
  overlay: CompanyJobDescriptionOverlay | null,
): EffectiveJobDescription {
  if (overlay === null) {
    return Object.freeze({
      personaId: baseline.personaId,
      source: "baseline-only",
      companyId: null,
      capabilities: baseline.capabilities,
      restrictions: baseline.restrictions,
      escalationTriggers: baseline.escalationTriggers,
      attestation: baseline.attestation,
    });
  }

  if ("addedCapabilities" in (overlay as unknown as Record<string, unknown>)) {
    throw new OverlayExpansionError("Overlay may not add capabilities");
  }
  if ("removedRestrictionIds" in (overlay as unknown as Record<string, unknown>)) {
    throw new OverlayExpansionError("Overlay may not remove baseline restrictions");
  }

  validateCompanyOverlayDocument(overlay);

  if (overlay.personaId !== baseline.personaId) {
    throw new OverlayPersonaMismatchError(
      `Overlay persona ${overlay.personaId} does not match baseline ${baseline.personaId}`,
    );
  }

  const capabilities = Object.freeze(
    baseline.capabilities.filter(
      (capability) => !overlay.narrows.disabledCapabilityIds.includes(capability.capabilityId),
    ),
  );

  const restrictions = Object.freeze([
    ...baseline.restrictions,
    ...overlay.narrows.addedRestrictions.map((restriction) => Object.freeze({ ...restriction })),
  ]);

  const escalationTriggers = mergeEscalationTriggers(
    baseline.escalationTriggers,
    overlay.narrows.tightenedEscalationTriggers,
  );

  return Object.freeze({
    personaId: baseline.personaId,
    source: "baseline+overlay",
    companyId: overlay.companyId,
    capabilities,
    restrictions,
    escalationTriggers,
    attestation: baseline.attestation,
    companyAttestation: Object.freeze({ ...overlay.companyAttestation }),
  });
}
