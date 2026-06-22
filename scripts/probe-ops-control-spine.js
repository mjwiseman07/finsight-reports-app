/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5O — Control-Spine Red-Team Probe
 * Normal mode: SKIPPED allowed for unbuilt owner modules (42.5P/Q/U).
 * LOCK mode: PHASE_42_5_LOCK_MODE=true — SKIPPED counts as VIOLATION (LOCK-42.5.3 gate).
 */
const verifier = require("./verify-ops-control-spine");
const fixtures = require("./probe-fixtures/phi-tagged-fixtures.js");

const LOCK_MODE = process.env.PHASE_42_5_LOCK_MODE === "true";

const {
  mandatoryPoisonCases,
  isolationEvaluator,
  rbacEvaluator,
  phiBoundaryHarness,
  panelDataPathHarness,
  phiIngestionGate,
  overlayActivationRegistry,
  hipaaOverlay,
  auditSpine,
  encryption,
  subprocessorRegistry,
  socScopeBoundary,
} = verifier;

function mapActual(expected, blocked, refused) {
  if (expected === "REFUSE") return refused ? "REFUSE" : blocked ? "REFUSE" : "ALLOW";
  if (expected === "DENY") return blocked ? "DENY" : "ALLOW";
  if (expected === "BRIGHT_LINE_BLOCK") return blocked ? "BRIGHT_LINE_BLOCK" : "ALLOW";
  return blocked ? "DENY" : "ALLOW";
}

function buildSkippedResult(pc, detail) {
  return {
    id: pc.id,
    name: pc.name,
    owner: pc.owner,
    vector: pc.vector,
    expected: pc.expected,
    actual: "SKIPPED",
    status: "SKIPPED",
    detail,
    fixture: { synthetic: fixtures.SYNTHETIC_PHI_TAG },
  };
}

function buildViolationFromSkip(pc, detail) {
  return {
    id: pc.id,
    name: pc.name,
    owner: pc.owner,
    vector: pc.vector,
    expected: pc.expected,
    actual: "SKIPPED",
    status: "VIOLATION",
    detail: `LOCK mode forbids skip: ${detail}`,
    fixture: { synthetic: fixtures.SYNTHETIC_PHI_TAG },
  };
}

const poisonCaseRunners = {
  "PC-01"() {
    const result = hipaaOverlay.assertPhiWriteTarget();
    const actual = result.refused ? "REFUSE" : "ALLOW";
    return {
      actual,
      status: actual === "REFUSE" ? "PASS" : "VIOLATION",
      detail: result.refuseReason ?? "PHI write not refused",
      fixture: { target: fixtures.NON_OVERLAY_TENANT, tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-02"() {
    const result = panelDataPathHarness.assertNoPhiOutsideOverlay({
      panelId: "panel:export:non-overlay",
      tenantId: fixtures.NON_OVERLAY_TENANT.customerTenantId,
      persona: "firm-staff",
      overlayActive: [],
      fieldTaxonomy: [
        {
          taxonomy: "patient-identifier",
          phi: true,
          sourceTenantId: fixtures.NON_OVERLAY_TENANT.customerTenantId,
        },
      ],
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.reason ?? "PHI reached non-overlay panel path",
      fixture: { target: fixtures.NON_OVERLAY_TENANT, tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-03"() {
    const result = auditSpine.assertRetentionTier();
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: `routesOverlayOnly=${result.routesOverlayOnly} spineDays=${result.spineRetentionDays}`,
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-04"() {
    const result = isolationEvaluator.evaluate({
      phi: true,
      scope: "aggregate-cross-tenant",
      requester: fixtures.TENANT_A,
      target: fixtures.TENANT_B,
      visibilityScope: "client_scoped",
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.denyReason ?? "cross-tenant not denied",
      fixture: { requester: fixtures.TENANT_A, target: fixtures.TENANT_B, tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-05"() {
    const result = hipaaOverlay.assertLlmCallGuard();
    const actual = result.refused ? "REFUSE" : "ALLOW";
    return {
      actual,
      status: actual === "REFUSE" ? "PASS" : "VIOLATION",
      detail: result.refuseReason ?? "LLM PHI path not refused",
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-06"() {
    const result = phiBoundaryHarness.assertGuardEnforced();
    const actual = result.blocked ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.violationKind ?? "boundary not enforced",
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-07"() {
    const result = overlayActivationRegistry.assertAttachmentInterfaceScope();
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: `resolution=${result.resolutionOutcome}`,
      fixture: { scope: fixtures.NON_OVERLAY_TENANT },
    };
  },
  "PC-08"() {
    const result = panelDataPathHarness.assertPanelOverlayScope({
      panelId: "panel:command-center:healthcare-ppd",
      tenantId: fixtures.NON_OVERLAY_TENANT.customerTenantId,
      persona: "firm-staff",
      overlayActive: [],
      fieldTaxonomy: [
        {
          taxonomy: "patient-identifier",
          phi: true,
          sourceTenantId: fixtures.NON_OVERLAY_TENANT.customerTenantId,
        },
      ],
      phi: true,
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.reason ?? "PHI panel outside overlay scope",
      fixture: { panel: "command-center", tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-09"() {
    const result = auditSpine.assertPhiRetentionFloor();
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: `overlayHook=${result.overlayRetentionHook} spineDays=${result.spineRetentionDays}`,
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-10"() {
    const result = hipaaOverlay.assertReplicationTargetBaa();
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.violationKind ?? "replication boundary not denied",
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-11"() {
    const result = rbacEvaluator.evaluate({
      personaKey: "firm_staff",
      authorizedSurfaceReferenceId: "surface:client-ledger",
      requiredGrantScopeReferenceId: "scope:read:all_clients",
      requestedGrantScopeReferenceId: "scope:read:all_clients",
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.denyReason ?? "RBAC did not deny",
      fixture: { persona: "firm_staff", tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-12"() {
    const pc = mandatoryPoisonCases.find((p) => p.id === "PC-12");
    return LOCK_MODE ? buildViolationFromSkip(pc, "awaiting 42.5U") : buildSkippedResult(pc, "awaiting 42.5U");
  },
  "PC-13"() {
    const result = encryption.assertPhiKeyScope();
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.violationReason ?? "key scope shared",
      fixture: { tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-14"() {
    const result = phiIngestionGate.evaluate({ overlayBypass: true, ingestionAttemptReferenceId: "ingestion:pc14-api-bypass" });
    const actual = result.refused ? "REFUSE" : "ALLOW";
    return {
      actual,
      status: actual === "REFUSE" ? "PASS" : "VIOLATION",
      detail: result.refuseReason ?? "overlay bypass not refused",
      fixture: { path: "api", overlayBypass: true, tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
  "PC-15"() {
    const result = socScopeBoundary.assertPhiFlagged({
      diagramId: "diagram:probe-pc15-poison",
      nodes: [
        {
          nodeId: "node:hipaa-unflagged-phi",
          namespace: "ops/compliance/overlays/hipaa/integration",
          dataTags: [{ taxonomy: "patient-identifier", phi: true, socScopeFlagged: false }],
        },
      ],
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.reason ?? "PHI not flagged for SOC scope",
      fixture: { diagramId: "diagram:probe-pc15-poison", unflagged: result.evidence?.unflaggedPhiNodes },
    };
  },
  "PC-16"() {
    const result = isolationEvaluator.evaluate({
      fromFirm: "A",
      toFirmClient: "B",
      requester: fixtures.TENANT_A,
      target: fixtures.TENANT_B,
      personaKey: "firm_staff",
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.denyReason ?? "cross-firm-staff not denied",
      fixture: { requester: fixtures.TENANT_A, target: fixtures.TENANT_B },
    };
  },
  "PC-17"() {
    const result = isolationEvaluator.evaluate({
      personaKey: "client_controller",
      personaReferenceId: "persona:client-controller-probe",
      requester: fixtures.buildIsolationScope(fixtures.TENANT_A),
      target: fixtures.buildIsolationScope(fixtures.TENANT_A),
      visibilityScope: "firm_internal",
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.denyReason ?? "client-side firm-internal not denied",
      fixture: { persona: "client-side", surface: "firm-internal" },
    };
  },
  "PC-18"() {
    const result = rbacEvaluator.evaluate({
      personaKey: "firm_staff",
      authorizedSurfaceReferenceId: "surface:firm-admin-settings",
      requiredGrantScopeReferenceId: "scope:write:firm_config",
      requestedGrantScopeReferenceId: "scope:write:firm_config",
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.denyReason ?? "firm-admin surface not denied for staff",
      fixture: { persona: "staff", surface: "firm-admin-only" },
    };
  },
  "PC-19"() {
    const result = panelDataPathHarness.assertTenantScope({
      panelId: "panel:command-center:generic-summary",
      tenantId: fixtures.TENANT_B.customerTenantId,
      persona: "firm-staff",
      overlayActive: [],
      fieldTaxonomy: [
        {
          taxonomy: "financial-summary",
          phi: false,
          sourceTenantId: fixtures.TENANT_A.customerTenantId,
        },
      ],
      phi: false,
    });
    const actual = result.denied ? "DENY" : "ALLOW";
    return {
      actual,
      status: actual === "DENY" ? "PASS" : "VIOLATION",
      detail: result.reason ?? "cross-tenant panel leak not denied",
      fixture: { requester: fixtures.TENANT_B, source: fixtures.TENANT_A },
    };
  },
  "PC-20"() {
    const result = phiBoundaryHarness.assertDerivedLearningBrightLine();
    const actual = result.blocked ? "BRIGHT_LINE_BLOCK" : "ALLOW";
    return {
      actual,
      status: actual === "BRIGHT_LINE_BLOCK" ? "PASS" : "VIOLATION",
      detail: result.violationKind ?? "derived-learning bright line not blocked",
      fixture: { derived: true, tag: fixtures.SYNTHETIC_PHI_TAG },
    };
  },
};

const poisonCases = mandatoryPoisonCases.map((pc) => ({
  id: pc.id,
  name: pc.name,
  vector: pc.vector,
  owner: pc.owner,
  expected: pc.expected,
  helper: pc.helper,
  awaitingModule: pc.awaitingModule ?? null,
  run() {
    const runner = poisonCaseRunners[pc.id];
    if (!runner) {
      const detail = `No runner for ${pc.id}`;
      if (LOCK_MODE) {
        return buildViolationFromSkip(pc, detail);
      }
      return {
        id: pc.id,
        name: pc.name,
        owner: pc.owner,
        vector: pc.vector,
        expected: pc.expected,
        actual: "ERROR",
        status: "VIOLATION",
        detail,
        fixture: {},
      };
    }
    try {
      const outcome = runner();
      return {
        id: pc.id,
        name: pc.name,
        owner: pc.owner,
        vector: pc.vector,
        expected: pc.expected,
        ...outcome,
      };
    } catch (error) {
      return {
        id: pc.id,
        name: pc.name,
        owner: pc.owner,
        vector: pc.vector,
        expected: pc.expected,
        actual: "ERROR",
        status: "VIOLATION",
        detail: error.message,
        fixture: { synthetic: fixtures.SYNTHETIC_PHI_TAG },
      };
    }
  },
}));

function runAllPoisonCases() {
  const results = poisonCases.map((pc) => pc.run());
  const violations = results.filter((r) => r.status === "VIOLATION").length;
  return { violations, results };
}

module.exports = {
  poisonCases,
  runAllPoisonCases,
  LOCK_MODE,
};

if (require.main === module) {
  const { violations, results } = runAllPoisonCases();
  results.forEach((r) => {
    const prefix = r.status === "PASS" ? "PASS " : r.status === "SKIPPED" ? "SKIP " : "VIOL ";
    console.log(
      `${prefix}  ${r.id}  ${r.name}  expected=${r.expected} actual=${r.actual}${r.status === "VIOLATION" || r.status === "SKIPPED" ? `\n        ${r.detail}` : ""}`,
    );
  });
  console.log(`\nPROBE_EXIT:${violations === 0 ? 0 : 1}  violations=${violations} total=${results.length}`);
  process.exit(violations === 0 ? 0 : 1);
}
