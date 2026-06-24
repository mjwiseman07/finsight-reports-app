import {
  panelDataPathHarness,
  type PanelDataPathInput,
} from "../../../spine";
import type { RetailPerformancePanelReadParams } from "../../../../../dashboard/panels/retail-performance/contract";
import type { RetailEvaluatorResult } from "../performance/types";
import type { AuthorizeRetailPanelRead, RetailSpineSession } from "./types";

const RETAIL_PERFORMANCE_PANEL_ID = "retail-performance";

function mapPersonaToPanelHarnessPersona(personaId: string): PanelDataPathInput["persona"] {
  if (personaId === "firm_admin") return "firm-admin";
  if (personaId === "client_controller" || personaId === "client_owner") return "client-side";
  return "firm-staff";
}

function isCrossTenantAttempt(
  params: RetailPerformancePanelReadParams,
  session: RetailSpineSession,
): boolean {
  return params.companyId !== session.tenantId || params.context.companyId !== params.companyId;
}

export const authorizeRetailPanelRead: AuthorizeRetailPanelRead = (
  params,
  session,
): RetailEvaluatorResult<void> => {
  if (isCrossTenantAttempt(params, session)) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const panelAssertion = panelDataPathHarness.assertTenantScope({
    panelId: RETAIL_PERFORMANCE_PANEL_ID,
    tenantId: session.tenantId,
    persona: mapPersonaToPanelHarnessPersona(session.personaId),
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
