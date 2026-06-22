import type { ControlSpinePersonaKey } from "../../contracts";
import {
  createOverlayActivationRegistry,
  resolveOverlayActivation,
  type OverlayActivationRegistry,
  type OverlayTenantActivationScope,
} from "../../../compliance/overlay-attachment";
import { classifyIsolationReach, type ControlSpineIsolationScope } from "../../isolation";
import { PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY } from "../../phi-ingestion-gate";

/** Spine panel field taxonomy — aligned with probe fixtures and 42.5A consumption markers. */
export const SPINE_PANEL_FIELD_TAXONOMY_TAGS = [
  "patient-identifier",
  "electronic-phi-marker",
  "financial-summary",
  "firm-internal-note",
  "client-ledger-line",
  "cross-tenant-aggregate",
] as const;

export type SpinePanelFieldTaxonomyTag = (typeof SPINE_PANEL_FIELD_TAXONOMY_TAGS)[number];

const KNOWN_TAXONOMY_TAGS: ReadonlySet<string> = new Set(SPINE_PANEL_FIELD_TAXONOMY_TAGS);

const FIRM_INTERNAL_TAXONOMIES: ReadonlySet<string> = new Set(["firm-internal-note"]);

export interface PanelDataPathInput {
  panelId: string;
  tenantId: string;
  persona: "firm-staff" | "firm-admin" | "client-side";
  overlayActive: ReadonlyArray<string>;
  fieldTaxonomy: ReadonlyArray<{
    taxonomy: string;
    phi: boolean;
    sourceTenantId: string;
  }>;
}

export interface PanelAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    panelId: string;
    deniedFields: ReadonlyArray<string>;
  };
}

export interface RenderedPanelProofInput {
  panelId: string;
  tenantId: string;
  persona: PanelDataPathInput["persona"];
  overlayActive: ReadonlyArray<string>;
  renderedFields: ReadonlyArray<{
    fieldId: string;
    taxonomy: string;
    phi: boolean;
    sourceTenantId: string;
  }>;
}

export interface RenderedPanelProofResult {
  pass: boolean;
  violations: ReadonlyArray<{
    fieldId: string;
    rule: "phi-outside-overlay" | "cross-tenant" | "persona-scope";
    detail: string;
  }>;
}

export interface PanelDataPathHarness {
  assertNoPhiOutsideOverlay(input: PanelDataPathInput): PanelAssertionResult;
  assertPanelOverlayScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult;
  assertTenantScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult;
  proveRenderedPanelBoundary(input: RenderedPanelProofInput): RenderedPanelProofResult;
}

export interface PanelDataPathHarnessMarker {
  panelDataPathHarnessId: string;
  panelDataPathHarnessKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

function buildIsolationDimension(tenantScopeKey: string, suffix: string) {
  return {
    isolationDimensionReferenceId: `dim-ref:${suffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${suffix}`],
  };
}

export function buildIsolationScopeFromTenantId(tenantId: string): ControlSpineIsolationScope {
  return {
    customerTenantId: tenantId,
    firmTenantId: `${tenantId}:firm`,
    clientTenantId: `${tenantId}:client`,
    isolationScopeReferenceId: `scope:${tenantId}`,
    customerIsolation: buildIsolationDimension(tenantId, `customer:${tenantId}`),
    firmIsolation: buildIsolationDimension(`${tenantId}:firm`, `firm:${tenantId}`),
    clientIsolation: buildIsolationDimension(`${tenantId}:client`, `client:${tenantId}`),
  };
}

export function buildActivationScopeFromTenantId(tenantId: string): OverlayTenantActivationScope {
  return {
    customerTenantId: tenantId,
    firmTenantId: `${tenantId}:firm`,
    clientTenantId: `${tenantId}:client`,
    activationScopeReferenceId: `scope:activation:${tenantId}`,
    customerIsolation: buildIsolationDimension(tenantId, `customer:${tenantId}`),
    firmIsolation: buildIsolationDimension(`${tenantId}:firm`, `firm:${tenantId}`),
    clientIsolation: buildIsolationDimension(`${tenantId}:client`, `client:${tenantId}`),
  };
}

function mapPanelPersonaToSpineKey(persona: PanelDataPathInput["persona"]): ControlSpinePersonaKey {
  switch (persona) {
    case "firm-admin":
      return "firm_admin";
    case "client-side":
      return "client_controller";
    default:
      return "firm_staff";
  }
}

function deny(panelId: string, reason: string, deniedFields: string[] = []): PanelAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: { panelId, deniedFields },
  };
}

function allow(panelId: string, reason: string): PanelAssertionResult {
  return {
    decision: "ALLOW",
    reason,
    evidence: { panelId, deniedFields: [] },
  };
}

function normalizeOverlayActive(input: PanelDataPathInput): readonly string[] {
  return input.overlayActive ?? [];
}

function isKnownTaxonomy(taxonomy: string): boolean {
  return KNOWN_TAXONOMY_TAGS.has(taxonomy);
}

function isHipaaOverlayActive(
  input: PanelDataPathInput,
  registry: OverlayActivationRegistry,
): boolean {
  const overlays = normalizeOverlayActive(input);
  if (!overlays.includes("hipaa")) {
    return false;
  }

  const resolution = resolveOverlayActivation({
    registry,
    tenantActivationScope: buildActivationScopeFromTenantId(input.tenantId),
    overlayRegistryKey: PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
  });

  return resolution.resolutionOutcome === "active";
}

function evaluatePersonaScope(input: PanelDataPathInput, fieldTaxonomy: string): string | null {
  if (input.persona === "client-side" && FIRM_INTERNAL_TAXONOMIES.has(fieldTaxonomy)) {
    return "client-side persona blocked from firm-internal panel surface";
  }

  const personaKey = mapPanelPersonaToSpineKey(input.persona);
  const requesterScope = buildIsolationScopeFromTenantId(input.tenantId);
  const isolation = classifyIsolationReach({
    requesterPersonaKey: personaKey,
    requesterPersonaReferenceId: `persona:${input.persona}`,
    requesterScope,
    targetResourceReferenceId: `panel:${input.panelId}`,
    targetResourceVisibilityScope: FIRM_INTERNAL_TAXONOMIES.has(fieldTaxonomy)
      ? "firm_internal"
      : "client_scoped",
    targetScope: requesterScope,
  });

  if (isolation.accessOutcome === "denied") {
    return isolation.denyReason ?? "persona_scope_denied";
  }

  return null;
}

function evaluateCrossTenantField(
  input: PanelDataPathInput,
  sourceTenantId: string,
): PanelAssertionResult | null {
  if (sourceTenantId === input.tenantId) {
    return null;
  }

  const personaKey = mapPanelPersonaToSpineKey(input.persona);
  const isolation = classifyIsolationReach({
    requesterPersonaKey: personaKey,
    requesterPersonaReferenceId: `persona:${input.persona}`,
    requesterScope: buildIsolationScopeFromTenantId(input.tenantId),
    targetResourceReferenceId: `panel:${input.panelId}:source:${sourceTenantId}`,
    targetResourceVisibilityScope: "client_scoped",
    targetScope: buildIsolationScopeFromTenantId(sourceTenantId),
  });

  if (isolation.accessOutcome === "denied") {
    return deny(input.panelId, `isolation_denied:${isolation.denyReason ?? "cross_tenant"}`, [
      sourceTenantId,
    ]);
  }

  return deny(input.panelId, "cross_tenant_panel_leak:no_aggregation_overlay", [sourceTenantId]);
}

function evaluatePhiOverlayBoundary(
  input: PanelDataPathInput,
  registry: OverlayActivationRegistry,
): PanelAssertionResult {
  const fields = input.fieldTaxonomy;
  if (!fields || fields.length === 0) {
    return deny(input.panelId, "missing_field_taxonomy");
  }

  const hipaaActive = isHipaaOverlayActive(input, registry);
  const deniedFields: string[] = [];

  for (const field of fields) {
    if (!isKnownTaxonomy(field.taxonomy)) {
      deniedFields.push(field.taxonomy);
      continue;
    }

    if (field.phi && !hipaaActive) {
      deniedFields.push(field.taxonomy);
    }
  }

  if (deniedFields.length > 0) {
    return deny(
      input.panelId,
      hipaaActive ? "unknown_or_blocked_taxonomy" : "phi_outside_hipaa_overlay",
      deniedFields,
    );
  }

  return allow(input.panelId, "phi_fields_within_overlay_scope");
}

export function createPanelDataPathHarness(
  registry: OverlayActivationRegistry = createOverlayActivationRegistry(
    "registry:panel-data-path-default",
  ),
): PanelDataPathHarness & PanelDataPathHarnessMarker {
  const harness: PanelDataPathHarness = {
    assertNoPhiOutsideOverlay(input: PanelDataPathInput): PanelAssertionResult {
      if (!input.fieldTaxonomy) {
        return deny(input.panelId, "missing_field_taxonomy");
      }

      return evaluatePhiOverlayBoundary(input, registry);
    },

    assertPanelOverlayScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult {
      if (!input.fieldTaxonomy) {
        return deny(input.panelId, "missing_field_taxonomy");
      }

      const phiFields = input.phi
        ? input.fieldTaxonomy
        : input.fieldTaxonomy.filter((field) => field.phi);

      const overlayInput: PanelDataPathInput = {
        ...input,
        fieldTaxonomy: phiFields.length > 0 ? phiFields : input.fieldTaxonomy,
      };

      const overlayResult = evaluatePhiOverlayBoundary(overlayInput, registry);
      if (overlayResult.decision === "DENY") {
        return overlayResult;
      }

      for (const field of overlayInput.fieldTaxonomy) {
        if (!isKnownTaxonomy(field.taxonomy)) {
          return deny(input.panelId, "unknown_taxonomy", [field.taxonomy]);
        }

        const personaViolation = evaluatePersonaScope(input, field.taxonomy);
        if (personaViolation) {
          return deny(input.panelId, personaViolation, [field.taxonomy]);
        }
      }

      return allow(input.panelId, "panel_overlay_scope_respected");
    },

    assertTenantScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult {
      if (!input.fieldTaxonomy) {
        return deny(input.panelId, "missing_field_taxonomy");
      }

      const deniedFields: string[] = [];

      for (const field of input.fieldTaxonomy) {
        if (!isKnownTaxonomy(field.taxonomy)) {
          deniedFields.push(field.taxonomy);
          continue;
        }

        const crossTenant = evaluateCrossTenantField(input, field.sourceTenantId);
        if (crossTenant) {
          return crossTenant;
        }
      }

      if (deniedFields.length > 0) {
        return deny(input.panelId, "unknown_taxonomy", deniedFields);
      }

      return allow(input.panelId, "tenant_scope_respected");
    },

    proveRenderedPanelBoundary(input: RenderedPanelProofInput): RenderedPanelProofResult {
      const violations: RenderedPanelProofResult["violations"][number][] = [];

      for (const field of input.renderedFields) {
        const panelInput: PanelDataPathInput = {
          panelId: input.panelId,
          tenantId: input.tenantId,
          persona: input.persona,
          overlayActive: input.overlayActive ?? [],
          fieldTaxonomy: [
            {
              taxonomy: field.taxonomy,
              phi: field.phi,
              sourceTenantId: field.sourceTenantId,
            },
          ],
        };

        const phiResult = evaluatePhiOverlayBoundary(panelInput, registry);
        if (field.phi && phiResult.decision === "DENY") {
          violations.push({
            fieldId: field.fieldId,
            rule: "phi-outside-overlay",
            detail: phiResult.reason,
          });
        }

        const crossTenant = evaluateCrossTenantField(panelInput, field.sourceTenantId);
        if (crossTenant) {
          violations.push({
            fieldId: field.fieldId,
            rule: "cross-tenant",
            detail: crossTenant.reason,
          });
        }

        const personaViolation = evaluatePersonaScope(panelInput, field.taxonomy);
        if (personaViolation) {
          violations.push({
            fieldId: field.fieldId,
            rule: "persona-scope",
            detail: personaViolation,
          });
        }
      }

      return {
        pass: violations.length === 0,
        violations,
      };
    },
  };

  return Object.assign(harness, {
    panelDataPathHarnessId: "panel-data-path-harness:default",
    panelDataPathHarnessKey: "panel-data-path-harness:default",
    containsVerticalComplianceLogic: false as const,
    executable: false as const,
  });
}

export const panelDataPathHarness = createPanelDataPathHarness();
