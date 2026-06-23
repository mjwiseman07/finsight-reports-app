import type { ControlSpinePersonaKey } from "../../../../../../ops/control-spine/contracts";
import type { ManufacturingVariancePanelReadParams } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import {
  buildIsolationScopeFromTenantId,
  evaluateRbacAccess,
  panelDataPathHarness,
  type PanelDataPathInput,
} from "../../../spine";
import type { ManufacturingEvaluatorResult } from "../variance/types";
import type { AuthorizeManufacturingPanelRead, ManufacturingSpineSession } from "./types";

const MANUFACTURING_VARIANCE_PANEL_ID = "manufacturing-variance";

function mapPersonaToPanelHarnessPersona(
  personaKey: ControlSpinePersonaKey,
): PanelDataPathInput["persona"] {
  switch (personaKey) {
    case "firm_admin":
      return "firm-admin";
    case "client_controller":
    case "client_owner":
      return "client-side";
    default:
      return "firm-staff";
  }
}

function isCrossTenantAttempt(
  params: ManufacturingVariancePanelReadParams,
  session: ManufacturingSpineSession,
): boolean {
  return params.companyId !== session.tenantId || params.context.companyId !== params.companyId;
}

export const authorizeManufacturingPanelRead: AuthorizeManufacturingPanelRead = (
  params,
  session,
): ManufacturingEvaluatorResult<void> => {
  if (isCrossTenantAttempt(params, session)) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const requesterScope = buildIsolationScopeFromTenantId(session.tenantId);
  const targetScope = buildIsolationScopeFromTenantId(params.companyId);

  const rbacResult = evaluateRbacAccess({
    actorReferenceId: session.actorReferenceId,
    retentionConfigurationReferenceId: session.retentionConfigurationReferenceId,
    evaluationTimestampIso: session.evaluationTimestampIso,
    personaKey: session.personaKey,
    personaReferenceId: session.personaReferenceId,
    rbacMatrix: session.rbacMatrix,
    requestedAction: {
      actionReferenceId: "manufacturing-variance:read",
      requestedGrantScopeReferenceId: `company:${params.companyId}`,
    },
    targetResource: {
      resourceReferenceId: `panel:${MANUFACTURING_VARIANCE_PANEL_ID}`,
      authorizedSurfaceReferenceId: "command-center:industry",
      requiredGrantScopeReferenceId: `company:${params.companyId}`,
    },
    isolationInput: {
      requesterPersonaKey: session.personaKey,
      requesterPersonaReferenceId: session.personaReferenceId,
      requesterScope,
      targetResourceReferenceId: `panel:${MANUFACTURING_VARIANCE_PANEL_ID}`,
      targetResourceVisibilityScope: "customer_shared",
      targetScope,
    },
  });

  if (rbacResult.composedOutcome !== "allowed") {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const panelAssertion = panelDataPathHarness.assertTenantScope({
    panelId: MANUFACTURING_VARIANCE_PANEL_ID,
    tenantId: session.tenantId,
    persona: mapPersonaToPanelHarnessPersona(session.personaKey),
    overlayActive: [],
    fieldTaxonomy: [
      {
        taxonomy: "financial-summary",
        phi: false,
        sourceTenantId: session.tenantId,
      },
    ],
    phi: false,
  });

  if (panelAssertion.decision === "DENY") {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  return { ok: true, value: undefined };
};
