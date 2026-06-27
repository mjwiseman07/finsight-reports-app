/**
 * LOCK-VC bundle — wiring traversals (V-C-1..V-C-7 + OTHER).
 */
import { PERMISSION_MATRIX, verifyAuditChannelPermissions } from "../../../lib/intelligence/synthetic/role-adapter/permission-matrix";
import {
  PANEL_DECISION_ENTRY_SCHEMA,
  validatePanelDecisionEntrySchema,
} from "../../../lib/intelligence/synthetic/standards/audit/vertical-decision-discriminators";
import { VERTICAL_KV_AUDIT_CHANNEL_REGISTRY } from "../../../lib/intelligence/synthetic/audit/channels/vertical-kv-audit-registry";
import { MEMORY_FRAMEWORK_PERSISTENCE_SCHEMA } from "../../../lib/intelligence/synthetic/standards/resolver/memory/persistence-schema";
import {
  resolveFiscalYearEnd,
  resolveReportingBasis,
} from "../../../lib/intelligence/synthetic/standards/resolver/org-edge/vertical-default-resolver";
import type { OrgDefaults } from "../../../lib/intelligence/synthetic/standards/resolver/org-edge/org-defaults";
import { lookupDotPath } from "../../../lib/intelligence/synthetic/standards/resolver/election-validators";
import {
  getVerticalElectionsRegistry,
  type SyncElectionRegistryDocument,
} from "../../../lib/intelligence/synthetic/standards/resolver/syncElectionRegistry";
import {
  VERTICAL_ROUTE_REGISTRY,
  verifyPanelConsumerRoutesAllVerticals,
} from "../../../lib/intelligence/synthetic/panel-consumer/vertical-route-registry";
import { SRC_AUDIT_CHANNEL_REGISTRY } from "../../../src/audit/kv-channel-registry-bridge";

export interface TraversalResult {
  readonly passed: boolean;
  readonly missing: readonly string[];
}

export function verifyRegistryHasVerticalElections(
  registry: SyncElectionRegistryDocument = getVerticalElectionsRegistry(),
): TraversalResult {
  const required: readonly string[] = [
    "verticalElections.RTL.FiscalCalendar",
    "verticalElections.RTL.ReturnsReserveBasis",
    "verticalElections.RTL.breakageMethodology",
    "verticalElections.RTL.principalAgentThreshold",
    "verticalElections.RTL.comparableStorePolicy.rule",
    "verticalElections.RTL.subSegmentDeclaration",
    "verticalElections.MFG.CostingMethod",
    "verticalElections.MFG.LifoReserveTracking",
    "verticalElections.MFG.varianceDecomposition",
    "verticalElections.NPO.restrictionType",
    "verticalElections.NPO.religiousDenomination",
    "verticalElections.NPO.chnaCycleYearsRemaining",
    "verticalElections.HC.provider340BStatus",
    "verticalElections.CROSS_VERTICAL.reportingBasis",
    "verticalElections.CROSS_VERTICAL.fiscalYearEnd",
  ];
  const missing = required.filter((path) => lookupDotPath(registry, path) === undefined);
  return { passed: missing.length === 0, missing };
}

export function verifyPanelConsumerRoutesAllVerticalsTraversal(): TraversalResult {
  return verifyPanelConsumerRoutesAllVerticals(VERTICAL_ROUTE_REGISTRY);
}

export function verifyAuditChannelPermissionsTraversal(): TraversalResult {
  return verifyAuditChannelPermissions(PERMISSION_MATRIX);
}

export function verifyDualAuditRegistryConsolidated(): TraversalResult {
  const lib = [...VERTICAL_KV_AUDIT_CHANNEL_REGISTRY];
  const src = [...SRC_AUDIT_CHANNEL_REGISTRY];
  if (lib.length !== src.length) {
    return {
      passed: false,
      missing: [`length mismatch lib=${lib.length} src=${src.length}`],
    };
  }
  for (let i = 0; i < lib.length; i += 1) {
    if (lib[i] !== src[i]) {
      return {
        passed: false,
        missing: [`channel mismatch at index ${i}: lib=${lib[i]} src=${src[i]}`],
      };
    }
  }
  return { passed: true, missing: [] };
}

export function verifyDecisionEntrySchemaHasVerticalContext(): TraversalResult {
  return validatePanelDecisionEntrySchema(PANEL_DECISION_ENTRY_SCHEMA);
}

export function verifyMemoryFrameworkPersistsVerticalState(): TraversalResult {
  const requiredSlots = [
    "verticalState.RTL.subSegmentLocked",
    "verticalState.RTL.fiscalCalendarPolicy",
    "verticalState.MFG.costingMethodLocked",
    "verticalState.NPO.restrictionDeclarationHistory",
  ];
  const missing = requiredSlots.filter(
    (slot) => lookupDotPath(MEMORY_FRAMEWORK_PERSISTENCE_SCHEMA, slot) === undefined,
  );
  return { passed: missing.length === 0, missing };
}

export function verifyOrgStandardsOverrideVerticalDefaults(): TraversalResult {
  const tests: Array<{
    entity: { reportingBasis?: "US_GAAP" | "IFRS"; fiscalYearEnd?: string };
    org: Partial<OrgDefaults>;
    expectedBasis: "US_GAAP" | "IFRS";
    expectedFye: string;
  }> = [
    {
      entity: { reportingBasis: "IFRS" },
      org: {},
      expectedBasis: "IFRS",
      expectedFye: "12-31",
    },
    {
      entity: {},
      org: { reportingBasis: "IFRS", reportingBasisLockedAtFirstClose: true },
      expectedBasis: "IFRS",
      expectedFye: "12-31",
    },
    {
      entity: {},
      org: { reportingBasisLockedAtFirstClose: true },
      expectedBasis: "US_GAAP",
      expectedFye: "12-31",
    },
    {
      entity: { fiscalYearEnd: "06-30" },
      org: { fiscalYearEnd: "12-31", reportingBasisLockedAtFirstClose: true },
      expectedBasis: "US_GAAP",
      expectedFye: "06-30",
    },
    {
      entity: {},
      org: { fiscalYearEnd: "09-30", reportingBasisLockedAtFirstClose: true },
      expectedBasis: "US_GAAP",
      expectedFye: "09-30",
    },
  ];

  const missing: string[] = [];
  for (const test of tests) {
    const basis = resolveReportingBasis(test.entity, test.org as OrgDefaults);
    if (basis !== test.expectedBasis) {
      missing.push(`basis: expected ${test.expectedBasis}, got ${basis}`);
    }
    const fye = resolveFiscalYearEnd(test.entity, test.org as OrgDefaults);
    if (fye !== test.expectedFye) {
      missing.push(`fye: expected ${test.expectedFye}, got ${fye}`);
    }
  }
  return { passed: missing.length === 0, missing };
}

export function runAllLockVcTraversals(): ReadonlyArray<{
  readonly id: string;
  readonly result: TraversalResult;
}> {
  return [
    { id: "V-C-1", result: verifyRegistryHasVerticalElections() },
    { id: "V-C-2", result: verifyPanelConsumerRoutesAllVerticalsTraversal() },
    { id: "V-C-3", result: verifyAuditChannelPermissionsTraversal() },
    { id: "OTHER", result: verifyDualAuditRegistryConsolidated() },
    { id: "V-C-4", result: verifyDecisionEntrySchemaHasVerticalContext() },
    { id: "V-C-6", result: verifyMemoryFrameworkPersistsVerticalState() },
    { id: "V-C-7", result: verifyOrgStandardsOverrideVerticalDefaults() },
  ];
}
