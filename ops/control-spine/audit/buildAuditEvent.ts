import type {
  AuditEventContract,
  ControlSpineAuditEventCategory,
  ControlSpineAuditEventOutcome,
  ControlSpineIsolationDimension,
  RetentionConfigurationContract,
} from "../contracts";

export type ControlSpineAuditEventBuildCompleteness = "complete" | "incomplete_anomalous";

export interface BuildAuditEventInput {
  eventCategory: ControlSpineAuditEventCategory;
  actorReferenceId: string | null | undefined;
  personaReferenceId?: string | null | undefined;
  actionReferenceId: string | null | undefined;
  targetResourceReferenceId: string | null | undefined;
  eventOutcome: Extract<ControlSpineAuditEventOutcome, "success" | "denied">;
  customerIsolation: ControlSpineIsolationDimension | null | undefined;
  firmIsolation: ControlSpineIsolationDimension | null | undefined;
  clientIsolation: ControlSpineIsolationDimension | null | undefined;
  eventTimestampIso: string | null | undefined;
  retentionConfigurationReferenceId: string | null | undefined;
  evaluationTrace?: string[];
  /** Monotonic sequence hint for tamper-evident ordering (caller-supplied). */
  sequenceOrdinal?: number | null | undefined;
}

export interface ControlSpineAuditEventBuildResult {
  auditEventBuildResultId: string;
  auditEventBuildResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  buildCompleteness: ControlSpineAuditEventBuildCompleteness;
  tamperEvidentOrderingHint: string;
  buildTrace: string[];
  auditEvent: AuditEventContract;
}

const INCOMPLETE_SENTINEL = "incomplete:anomalous";

/** Universal spine baseline — 13 months application/system logs. Not a vertical floor. */
export const SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS = 395;

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

function fallbackIsolationDimension(suffix: string): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: buildDeterministicId("dim-ref", [`audit-fallback:${suffix}`]),
    tenantScopeKey: buildDeterministicId("fallback", [suffix]),
    boundaryReferenceIds: [buildDeterministicId("boundary", [`audit-fallback:${suffix}`])],
  };
}

function validateIsolationDimension(
  dimension: ControlSpineIsolationDimension | null | undefined,
): dimension is ControlSpineIsolationDimension {
  if (!dimension) {
    return false;
  }

  return (
    hasValue(dimension.isolationDimensionReferenceId) &&
    hasValue(dimension.tenantScopeKey) &&
    Array.isArray(dimension.boundaryReferenceIds)
  );
}

function collectInputAnomalies(input: BuildAuditEventInput, buildTrace: string[]): string[] {
  const anomalies: string[] = [];

  if (!hasValue(input.actorReferenceId)) {
    anomalies.push("missing_actor_reference");
  }

  if (!hasValue(input.actionReferenceId)) {
    anomalies.push("missing_action_reference");
  }

  if (!hasValue(input.targetResourceReferenceId)) {
    anomalies.push("missing_target_resource_reference");
  }

  if (!hasValue(input.eventTimestampIso)) {
    anomalies.push("missing_event_timestamp");
  }

  if (!hasValue(input.retentionConfigurationReferenceId)) {
    anomalies.push("missing_retention_configuration_reference");
  }

  if (!validateIsolationDimension(input.customerIsolation)) {
    anomalies.push("missing_or_ambiguous_customer_isolation");
  }

  if (!validateIsolationDimension(input.firmIsolation)) {
    anomalies.push("missing_or_ambiguous_firm_isolation");
  }

  if (!validateIsolationDimension(input.clientIsolation)) {
    anomalies.push("missing_or_ambiguous_client_isolation");
  }

  if (anomalies.length > 0) {
    buildTrace.push("anomaly:never_silently_drop", ...anomalies.map((a) => `anomaly:${a}`));
  }

  return anomalies;
}

function resolveIsolationFields(input: BuildAuditEventInput): {
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
} {
  return {
    customerIsolation: validateIsolationDimension(input.customerIsolation)
      ? input.customerIsolation
      : fallbackIsolationDimension("customer"),
    firmIsolation: validateIsolationDimension(input.firmIsolation)
      ? input.firmIsolation
      : fallbackIsolationDimension("firm"),
    clientIsolation: validateIsolationDimension(input.clientIsolation)
      ? input.clientIsolation
      : fallbackIsolationDimension("client"),
  };
}

function buildTamperEvidentOrderingHint(
  eventTimestampIso: string,
  sequenceOrdinal: number | null | undefined,
  auditEventContractId: string,
): string {
  const ordinal = typeof sequenceOrdinal === "number" && Number.isFinite(sequenceOrdinal)
    ? sequenceOrdinal
    : 0;

  return buildDeterministicId("order-hint", [eventTimestampIso, String(ordinal), auditEventContractId]);
}

/**
 * Constructs a universal AuditEventContract-shaped record.
 * NEVER silently drops: incomplete inputs produce an incomplete_anomalous record, not null.
 */
export function buildAuditEvent(input: BuildAuditEventInput): ControlSpineAuditEventBuildResult {
  const buildTrace: string[] = ["buildAuditEvent:start", "policy:never_silently_drop"];
  const anomalies = collectInputAnomalies(input, buildTrace);
  const buildCompleteness: ControlSpineAuditEventBuildCompleteness =
    anomalies.length === 0 ? "complete" : "incomplete_anomalous";

  const actorReferenceId = hasValue(input.actorReferenceId)
    ? input.actorReferenceId
    : INCOMPLETE_SENTINEL;
  const targetResourceReferenceId = hasValue(input.targetResourceReferenceId)
    ? input.targetResourceReferenceId
    : INCOMPLETE_SENTINEL;
  const eventTimestampIso = hasValue(input.eventTimestampIso)
    ? input.eventTimestampIso
    : "1970-01-01T00:00:00.000Z";
  const retentionConfigurationReferenceId = hasValue(input.retentionConfigurationReferenceId)
    ? input.retentionConfigurationReferenceId
    : INCOMPLETE_SENTINEL;

  const isolationFields = resolveIsolationFields(input);

  const auditTrailReferenceIds: string[] = [
    ...buildTrace,
    ...(input.evaluationTrace ?? []),
  ];

  if (hasValue(input.personaReferenceId)) {
    auditTrailReferenceIds.push(`persona:${input.personaReferenceId}`);
  }

  if (hasValue(input.actionReferenceId)) {
    auditTrailReferenceIds.push(`action:${input.actionReferenceId}`);
  } else {
    auditTrailReferenceIds.push(`action:${INCOMPLETE_SENTINEL}`);
  }

  if (buildCompleteness === "incomplete_anomalous") {
    auditTrailReferenceIds.push("build:incomplete_anomalous");
  }

  const resolvedOutcome: ControlSpineAuditEventOutcome =
    buildCompleteness === "incomplete_anomalous" ? "failure" : input.eventOutcome;

  const auditEventContractId = buildDeterministicId("audit-event", [
    actorReferenceId,
    targetResourceReferenceId,
    resolvedOutcome,
    eventTimestampIso,
  ]);

  const auditEvent: AuditEventContract = {
    auditEventContractId,
    auditEventKey: `audit-spine:${input.eventCategory}:${resolvedOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    ...isolationFields,
    eventCategory: input.eventCategory,
    eventOutcome: resolvedOutcome,
    actorReferenceId,
    targetResourceReferenceId,
    eventTimestampIso,
    retentionConfigurationReferenceId,
    auditTrailReferenceIds,
  };

  const tamperEvidentOrderingHint = buildTamperEvidentOrderingHint(
    eventTimestampIso,
    input.sequenceOrdinal,
    auditEventContractId,
  );

  buildTrace.push(`build:${buildCompleteness}`, `outcome:${resolvedOutcome}`);

  const auditEventBuildResultId = buildDeterministicId("audit-build", [
    auditEventContractId,
    buildCompleteness,
  ]);

  return {
    auditEventBuildResultId,
    auditEventBuildResultKey: `audit-spine-build:${buildCompleteness}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    buildCompleteness,
    tamperEvidentOrderingHint,
    buildTrace,
    auditEvent,
  };
}

export interface CreateSpineRetentionBaselineInput {
  retentionConfigurationContractId?: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
}

/**
 * FM-1 spine baseline only — universal application/system log tier.
 * Overlay legal floors are contributed externally and MAX-merged; never embedded here.
 */
export function createSpineRetentionBaselineConfiguration(
  input: CreateSpineRetentionBaselineInput,
): RetentionConfigurationContract {
  const contractId =
    input.retentionConfigurationContractId ?? "retention-config:spine-baseline";

  return {
    retentionConfigurationContractId: contractId,
    retentionConfigurationContractKey: "retention-config:spine-baseline",
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    policySource: "spine_default",
    defaultRetentionTiers: [
      {
        retentionTierReferenceId: "retention-tier:spine-baseline-application-system",
        retentionTierKey: "application_system_logs",
        retentionDurationDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
        logCategoryReferenceIds: ["log-category:application", "log-category:system"],
      },
    ],
    overlayRetentionContributionReferenceIds: [],
    resolvedRetentionPolicyReferenceId: "retention-policy:spine-baseline-only",
  };
}

export interface RetentionMaxMergeInput {
  baselineConfiguration: RetentionConfigurationContract;
  /** External SET of overlay-contributed retention durations (days). Spine does not interpret regime. */
  overlayContributionDurationDays: number[];
  logCategoryReferenceId: string;
}

export interface RetentionMaxMergeResult {
  retentionMaxMergeResultId: string;
  retentionMaxMergeResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  mergedRetentionDurationDays: number;
  mergeTrace: string[];
  retentionConfiguration: RetentionConfigurationContract;
}

/**
 * FM-1 retention hook — MAX of spine baseline tier vs overlay-contributed durations.
 * Overlay contributions are opaque numbers supplied externally; no vertical floor hardcoded.
 */
export function mergeRetentionWithOverlayContributions(
  input: RetentionMaxMergeInput,
): RetentionMaxMergeResult {
  const mergeTrace: string[] = ["mergeRetention:start", "policy:max_of_baseline_and_overlay_contributions"];

  const baselineDurations = input.baselineConfiguration.defaultRetentionTiers.map(
    (tier) => tier.retentionDurationDays,
  );
  const baselineMax = baselineDurations.length > 0 ? Math.max(...baselineDurations) : 0;

  mergeTrace.push(`baseline:max:${baselineMax}`);

  const validOverlayContributions = input.overlayContributionDurationDays.filter(
    (days) => typeof days === "number" && Number.isFinite(days) && days >= 0,
  );

  for (const contribution of validOverlayContributions) {
    mergeTrace.push(`overlay:contribution:${contribution}`);
  }

  const overlayMax =
    validOverlayContributions.length > 0 ? Math.max(...validOverlayContributions) : 0;

  const mergedRetentionDurationDays = Math.max(baselineMax, overlayMax);
  mergeTrace.push(`merge:result:${mergedRetentionDurationDays}`);

  const hasOverlayContributions = validOverlayContributions.length > 0;
  const policySource = hasOverlayContributions ? "max_of_overlays" : input.baselineConfiguration.policySource;

  const retentionConfiguration: RetentionConfigurationContract = {
    ...input.baselineConfiguration,
    policySource,
    overlayRetentionContributionReferenceIds: validOverlayContributions.map(
      (days, index) => `overlay-retention-contribution:${index}:${days}`,
    ),
    resolvedRetentionPolicyReferenceId: buildDeterministicId("retention-policy", [
      "resolved",
      input.logCategoryReferenceId,
      String(mergedRetentionDurationDays),
    ]),
    defaultRetentionTiers: input.baselineConfiguration.defaultRetentionTiers.map((tier) => ({
      ...tier,
      retentionDurationDays: mergedRetentionDurationDays,
      logCategoryReferenceIds: tier.logCategoryReferenceIds.includes(input.logCategoryReferenceId)
        ? tier.logCategoryReferenceIds
        : [...tier.logCategoryReferenceIds, input.logCategoryReferenceId],
    })),
  };

  return {
    retentionMaxMergeResultId: buildDeterministicId("retention-merge", [
      input.logCategoryReferenceId,
      String(mergedRetentionDurationDays),
    ]),
    retentionMaxMergeResultKey: "retention-config:max-merge",
    containsVerticalComplianceLogic: false,
    executable: false,
    mergedRetentionDurationDays,
    mergeTrace,
    retentionConfiguration,
  };
}

/**
 * Opaque integration slot toward Phase 42Q audit logging interface — implementation in 42.5L overlay namespace.
 */
export const AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT =
  "audit_logging_event_interface" as const;

export interface AuditLoggingInterfaceIntegrationPoint {
  integrationPointId: string;
  integrationPointKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  interfaceReferenceIdSlot: typeof AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT;
  boundInterfaceReferenceId: string | null;
  implementationOwnerModuleReferenceId: "42.5L";
}

export function declareAuditLoggingInterfaceIntegrationPoint(
  boundInterfaceReferenceId: string | null = null,
): AuditLoggingInterfaceIntegrationPoint {
  return {
    integrationPointId: "audit-interface-integration:42q-slot",
    integrationPointKey: "audit-logging-event-interface-slot",
    containsVerticalComplianceLogic: false,
    executable: false,
    interfaceReferenceIdSlot: AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT,
    boundInterfaceReferenceId,
    implementationOwnerModuleReferenceId: "42.5L",
  };
}
