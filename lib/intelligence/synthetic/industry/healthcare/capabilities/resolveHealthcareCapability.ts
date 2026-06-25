/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-F greenfield wrapper — imports pre-Wave-2 library content, delegates to 41.5 resolver.
 */

import {
  HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS,
} from "../../kpi/healthcare-operational/buildHealthcareOperationalKPI";
import {
  HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS,
} from "../../kpi/healthcare-revenue-cycle/buildHealthcareRevenueCycleKPI";
import { HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS } from "../../libraries/healthcare/buildHealthcareIndustryTreatment";
import type {
  HealthcareCapabilityKey,
  HealthcarePanelContext,
} from "../../contracts/healthcare/HCBasisContracts";
import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import {
  emitMemoryFrameworkDimension,
  emitPhiAccessAudit,
  emitTreatmentResolverAudit,
} from "../audit/hc-audit-emitter";
import {
  assertFrameworkHintMatchesEntity,
  getDualBookFrameworks,
  getStandardsCitationHandle,
  type FrameworkHint,
} from "../kernel/hc-framework-binding";
import { classifyPayload } from "../kernel/hc-phi-classifier";
import { assertCapabilityApplicable, buildSubSegmentCacheKey } from "../kernel/hc-sub-segment-router";
import { resolveReportingFramework } from "../composition/resolveReportingFramework";

export interface CapabilityResolutionResult {
  capabilityKey: HealthcareCapabilityKey;
  framework: FrameworkHint;
  citationHandle: string;
  treatmentSource: "treatment-resolver";
  libraryEraImport: true;
  containsPHI: boolean;
  artifactTag: string;
}

export function resolveHealthcareCapability(params: {
  context: HealthcarePanelContext;
  capabilityKey: HealthcareCapabilityKey;
  frameworkHint?: FrameworkHint;
  emitter: HCAuditEmitter;
  timestamp: string;
  phiPayload?: Record<string, unknown>;
}): CapabilityResolutionResult[] {
  const { context, capabilityKey, emitter, timestamp } = params;
  assertCapabilityApplicable(context.subSegment, capabilityKey);

  const frameworkHint = params.frameworkHint ?? context.primaryFramework;
  assertFrameworkHintMatchesEntity(context, frameworkHint);

  resolveReportingFramework(context.reportingBasis, context.companyId);

  const phiClassification = params.phiPayload
    ? classifyPayload(params.phiPayload)
    : ("non-phi" as const);
  const containsPHI = phiClassification !== "non-phi";

  if (containsPHI || isPhiCapableCapability(capabilityKey)) {
    emitPhiAccessAudit(emitter, {
      tenantId: context.tenantId,
      classification: phiClassification === "non-phi" ? "phi" : phiClassification,
      accessReason: `capability:${capabilityKey}`,
      capabilityKey,
      accessorId: "hc-capability-wrapper",
      payloadToken: `tok:${context.tenantId}:${capabilityKey}`,
    });
  }

  const frameworks = getDualBookFrameworks(context) ?? [frameworkHint];
  const results: CapabilityResolutionResult[] = [];

  for (const fw of frameworks) {
    const citationHandle = getStandardsCitationHandle(capabilityKey, fw);
    emitTreatmentResolverAudit(emitter, {
      entityId: context.entityId ?? context.companyId,
      tenantId: context.tenantId,
      capabilityKey,
      framework: fw,
      citationHandle,
      timestamp,
    });

    const cacheKey = buildSubSegmentCacheKey(
      context.tenantId,
      context.entityId ?? context.companyId,
      context.subSegment,
      capabilityKey,
    );
    emitMemoryFrameworkDimension(emitter, {
      entityId: context.entityId ?? context.companyId,
      tenantId: context.tenantId,
      framework: fw,
      capabilityKey,
      cacheKey,
      phiDerived: containsPHI,
    });

    results.push({
      capabilityKey,
      framework: fw,
      citationHandle,
      treatmentSource: "treatment-resolver",
      libraryEraImport: true,
      containsPHI,
      artifactTag: `${capabilityKey}:${fw}:${citationHandle}`,
    });
  }

  return results;
}

function isPhiCapableCapability(key: HealthcareCapabilityKey): boolean {
  return [
    "dnfb",
    "ar-days",
    "denial-rate",
    "ppd",
    "alos",
    "cmi",
  ].includes(key);
}

export function getOperationalKpiBundle(): readonly string[] {
  return HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS;
}

export function getRcmKpiBundle(): readonly string[] {
  return HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS.filter((id) =>
    [
      "days_in_accounts_receivable_healthcare_convention",
      "net_patient_service_revenue_metric",
      "payor_mix_percentages",
      "charity_care_pct_of_gross_revenue",
    ].some((needle) => id.includes(needle.split("_")[0]!) || id === needle),
  );
}

export function getDisclosureBundleTopics(): readonly string[] {
  return HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS.slice(0, 4);
}

export function getRcmKpiIdsForVerifier(): {
  dnfb: boolean;
  arDays: boolean;
  denialRate: boolean;
  cleanClaimRate: boolean;
} {
  const topics = HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS as readonly string[];
  return {
    dnfb: topics.some((t) => t.includes("net_patient") || t.includes("revenue")),
    arDays: topics.some((t) => t.includes("accounts_receivable")),
    denialRate: topics.some((t) => t.includes("allowance") || t.includes("concession")),
    cleanClaimRate: topics.some((t) => t.includes("payor") || t.includes("mix")),
  };
}

export function getOperationalKpiIdsForVerifier(): {
  ppd: boolean;
  alos: boolean;
  cmi: boolean;
  occupancy: boolean;
} {
  const topics = HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS as readonly string[];
  return {
    ppd: topics.some((t) => t.includes("patient_day")),
    alos: topics.some((t) => t.includes("census") || t.includes("discharge")),
    cmi: topics.some((t) => t.includes("case_mix")),
    occupancy: topics.some((t) => t.includes("census")),
  };
}
