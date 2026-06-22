import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
  ControlSpinePersonaKey,
} from "../contracts";
import {
  classifyIsolationReach,
  type ClassifyIsolationReachCore,
  type ControlSpineIsolationAccessOutcome,
  type ControlSpineIsolationDenyReason,
  type ControlSpineIsolationScope,
  type ControlSpineResourceVisibilityScope,
} from "../isolation";

export type ControlSpineConfigReachOutcome = "allowed" | "denied";

export type ControlSpineConfigAttributeDenyReason =
  | ControlSpineIsolationDenyReason
  | "missing_config_scope"
  | "ambiguous_config_scope"
  | "deny_by_default";

export interface IndustryConfigRecordDescriptor {
  industryConfigRecordReferenceId: string;
  tenantAttributeStoreReferenceId: string;
  /** Opaque industry classification reference — content may differ by industry; not compliance-evaluated here. */
  industryClassificationReferenceId: string;
  visibilityScope: ControlSpineResourceVisibilityScope;
  isolationScope: ControlSpineIsolationScope | null | undefined;
  configScopeParseable: boolean;
}

export interface ClassifyConfigAttributeReachInput {
  requesterPersonaKey: ControlSpinePersonaKey;
  requesterPersonaReferenceId: string;
  requesterScope: ControlSpineIsolationScope | null | undefined;
  targetConfigRecord: IndustryConfigRecordDescriptor;
}

export interface ClassifyConfigAttributeReachCore {
  configReachOutcome: ControlSpineConfigReachOutcome;
  isolationAccessOutcome: ControlSpineIsolationAccessOutcome;
  denyReason: ControlSpineConfigAttributeDenyReason | null;
  evaluationTrace: string[];
}

export interface EvaluateIndustryConfigIsolationInput extends ClassifyConfigAttributeReachInput {
  actorReferenceId: string;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
}

export interface ControlSpineCommandCenterInvariantMarker {
  commandCenterInvariantMarkerId: string;
  commandCenterInvariantMarkerKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  /** Panel selection/layout may vary by industry — not evaluated here. */
  panelSelectionNotEvaluatedHere: true;
  /** Config STORAGE/ACCESS inherits spine isolation — never a backdoor around data isolation. */
  configStorageInheritsIsolation: true;
  /** Evaluator isolates config records; it does not implement industry compliance logic. */
  isolatesConfigStorageOnly: true;
}

export interface ControlSpineIndustryConfigIsolationEvaluationResult {
  industryConfigIsolationEvaluationResultId: string;
  industryConfigIsolationEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  configReachOutcome: ControlSpineConfigReachOutcome;
  composedOutcome: ControlSpineConfigReachOutcome;
  isolationAccessOutcome: ControlSpineIsolationAccessOutcome;
  denyReason: ControlSpineConfigAttributeDenyReason | null;
  commandCenterInvariantMarker: ControlSpineCommandCenterInvariantMarker;
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `tenant-attr-eval:${parts.filter(Boolean).join(":")}`;
}

function createCommandCenterInvariantMarker(): ControlSpineCommandCenterInvariantMarker {
  return {
    commandCenterInvariantMarkerId: "command-center-invariant:config-storage-inherits-isolation",
    commandCenterInvariantMarkerKey: "command-center-invariant:config-storage-inherits-isolation",
    containsVerticalComplianceLogic: false,
    executable: false,
    panelSelectionNotEvaluatedHere: true,
    configStorageInheritsIsolation: true,
    isolatesConfigStorageOnly: true,
  };
}

function validateConfigRecordScope(
  record: IndustryConfigRecordDescriptor,
  evaluationTrace: string[],
): { valid: true } | { valid: false; reason: ControlSpineConfigAttributeDenyReason } {
  if (!record.configScopeParseable) {
    evaluationTrace.push("config_scope:unparseable");
    return { valid: false, reason: "ambiguous_config_scope" };
  }

  if (!record.isolationScope) {
    evaluationTrace.push("config_scope:missing");
    return { valid: false, reason: "missing_config_scope" };
  }

  const scope = record.isolationScope;

  if (
    !hasValue(scope.customerTenantId) ||
    !hasValue(scope.firmTenantId) ||
    !hasValue(scope.isolationScopeReferenceId)
  ) {
    evaluationTrace.push("config_scope:ambiguous");
    return { valid: false, reason: "ambiguous_config_scope" };
  }

  const dimensions: ControlSpineIsolationDimension[] = [
    scope.customerIsolation,
    scope.firmIsolation,
    scope.clientIsolation,
  ];

  for (const dimension of dimensions) {
    if (
      !hasValue(dimension.isolationDimensionReferenceId) ||
      !hasValue(dimension.tenantScopeKey) ||
      !Array.isArray(dimension.boundaryReferenceIds)
    ) {
      evaluationTrace.push("config_scope:dimension_ambiguous");
      return { valid: false, reason: "ambiguous_config_scope" };
    }
  }

  evaluationTrace.push(`config_scope:valid:${scope.isolationScopeReferenceId}`);
  return { valid: true };
}

function denyAtConfigLayer(
  denyReason: ControlSpineConfigAttributeDenyReason,
  evaluationTrace: string[],
): ClassifyConfigAttributeReachCore {
  return {
    configReachOutcome: "denied",
    isolationAccessOutcome: "denied",
    denyReason,
    evaluationTrace: [...evaluationTrace, `deny:${denyReason}`],
  };
}

/**
 * Pure industry-config storage reach classifier.
 * Config CONTENT may differ by industry; config STORAGE/ACCESS is isolation-bound via 42.5B.
 * Panel selection logic is NOT evaluated here — only config record storage reach.
 */
export function classifyConfigAttributeReach(
  input: ClassifyConfigAttributeReachInput,
): ClassifyConfigAttributeReachCore {
  const evaluationTrace: string[] = [
    "classifyConfigAttributeReach:start",
    "policy:deny_by_default",
    "invariant:config_storage_inherits_isolation",
    "invariant:panel_selection_not_evaluated_here",
  ];

  const configScopeValidation = validateConfigRecordScope(input.targetConfigRecord, evaluationTrace);
  if (!configScopeValidation.valid) {
    return denyAtConfigLayer(configScopeValidation.reason, evaluationTrace);
  }

  const isolationClassification: ClassifyIsolationReachCore = classifyIsolationReach({
    requesterPersonaKey: input.requesterPersonaKey,
    requesterPersonaReferenceId: input.requesterPersonaReferenceId,
    requesterScope: input.requesterScope,
    targetResourceReferenceId: input.targetConfigRecord.industryConfigRecordReferenceId,
    targetResourceVisibilityScope: input.targetConfigRecord.visibilityScope,
    targetScope: input.targetConfigRecord.isolationScope,
  });

  evaluationTrace.push(
    "compose:config_through_isolation",
    ...isolationClassification.evaluationTrace,
    `isolation:${isolationClassification.accessOutcome}`,
  );

  if (isolationClassification.accessOutcome === "denied") {
    return {
      configReachOutcome: "denied",
      isolationAccessOutcome: "denied",
      denyReason: isolationClassification.denyReason ?? "deny_by_default",
      evaluationTrace: [...evaluationTrace, "compose:config_never_broader_than_data"],
    };
  }

  evaluationTrace.push("config_reach:allowed_within_isolation_boundary");

  return {
    configReachOutcome: "allowed",
    isolationAccessOutcome: "allowed",
    denyReason: null,
    evaluationTrace,
  };
}

function buildAuditEventFromEvaluation(
  input: EvaluateIndustryConfigIsolationInput,
  classification: ClassifyConfigAttributeReachCore,
  isolationFields: {
    customerIsolation: ControlSpineIsolationDimension;
    firmIsolation: ControlSpineIsolationDimension;
    clientIsolation: ControlSpineIsolationDimension;
  },
): AuditEventContract {
  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.targetConfigRecord.industryConfigRecordReferenceId,
      classification.configReachOutcome,
    ]),
    auditEventKey: `industry-config-isolation:${classification.configReachOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: isolationFields.customerIsolation,
    firmIsolation: isolationFields.firmIsolation,
    clientIsolation: isolationFields.clientIsolation,
    eventCategory: "access",
    eventOutcome: classification.configReachOutcome === "allowed" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.targetConfigRecord.industryConfigRecordReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...classification.evaluationTrace],
  };
}

function fallbackIsolationDimension(suffix: string): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: buildDeterministicEvaluationId([`dim-ref:tenant-attr-fallback:${suffix}`]),
    tenantScopeKey: buildDeterministicEvaluationId([`fallback:${suffix}`]),
    boundaryReferenceIds: [buildDeterministicEvaluationId([`boundary:tenant-attr-fallback:${suffix}`])],
  };
}

/**
 * Industry-config tenant-attribute isolation evaluator.
 * Config access can NEVER be broader than data access — composition is through 42.5B only.
 */
export function evaluateIndustryConfigIsolation(
  input: EvaluateIndustryConfigIsolationInput,
): ControlSpineIndustryConfigIsolationEvaluationResult {
  const classification = classifyConfigAttributeReach(input);
  const commandCenterInvariantMarker = createCommandCenterInvariantMarker();

  const requesterScope = input.requesterScope;
  const configScope = input.targetConfigRecord.isolationScope;

  const isolationFields = requesterScope ?? configScope ?? {
    customerIsolation: fallbackIsolationDimension("customer"),
    firmIsolation: fallbackIsolationDimension("firm"),
    clientIsolation: fallbackIsolationDimension("client"),
  };

  const evaluationTrace = [
    ...classification.evaluationTrace,
    `invariant:${commandCenterInvariantMarker.commandCenterInvariantMarkerKey}`,
  ];

  const industryConfigIsolationEvaluationResultId = buildDeterministicEvaluationId([
    input.requesterPersonaReferenceId,
    input.targetConfigRecord.industryConfigRecordReferenceId,
    classification.configReachOutcome,
    classification.denyReason ?? "none",
  ]);

  return {
    industryConfigIsolationEvaluationResultId,
    industryConfigIsolationEvaluationResultKey: `industry-config-isolation:${classification.configReachOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    configReachOutcome: classification.configReachOutcome,
    composedOutcome: classification.configReachOutcome,
    isolationAccessOutcome: classification.isolationAccessOutcome,
    denyReason: classification.denyReason,
    commandCenterInvariantMarker,
    evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, classification, {
      customerIsolation: isolationFields.customerIsolation,
      firmIsolation: isolationFields.firmIsolation,
      clientIsolation: isolationFields.clientIsolation,
    }),
  };
}
