import type { ControlSpineIsolationDimension } from "../../control-spine/contracts";
import {
  createSpineRetentionBaselineConfiguration,
  mergeRetentionWithOverlayContributions,
  SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
} from "../../control-spine/audit/buildAuditEvent";
import type { RetentionConfigurationContract } from "../../control-spine/contracts";
import {
  buildOverlayAttachmentContract,
  evaluateOverlayDiscipline,
} from "../overlay-discipline/evaluateOverlayDiscipline";
import {
  RETENTION_BASELINE,
  getHipaaDocumentationFloorDays,
  retentionBaselineLookup,
  type RetentionCategory,
} from "./retentionBaseline";

export interface RetentionBaselineFM1BindingCase {
  caseId: string;
  description: string;
  run(): boolean;
}

export interface RetentionBaselineFM1BindingCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  details: Record<string, unknown>;
}

function isolationDimension(tenantScopeKey: string, suffix: string): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: `dim-ref:${suffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${suffix}`],
  };
}

function buildBaselineConfigurationFrom42_5T(): RetentionConfigurationContract {
  const customerIsolation = isolationDimension("tenant-retention-test", "customer:retention-test");
  const firmIsolation = isolationDimension("firm-retention-test", "firm:retention-test");
  const clientIsolation = isolationDimension("client-retention-test", "client:retention-test");

  const spineBaseline = createSpineRetentionBaselineConfiguration({
    retentionConfigurationContractId: "retention-config:42.5t-fm1-binding",
    customerIsolation,
    firmIsolation,
    clientIsolation,
  });

  return {
    ...spineBaseline,
    defaultRetentionTiers: RETENTION_BASELINE.map((entry) => ({
      retentionTierReferenceId: `retention-tier:${entry.category}`,
      retentionTierKey: entry.category,
      retentionDurationDays: entry.durationDays,
      logCategoryReferenceIds: [`log-category:${entry.category}`],
    })),
  };
}

function maxBaselineDays(): number {
  return Math.max(...RETENTION_BASELINE.map((entry) => entry.durationDays));
}

function buildHipaaLoosenAttempt(contributedDays: number) {
  const contract = buildOverlayAttachmentContract({
    overlayRegistryKey: "overlay:hipaa",
    overlayAttachmentReferenceId: "attachment:hipaa-retention-test",
    activationScopeReferenceId: "scope:activation:hipaa-retention-test",
    regulatoryScopeStatementReferenceId: "scope:regulatory:hipaa",
    precedenceConfigurationReferenceId: "scope:precedence:hipaa",
    overlayInterfaceSlotReferenceIds: [
      "slot:audit_logging_event_interface",
      "slot:regulated_compliant_audit_store_interface",
    ],
    customerTenantId: "tenant-hipaa",
    firmTenantId: "firm-hipaa",
    clientTenantId: "client-hipaa",
  });

  return {
    overlayAttachmentAttemptReferenceId: "overlay-attempt:hipaa-retention-loosen",
    attachmentContract: contract,
    attemptedActionKind: "contribute_retention_floor_via_slot" as const,
    targetSlotReferenceId: "slot:regulated_compliant_audit_store_interface",
    actionScopeBoundaryReferenceId: contract.regulatoryScopeStatementReferenceId,
    actionDescriptorParseable: true,
    retentionContribution: {
      contributedRetentionDurationDays: contributedDays,
      contributionMode: "max_merge_contribution" as const,
      spineBaselineRetentionDurationDays: getHipaaDocumentationFloorDays(),
    },
  };
}

export const RETENTION_BASELINE_FM1_BINDING_CASES: RetentionBaselineFM1BindingCase[] = [
  {
    caseId: "FM1-01-BASELINE-ONLY-MAX",
    description: "Baseline-only tenant: FM-1 merge returns MAX of all baseline categories (2191 days)",
    run() {
      const baselineConfig = buildBaselineConfigurationFrom42_5T();
      const result = mergeRetentionWithOverlayContributions({
        baselineConfiguration: baselineConfig,
        overlayContributionDurationDays: [],
        logCategoryReferenceId: "log-category:application-system-logs",
      });
      return result.mergedRetentionDurationDays === maxBaselineDays() && maxBaselineDays() === 2191;
    },
  },
  {
    caseId: "FM1-02-HIPAA-OVERLAY-2191",
    description: "HIPAA-overlay tenant: FM-1 merge returns MAX(baseline, HIPAA 2191-day floor)",
    run() {
      const baselineConfig = buildBaselineConfigurationFrom42_5T();
      const hipaaFloor = getHipaaDocumentationFloorDays();
      const result = mergeRetentionWithOverlayContributions({
        baselineConfiguration: baselineConfig,
        overlayContributionDurationDays: [hipaaFloor],
        logCategoryReferenceId: "log-category:hipaa-documentation",
      });
      return result.mergedRetentionDurationDays === 2191;
    },
  },
  {
    caseId: "FM1-03-FUTURE-OVERLAY-3000",
    description: "Hypothetical future overlay 3000-day floor: FM-1 merge returns 3000",
    run() {
      const baselineConfig = buildBaselineConfigurationFrom42_5T();
      const result = mergeRetentionWithOverlayContributions({
        baselineConfiguration: baselineConfig,
        overlayContributionDurationDays: [3000],
        logCategoryReferenceId: "log-category:future-overlay",
      });
      return result.mergedRetentionDurationDays === 3000;
    },
  },
  {
    caseId: "FM1-04-PER-TENANT-LOWER-IGNORED",
    description: "Per-tenant lower contribution ignored: FM-1 MAX keeps baseline floor",
    run() {
      const baselineConfig = buildBaselineConfigurationFrom42_5T();
      const result = mergeRetentionWithOverlayContributions({
        baselineConfiguration: baselineConfig,
        overlayContributionDurationDays: [200],
        logCategoryReferenceId: "log-category:application-system-logs",
      });
      return result.mergedRetentionDurationDays === maxBaselineDays();
    },
  },
  {
    caseId: "FM1-05-REGULATORY-LOOSEN-VIOLATION",
    description: "Lowering below HIPAA regulatory floor: FM-1 discipline violation + audit event",
    run() {
      const attempt = buildHipaaLoosenAttempt(getHipaaDocumentationFloorDays() - 1);
      const result = evaluateOverlayDiscipline({
        actorReferenceId: "actor:hipaa-retention-loosen",
        attachmentAttempt: attempt,
        evaluationTimestampIso: "2026-06-20T12:00:00.000Z",
        retentionConfigurationReferenceId: "retention:max-of-overlays",
      });
      return (
        result.disciplineOutcome === "violation" &&
        result.violationReason === "fm1_replace_or_loosen_baseline" &&
        result.auditEvent.eventOutcome === "denied"
      );
    },
  },
  {
    caseId: "FM1-06-HIPAA-FLOOR-LOOKUP",
    description: "getHipaaDocumentationFloorDays() returns exactly 2191",
    run() {
      return (
        retentionBaselineLookup.getHipaaDocumentationFloorDays() === 2191 &&
        getHipaaDocumentationFloorDays() === 2191
      );
    },
  },
  {
    caseId: "FM1-07-BASELINE-FROZEN",
    description: "RETENTION_BASELINE array and entries are frozen",
    run() {
      if (!Object.isFrozen(RETENTION_BASELINE)) return false;
      return RETENTION_BASELINE.every((entry) => Object.isFrozen(entry));
    },
  },
  {
    caseId: "FM1-08-REGULATORY-CITATIONS",
    description: "Every regulatoryFloor entry has non-null regulatoryCitation",
    run() {
      return RETENTION_BASELINE.filter((entry) => entry.regulatoryFloor).every(
        (entry) => typeof entry.regulatoryCitation === "string" && entry.regulatoryCitation.length > 0,
      );
    },
  },
  {
    caseId: "FM1-09-NON-EMPTY-RATIONALE",
    description: "Every baseline entry has non-empty rationale",
    run() {
      return RETENTION_BASELINE.every((entry) => entry.rationale.trim().length > 0);
    },
  },
  {
    caseId: "FM1-10-CATEGORY-EXHAUSTIVE",
    description: "Exactly four baseline categories present with spine application/system alignment (395)",
    run() {
      const expected: RetentionCategory[] = [
        "hipaa-documentation",
        "soc2-evidence-logs",
        "security-incident-logs",
        "application-system-logs",
      ];
      const categories = RETENTION_BASELINE.map((entry) => entry.category);
      const appEntry = RETENTION_BASELINE.find((entry) => entry.category === "application-system-logs");
      return (
        categories.length === 4 &&
        expected.every((category) => categories.includes(category)) &&
        appEntry?.durationDays === SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS
      );
    },
  },
];

export function executeRetentionBaselineFM1BindingTests(): {
  pass: boolean;
  results: RetentionBaselineFM1BindingCaseResult[];
} {
  const results = RETENTION_BASELINE_FM1_BINDING_CASES.map((testCase) => {
    let passed = false;
    let details: Record<string, unknown> = {};
    try {
      passed = testCase.run();
      details = { error: null };
    } catch (error) {
      passed = false;
      details = { error: error instanceof Error ? error.message : String(error) };
    }
    return {
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      details,
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
