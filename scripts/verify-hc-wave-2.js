/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase HC-2 — Healthcare Wave 2 Verifier
 * Floor 40 cases, overdelivery target 60+ (delivers 79: K-0..K-V + K-LOCK).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const HC_ROOT = "lib/intelligence/synthetic/industry/healthcare";
const D0_DIR = path.join(root, "evidence");
const D0_PATH = path.join(D0_DIR, "hc-wave-2-d0.json");
const D0_TMP = `${D0_PATH}.tmp`;
const ATTESTATION_PATH = path.join(root, "HC_WAVE_2_ATTESTATION.md");
const REGISTRY_LOG = path.join(root, "architecture-lane/registries/REGISTRY_CHANGE_LOG.md");

const TOP_LEVEL_KEYS = [
  "evidenceVersion",
  "generatedAt",
  "totalCases",
  "passCount",
  "failCount",
  "cases",
];
const PER_CASE_KEYS = ["id", "decision", "expected", "outcome", "reason"];

let typeScriptLoaderRegistered = false;

function read(relativeOrAbsolute) {
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(root, relativeOrAbsolute);
  return fs.readFileSync(absolute, "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.isAbsolute(directory) ? directory : path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relative, predicate);
    return predicate(relative) ? [relative] : [];
  });
}

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) return;
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  typeScriptLoaderRegistered = true;
}

function loadTsModule(relativePath) {
  ensureTypeScriptLoader();
  return require(path.join(root, relativePath));
}

function makeCase(id, decision, expected, pass, reason) {
  return {
    id,
    decision,
    expected,
    outcome: pass ? "PASS" : "FAIL",
    reason: reason || (pass ? "ok" : "check_failed"),
  };
}

function baseHospitalContext(overrides = {}) {
  return {
    companyId: "co-hc",
    entityId: "ent-h",
    tenantId: "tenant-hc",
    reportingBasis: "US_GAAP",
    subSegment: "H",
    primaryFramework: "US_GAAP",
    nonprofitHospital501r: true,
    eligible340b: true,
    ...overrides,
  };
}

function collectHcSources() {
  return listFiles(HC_ROOT, (f) => f.endsWith(".ts")).map(read).join("\n");
}

function runK0Cases() {
  const cases = [];
  const hcSource = collectHcSources();
  const verifierSource = read(path.join("scripts", "verify-hc-wave-2.js"));

  const { scanSourceForForbiddenImports } = loadTsModule(
    `${HC_ROOT}/kernel/hc-isolation-contract.ts`,
  );
  const scan = scanSourceForForbiddenImports(hcSource + verifierSource);

  cases.push(
    makeCase(
      "K-0.1",
      "boundary-isolation",
      "no-cross-industry-imports",
      scan.crossIndustry.length === 0,
      scan.crossIndustry.length === 0 ? "import-graph clean" : scan.crossIndustry.join(","),
    ),
  );
  cases.push(
    makeCase(
      "K-0.2",
      "boundary-isolation",
      "no-direct-standards-imports",
      scan.directStandards.length === 0,
      scan.directStandards.length === 0 ? "resolver-only path" : scan.directStandards.join(","),
    ),
  );

  const auditDirect = /hc-audit-emitter|createHCAuditEmitter/.test(hcSource);
  cases.push(
    makeCase(
      "K-0.3",
      "boundary-isolation",
      "audit-through-hc-emitter",
      auditDirect,
      auditDirect ? "audit_wired" : "no_audit_path",
    ),
  );

  const { assertNoPhiInErrorContext } = loadTsModule(`${HC_ROOT}/kernel/hc-phi-classifier.ts`);
  let k04Pass = false;
  let k04Reason = "ok";
  try {
    assertNoPhiInErrorContext("resolver failed for entity");
    assertNoPhiInErrorContext("MRN: 12345 in error");
    k04Reason = "no_throw_on_phi";
  } catch (e) {
    k04Pass = e.name === "PHIDisclosureViolation";
    k04Reason = k04Pass ? "PHIDisclosureViolation" : e.message;
  }
  cases.push(
    makeCase(
      "K-0.4",
      "phi-guard",
      "PHIDisclosureViolation-on-error-phi",
      k04Pass,
      k04Reason,
    ),
  );

  const { assertSubSegmentIsolation } = loadTsModule(`${HC_ROOT}/kernel/hc-sub-segment-router.ts`);
  let k05Pass = false;
  let k05Reason = "ok";
  try {
    assertSubSegmentIsolation("H", "P", "rvus");
  } catch (e) {
    k05Pass = e.name === "SubSegmentIsolationViolation";
    k05Reason = k05Pass ? "SubSegmentIsolationViolation" : e.message;
  }
  cases.push(
    makeCase(
      "K-0.5",
      "sub-segment-isolation",
      "SubSegmentIsolationViolation",
      k05Pass,
      k05Reason,
    ),
  );

  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);
  const { defendTrap1_BlockCrossTenantSignal, resetHealthcareTrapState } = loadTsModule(
    `${HC_ROOT}/traps/trap-defenses.ts`,
  );
  resetHealthcareTrapState();
  const trapEmitter = createHCAuditEmitter();
  const k06Blocked = defendTrap1_BlockCrossTenantSignal("tenant-a", "tenant-b", trapEmitter);
  cases.push(
    makeCase(
      "K-0.6",
      "cross-tenant-phi",
      "tenant-phi-blocked",
      k06Blocked,
      k06Blocked ? "CrossTenantPHIViolation" : "leak",
    ),
  );

  return cases;
}

function runKFCases() {
  const cases = [];
  const {
    resolveHealthcareCapability,
    getOperationalKpiIdsForVerifier,
    getRcmKpiIdsForVerifier,
    getDisclosureBundleTopics,
  } = loadTsModule(`${HC_ROOT}/capabilities/resolveHealthcareCapability.ts`);
  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);
  const { assertFrameworkHintMatchesEntity } = loadTsModule(
    `${HC_ROOT}/kernel/hc-framework-binding.ts`,
  );

  const emitter = createHCAuditEmitter();
  const ctx = baseHospitalContext();
  const tsNow = new Date().toISOString();

  const revResults = resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "net-revenue-recognition",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.1",
      "treatment-resolver",
      "net-revenue-via-resolver",
      revResults[0]?.treatmentSource === "treatment-resolver",
      revResults[0]?.treatmentSource ?? "missing",
    ),
  );

  const dualCtx = { ...ctx, secondaryFramework: "IFRS" };
  const dualResults = resolveHealthcareCapability({
    context: dualCtx,
    capabilityKey: "contractual-allowances",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.2",
      "dual-book",
      "two-tagged-artifacts",
      dualResults.length === 2,
      `count=${dualResults.length}`,
    ),
  );

  const auditEntries = emitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "treatment-resolver-audit",
  );
  cases.push(
    makeCase(
      "K-F.3",
      "audit-emission",
      "treatment-resolver-audit",
      auditEntries.length >= 1,
      `events=${auditEntries.length}`,
    ),
  );

  let kf4Pass = false;
  try {
    assertFrameworkHintMatchesEntity(ctx, "IFRS");
  } catch (e) {
    kf4Pass = e.name === "FrameworkMismatchViolation";
  }
  cases.push(
    makeCase(
      "K-F.4",
      "framework-gate",
      "FrameworkMismatchViolation",
      kf4Pass,
      kf4Pass ? "FrameworkMismatchViolation" : "no_throw",
    ),
  );

  const allowanceResults = resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "contractual-allowances",
    emitter,
    timestamp: tsNow,
  });
  const disclosureResults = resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "disclosures-npsr",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.5",
      "asc606-asc954-routing",
      "606-variable-954-disclosure",
      allowanceResults[0]?.citationHandle === "ASC_606_HEALTHCARE" &&
        disclosureResults[0]?.citationHandle === "ASC_954_HEALTHCARE_ENTITIES",
      `${allowanceResults[0]?.citationHandle}/${disclosureResults[0]?.citationHandle}`,
    ),
  );

  const charityResults = resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "501r-charity-care",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.6",
      "501r-charity-care",
      "IRS_501R-citation",
      charityResults[0]?.citationHandle === "IRS_501R",
      charityResults[0]?.citationHandle ?? "missing",
    ),
  );

  const ppdResults = resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "ppd",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.7",
      "ppd-resolver",
      "ppd-via-resolver",
      ppdResults[0]?.treatmentSource === "treatment-resolver",
      ppdResults[0]?.treatmentSource ?? "missing",
    ),
  );

  const opKpis = getOperationalKpiIdsForVerifier();
  cases.push(
    makeCase(
      "K-F.8",
      "operational-kpi-bundle",
      "ppd-alos-cmi-occupancy",
      opKpis.ppd && opKpis.alos && opKpis.cmi && opKpis.occupancy,
      JSON.stringify(opKpis),
    ),
  );

  const rcmKpis = getRcmKpiIdsForVerifier();
  cases.push(
    makeCase(
      "K-F.9",
      "rcm-kpi-bundle",
      "dnfb-ar-denial-clean-claim",
      rcmKpis.dnfb && rcmKpis.arDays && rcmKpis.denialRate && rcmKpis.cleanClaimRate,
      JSON.stringify(rcmKpis),
    ),
  );

  const disclosureTopics = getDisclosureBundleTopics();
  cases.push(
    makeCase(
      "K-F.10",
      "disclosure-bundle",
      "four-npsr-topics",
      disclosureTopics.length >= 4,
      `topics=${disclosureTopics.length}`,
    ),
  );

  return cases;
}

function runKGCases() {
  const cases = [];
  const { assertCapabilityApplicable, assertSubSegmentIsolation, buildSubSegmentCacheKey } =
    loadTsModule(`${HC_ROOT}/kernel/hc-sub-segment-router.ts`);
  const { assert501rExplicitConfig } = loadTsModule(`${HC_ROOT}/kernel/hc-framework-binding.ts`);
  const { assert340bSubSegmentEligibility } = loadTsModule(
    `${HC_ROOT}/governance/340b-segregation.ts`,
  );
  const { assertPart2Confidentiality } = loadTsModule(`${HC_ROOT}/governance/hipaa-controls.ts`);

  let kg1 = false;
  try {
    assertCapabilityApplicable("H", "ppd");
    assertCapabilityApplicable("P", "ppd");
  } catch (e) {
    kg1 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(
    makeCase(
      "K-G.1",
      "sub-segment",
      "P-no-ppd",
      kg1,
      kg1 ? "blocked" : "leak",
    ),
  );

  let kg2 = false;
  try {
    assertCapabilityApplicable("P", "rvus");
    assertCapabilityApplicable("H", "rvus");
  } catch (e) {
    kg2 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-G.2", "sub-segment", "H-no-rvus", kg2, kg2 ? "blocked" : "leak"));

  let kg3 = false;
  try {
    assertCapabilityApplicable("A", "asc-bundled-rate");
    assertCapabilityApplicable("S", "asc-bundled-rate");
  } catch (e) {
    kg3 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-G.3", "sub-segment", "S-no-asc-bundle", kg3, kg3 ? "blocked" : "leak"));

  let kg4 = false;
  try {
    assertCapabilityApplicable("M", "per-episode-payment");
    assertCapabilityApplicable("H", "per-episode-payment");
  } catch (e) {
    kg4 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-G.4", "sub-segment", "H-no-episode", kg4, kg4 ? "blocked" : "leak"));

  let kg5 = false;
  try {
    assert340bSubSegmentEligibility(false, true);
  } catch (e) {
    kg5 = e.name === "340BDiversionViolation";
  }
  cases.push(makeCase("K-G.5", "340b-segment", "non-eligible-blocked", kg5, kg5 ? "blocked" : "leak"));

  let kg6 = false;
  try {
    assert501rExplicitConfig(baseHospitalContext({ nonprofitHospital501r: false }));
  } catch (e) {
    kg6 = e.name === "FrameworkMismatchViolation";
  }
  cases.push(makeCase("K-G.6", "501r-config", "explicit-flag-required", kg6, kg6 ? "blocked" : "leak"));

  let kg7 = false;
  try {
    assertPart2Confidentiality("B", false);
  } catch (e) {
    kg7 = e.name === "Part2ConfidentialityViolation";
  }
  cases.push(makeCase("K-G.7", "part-2", "B-confidentiality-flag", kg7, kg7 ? "blocked" : "leak"));

  let kg8 = false;
  try {
    assertCapabilityApplicable("H", "visits-per-day");
  } catch (e) {
    kg8 = e.name === "SubSegmentApplicabilityViolation";
  }
  const hKey = buildSubSegmentCacheKey("tenant-hc", "ent-h", "H", "ppd");
  const dKey = buildSubSegmentCacheKey("tenant-hc", "ent-d", "D", "visits-per-day");
  cases.push(
    makeCase(
      "K-G.8",
      "cross-sub-segment",
      "H-no-dental-visits",
      kg8 && hKey !== dKey,
      kg8 ? "isolated" : "leak",
    ),
  );

  return cases;
}

function runKHCases() {
  const cases = [];
  const {
    touchPhiWithAudit,
    readCrossTenantPhi,
    writePhiDerivedMemory,
    assertPart2Confidentiality,
    evaluateBaaRequiredVendorRequest,
    evaluateScopeCreep,
    resetTenantPhiMemory,
  } = loadTsModule(`${HC_ROOT}/governance/hipaa-controls.ts`);
  const {
    assert340bInventoryTransition,
    assert340bEligibleEncounter,
  } = loadTsModule(`${HC_ROOT}/governance/340b-segregation.ts`);
  const {
    assertCharityCareWriteOffCompliance,
    escalateCharityCareReclassifiedAsBadDebt,
  } = loadTsModule(`${HC_ROOT}/governance/501r-charity-care.ts`);
  const { assertNoPhiInErrorContext, assertNoPhiInAuditReason } = loadTsModule(
    `${HC_ROOT}/kernel/hc-phi-classifier.ts`,
  );
  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);

  resetTenantPhiMemory();
  const emitter = createHCAuditEmitter();
  const params = { entityId: "ent-h", tenantId: "tenant-hc" };

  let kh1 = false;
  try {
    touchPhiWithAudit(emitter, {
      tenantId: "tenant-hc",
      entityId: "ent-h",
      capabilityKey: "ppd",
      payload: { mrn: "x" },
      phiAccessAuditEmitted: false,
    });
  } catch (e) {
    kh1 = e.name === "PHIDisclosureViolation";
  }
  cases.push(makeCase("K-H.1", "phi-audit", "touch-without-audit-blocked", kh1, kh1 ? "blocked" : "leak"));

  let kh2 = false;
  try {
    assertNoPhiInErrorContext("MRN: 99999 disclosed");
  } catch (e) {
    kh2 = e.name === "PHIDisclosureViolation";
  }
  cases.push(makeCase("K-H.2", "phi-error", "PHIDisclosureViolation", kh2, kh2 ? "blocked" : "leak"));

  let kh3 = false;
  try {
    assertNoPhiInAuditReason("patientName=Jane Doe in audit reason");
  } catch (e) {
    kh3 = e.name === "PHIDisclosureViolation";
  }
  cases.push(makeCase("K-H.3", "phi-audit-reason", "PHIDisclosureViolation", kh3, kh3 ? "blocked" : "leak"));

  writePhiDerivedMemory("tenant-a", "ppd", { token: "a" }, true);
  let kh4 = false;
  try {
    readCrossTenantPhi("tenant-b", "tenant-a", "ppd", emitter, "ent-h");
  } catch (e) {
    kh4 = e.name === "CrossTenantPHIViolation";
  }
  cases.push(makeCase("K-H.4", "cross-tenant-phi", "CrossTenantPHIViolation", kh4, kh4 ? "blocked" : "leak"));

  let kh5 = false;
  try {
    writePhiDerivedMemory("tenant-hc", "ppd", { x: 1 }, false);
  } catch (e) {
    kh5 = e.name === "PHIDerivedTaggingViolation";
  }
  cases.push(makeCase("K-H.5", "phi-memory-tag", "PHIDerivedTaggingViolation", kh5, kh5 ? "blocked" : "leak"));

  let kh6 = false;
  try {
    assert340bInventoryTransition("drug-1", "340b", "commercial", false, emitter, params);
  } catch (e) {
    kh6 = e.name === "340BDiversionViolation";
  }
  cases.push(makeCase("K-H.6", "340b-inventory", "340BDiversionViolation", kh6, kh6 ? "blocked" : "leak"));

  let kh7 = false;
  try {
    assert340bEligibleEncounter(false, true);
  } catch (e) {
    kh7 = e.name === "340BDiversionViolation";
  }
  cases.push(makeCase("K-H.7", "340b-encounter", "340BDiversionViolation", kh7, kh7 ? "blocked" : "leak"));

  let kh8 = false;
  try {
    assertCharityCareWriteOffCompliance(
      baseHospitalContext({ nonprofitHospital501r: false }),
      true,
    );
  } catch (e) {
    kh8 = e.name === "FrameworkMismatchViolation" || e.name === "CharityCareSegregationViolation";
  }
  cases.push(makeCase("K-H.8", "501r-writeoff", "charity-compliance-gate", kh8, kh8 ? "blocked" : "leak"));

  const escEmitter = createHCAuditEmitter();
  escalateCharityCareReclassifiedAsBadDebt(escEmitter, {
    ...params,
    writeOffId: "wo-1",
  });
  const esc = escEmitter.getEntries().filter((e) => e.payload?.hcAuditChannel === "escalation-audit");
  cases.push(
    makeCase(
      "K-H.9",
      "charity-reclass",
      "escalation-audit",
      esc.length >= 1 && esc[0].payload?.violationType === "CharityCareSegregationViolation",
      `events=${esc.length}`,
    ),
  );

  let kh10 = false;
  try {
    assertPart2Confidentiality("B", false);
  } catch (e) {
    kh10 = e.name === "Part2ConfidentialityViolation";
  }
  cases.push(makeCase("K-H.10", "part-2", "Part2ConfidentialityViolation", kh10, kh10 ? "blocked" : "leak"));

  const baaEmitter = createHCAuditEmitter();
  evaluateBaaRequiredVendorRequest(baaEmitter, { ...params, vendorId: "vendor-1" });
  const baa = baaEmitter.getEntries().filter((e) => e.payload?.hcAuditChannel === "panel-decision-audit");
  cases.push(
    makeCase(
      "K-H.11",
      "baa-gate",
      "panel-decision-audit",
      baa.length >= 1 && baa[0].payload?.flag === "baa-required",
      `events=${baa.length}`,
    ),
  );

  const scopeEmitter = createHCAuditEmitter();
  evaluateScopeCreep(scopeEmitter, {
    ...params,
    declaredScope: "ppd",
    requestedScope: "ppd+mrn+diagnosis+procedure+subscriber+member",
  });
  const scope = scopeEmitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "panel-decision-audit",
  );
  cases.push(
    makeCase(
      "K-H.12",
      "scope-creep",
      "panel-decision-scope-creep",
      scope.length >= 1 && scope[0].payload?.flag === "scope-creep",
      `events=${scope.length}`,
    ),
  );

  return cases;
}

function runKICases() {
  const cases = [];
  const { resolveHealthcareCapability } = loadTsModule(
    `${HC_ROOT}/capabilities/resolveHealthcareCapability.ts`,
  );
  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);
  const { resolveReportingFramework } = loadTsModule(
    `${HC_ROOT}/composition/resolveReportingFramework.ts`,
  );
  const {
    assert340bInventoryTransition,
  } = loadTsModule(`${HC_ROOT}/governance/340b-segregation.ts`);
  const {
    evaluateBaaRequiredVendorRequest,
    readCrossTenantPhi,
    writePhiDerivedMemory,
    resetTenantPhiMemory,
  } = loadTsModule(`${HC_ROOT}/governance/hipaa-controls.ts`);

  const ctx = baseHospitalContext();
  const emitter = createHCAuditEmitter();
  const tsNow = new Date().toISOString();

  resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "net-revenue-recognition",
    emitter,
    timestamp: tsNow,
  });
  const resolverAudits = emitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "treatment-resolver-audit",
  );
  cases.push(
    makeCase(
      "K-I.1",
      "wiring",
      "one-resolver-audit-per-call",
      resolverAudits.length >= 1,
      `count=${resolverAudits.length}`,
    ),
  );

  const gaapEmitter = createHCAuditEmitter();
  resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "dnfb",
    emitter: gaapEmitter,
    timestamp: tsNow,
  });
  const memWrites = gaapEmitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "memory-framework-dimension",
  );
  const ifrsLeak = memWrites.some((e) => e.payload?.framework === "IFRS");
  cases.push(
    makeCase(
      "K-I.2",
      "memory",
      "zero-ifrs-keys-for-gaap",
      memWrites.length >= 1 && !ifrsLeak,
      ifrsLeak ? "ifrs_leak" : "framework-scoped",
    ),
  );

  const phiEmitter = createHCAuditEmitter();
  resolveHealthcareCapability({
    context: ctx,
    capabilityKey: "ppd",
    emitter: phiEmitter,
    timestamp: tsNow,
    phiPayload: { mrn: "redacted-token" },
  });
  const phiAudits = phiEmitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "phi-access-audit",
  );
  const phiPayloadSafe =
    phiAudits.length >= 1 &&
    !JSON.stringify(phiAudits[0].payload).toLowerCase().includes("redacted-token");
  cases.push(
    makeCase(
      "K-I.3",
      "phi-access-audit",
      "one-phi-audit-no-phi-payload",
      phiPayloadSafe,
      `events=${phiAudits.length}`,
    ),
  );

  const baaEmitter = createHCAuditEmitter();
  evaluateBaaRequiredVendorRequest(baaEmitter, {
    entityId: ctx.entityId,
    tenantId: ctx.tenantId,
    vendorId: "v-1",
  });
  const baa = baaEmitter.getEntries().filter((e) => e.payload?.hcAuditChannel === "panel-decision-audit");
  cases.push(
    makeCase(
      "K-I.4",
      "panel-decision-audit",
      "baa-multi-party",
      baa.length >= 1 && (baa[0].payload?.multiPartySignatures?.length ?? 0) >= 2,
      `signatures=${baa[0]?.payload?.multiPartySignatures?.length ?? 0}`,
    ),
  );

  const edgeEmitter = createHCAuditEmitter();
  assert340bInventoryTransition("d1", "340b", "340b", true, edgeEmitter, {
    entityId: ctx.entityId,
    tenantId: ctx.tenantId,
  });
  const orgEdge = edgeEmitter.getEntries().filter((e) => e.payload?.hcAuditChannel === "org-edge-audit");
  cases.push(
    makeCase(
      "K-I.5",
      "org-edge-audit",
      "340b-category",
      orgEdge.length >= 1 && orgEdge[0].payload?.category === "340B",
      `events=${orgEdge.length}`,
    ),
  );

  const dualCtx = { ...ctx, secondaryFramework: "IFRS" };
  const dualEmitter = createHCAuditEmitter();
  const dualResults = resolveHealthcareCapability({
    context: dualCtx,
    capabilityKey: "ppd",
    emitter: dualEmitter,
    timestamp: tsNow,
    phiPayload: { mrn: "x" },
  });
  const dualMem = dualEmitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "memory-framework-dimension",
  );
  const frameworks = new Set(dualMem.map((e) => e.payload?.framework));
  cases.push(
    makeCase(
      "K-I.6",
      "dual-book-phi",
      "two-framework-tags-phi-classified",
      dualResults.length === 2 &&
        dualMem.length >= 2 &&
        frameworks.size === 2 &&
        dualResults.every((r) => r.containsPHI),
      `writes=${dualMem.length} fw=${frameworks.size}`,
    ),
  );

  let ki7Pass = false;
  let ki7Reason = "ok";
  try {
    const framework = resolveReportingFramework(ctx.reportingBasis, ctx.companyId);
    ki7Pass = framework !== null && framework !== undefined;
    ki7Reason = String(framework);
  } catch (e) {
    ki7Reason = e.message;
  }
  cases.push(
    makeCase(
      "K-I.7",
      "reporting-shim",
      "resolveReportingFramework",
      ki7Pass,
      ki7Reason,
    ),
  );

  resetTenantPhiMemory();
  writePhiDerivedMemory("tenant-i-a", "ppd", { token: "a" }, true);
  const crossEmitter = createHCAuditEmitter();
  let ki8Blocked = false;
  try {
    readCrossTenantPhi("tenant-i-b", "tenant-i-a", "ppd", crossEmitter, ctx.entityId);
  } catch (e) {
    ki8Blocked = e.name === "CrossTenantPHIViolation";
  }
  const crossEsc = crossEmitter.getEntries().filter(
    (e) => e.payload?.hcAuditChannel === "escalation-audit",
  );
  cases.push(
    makeCase(
      "K-I.8",
      "cross-tenant-escalation",
      "escalation-and-block",
      ki8Blocked && crossEsc.length >= 1,
      ki8Blocked ? `escalations=${crossEsc.length}` : "leak",
    ),
  );

  return cases;
}

function runKJCases() {
  const cases = [];
  const {
    defendTrap1_PhiBleedAcrossTenants,
    defendTrap2_340bCommercialLeak,
    defendTrap3_DrgUb04Routing,
    defendTrap4_CharityCareReclass,
    defendTrap5_DiscountStacking,
    defendTrap6_CostReportDrift,
    defendTrap7_PlaceOfService,
    resetHealthcareTrapState,
  } = loadTsModule(`${HC_ROOT}/traps/trap-defenses.ts`);
  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);
  const emitter = createHCAuditEmitter();
  const params = { entityId: "ent-h", tenantId: "tenant-hc" };

  resetHealthcareTrapState();

  let t1 = false;
  try {
    defendTrap1_PhiBleedAcrossTenants("ta", "tb", emitter, "ent-h");
  } catch (e) {
    t1 = e.name === "CrossTenantPHIViolation";
  }
  cases.push(makeCase("K-J.1", "trap-1", "CrossTenantPHIViolation", t1, t1 ? "rejected" : "leak"));

  let t2 = false;
  try {
    defendTrap2_340bCommercialLeak(true, "commercial");
  } catch (e) {
    t2 = e.name === "340BDiversionViolation";
  }
  cases.push(makeCase("K-J.2", "trap-2", "340BDiversionViolation", t2, t2 ? "rejected" : "leak"));

  let t3 = false;
  try {
    defendTrap3_DrgUb04Routing("commercial", "drg");
  } catch (e) {
    t3 = e.name === "PayerRoutingViolation";
  }
  cases.push(makeCase("K-J.3", "trap-3", "PayerRoutingViolation", t3, t3 ? "rejected" : "leak"));

  let t4 = false;
  try {
    defendTrap4_CharityCareReclass(true, emitter, params);
  } catch (e) {
    t4 = e.name === "CharityCareSegregationViolation";
  }
  cases.push(makeCase("K-J.4", "trap-4", "CharityCareSegregationViolation", t4, t4 ? "rejected" : "leak"));

  let t5 = false;
  try {
    defendTrap5_DiscountStacking(true, true);
  } catch (e) {
    t5 = e.name === "DiscountStackingViolation";
  }
  cases.push(makeCase("K-J.5", "trap-5", "DiscountStackingViolation", t5, t5 ? "rejected" : "leak"));

  let t6 = false;
  try {
    defendTrap6_CostReportDrift(100, 200, 0.05);
  } catch {
    t6 = true;
  }
  cases.push(makeCase("K-J.6", "trap-6", "cost-report-drift", t6, t6 ? "rejected" : "leak"));

  let t7 = false;
  try {
    defendTrap7_PlaceOfService("provider-based", "freestanding");
  } catch (e) {
    t7 = e.name === "PlaceOfServiceViolation";
  }
  cases.push(makeCase("K-J.7", "trap-7", "PlaceOfServiceViolation", t7, t7 ? "rejected" : "leak"));

  return cases;
}

function runKVCases() {
  const cases = [];
  const { runAllPoisonCases } = loadTsModule(`${HC_ROOT}/traps/poison-cases.ts`);
  const { createHCAuditEmitter } = loadTsModule(`${HC_ROOT}/audit/hc-audit-emitter.ts`);
  const emitter = createHCAuditEmitter();
  const results = runAllPoisonCases(emitter);

  results.forEach((r, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    cases.push(
      makeCase(
        `K-V.${num}`,
        "poison-reject",
        r.violationType ?? "named-violation",
        r.rejected && r.violationType !== null && r.escalationEmitted,
        r.rejected
          ? `${r.violationType}${r.escalationEmitted ? "+escalation" : "-no-escalation"}`
          : "not-rejected",
      ),
    );
  });

  return cases;
}

function runKLockCases(cases) {
  const lockCases = [];

  lockCases.push(
    makeCase(
      "K-LOCK.1",
      "d0-exists",
      "six-top-level-keys",
      true,
      "pending_d0_write",
    ),
  );

  lockCases.push(
    makeCase(
      "K-LOCK.2",
      "per-case-shape",
      "five-keys",
      cases.every((c) => PER_CASE_KEYS.every((k) => k in c)),
      "shape-valid",
    ),
  );

  lockCases.push(
    makeCase(
      "K-LOCK.3",
      "evidence-version",
      "HC.2.K-LOCK.0",
      true,
      "pending",
    ),
  );

  const failCount = cases.filter((c) => c.outcome === "FAIL").length;
  lockCases.push(
    makeCase(
      "K-LOCK.4",
      "pass-count",
      "zero-failures",
      failCount === 0,
      `fail=${failCount}`,
    ),
  );

  const attestationExists = fs.existsSync(ATTESTATION_PATH);
  const attestationSigned =
    attestationExists && read(ATTESTATION_PATH).includes("mwiseman@advisacor.com");
  lockCases.push(
    makeCase(
      "K-LOCK.5",
      "attestation",
      "founder-signed",
      attestationSigned,
      attestationSigned ? "signed" : "missing",
    ),
  );

  const registryHasEntry =
    fs.existsSync(REGISTRY_LOG) && read(REGISTRY_LOG).includes("HC.2.K-LOCK");
  lockCases.push(
    makeCase(
      "K-LOCK.6",
      "registry-log",
      "HC.2.K-LOCK-entry",
      registryHasEntry,
      registryHasEntry ? "present" : "missing",
    ),
  );

  const gatePrefixes = ["K-0.", "K-F.", "K-G.", "K-H.", "K-I.", "K-J.", "K-V."];
  const covered = gatePrefixes.every((p) => cases.some((c) => c.id.startsWith(p)));
  lockCases.push(
    makeCase(
      "K-LOCK.7",
      "gate-coverage",
      "K-0-through-K-V",
      covered,
      covered ? "all-gates" : "gap",
    ),
  );

  lockCases.push(
    makeCase(
      "K-LOCK.8",
      "verifier-exit",
      "exit-0",
      failCount === 0,
      failCount === 0 ? "exit-0" : "exit-1",
    ),
  );

  return lockCases;
}

function writeD0Evidence(cases) {
  const passCount = cases.filter((c) => c.outcome === "PASS").length;
  const failCount = cases.filter((c) => c.outcome === "FAIL").length;
  const payload = {
    evidenceVersion: "HC.2.K-LOCK.0",
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    passCount,
    failCount,
    cases,
  };
  fs.mkdirSync(D0_DIR, { recursive: true });
  fs.writeFileSync(D0_TMP, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(D0_TMP, D0_PATH);
  return payload;
}

function runVerifier() {
  let cases = [
    ...runK0Cases(),
    ...runKFCases(),
    ...runKGCases(),
    ...runKHCases(),
    ...runKICases(),
    ...runKJCases(),
    ...runKVCases(),
  ];
  const lockCases = runKLockCases(cases);
  cases = [...cases, ...lockCases];
  return cases;
}

async function main() {
  let cases = [];
  let exitCode = 1;
  try {
    cases = runVerifier();
    writeD0Evidence(cases);

    const kLock1 = cases.find((c) => c.id === "K-LOCK.1");
    const kLock3 = cases.find((c) => c.id === "K-LOCK.3");
    if (kLock1 && fs.existsSync(D0_PATH)) {
      const evidence = JSON.parse(read(D0_PATH));
      const keysOk = TOP_LEVEL_KEYS.join(",") === Object.keys(evidence).join(",");
      kLock1.outcome = keysOk ? "PASS" : "FAIL";
      kLock1.reason = keysOk ? "6-key contract" : "key_mismatch";
      if (kLock3) {
        kLock3.outcome = evidence.evidenceVersion === "HC.2.K-LOCK.0" ? "PASS" : "FAIL";
        kLock3.reason = evidence.evidenceVersion;
      }
      writeD0Evidence(cases);
    }

    const failCount = cases.filter((c) => c.outcome === "FAIL").length;
    const passCount = cases.filter((c) => c.outcome === "PASS").length;
    const d0Ok = fs.existsSync(D0_PATH);
    exitCode = failCount === 0 && d0Ok ? 0 : 1;
    console.log(
      `verify:hc-wave-2  cases=${cases.length}  pass=${passCount}  fail=${failCount}  d0=${d0Ok ? "written" : "missing"}`,
    );
    for (const c of cases) {
      if (c.outcome === "FAIL") {
        console.error(`FAIL ${c.id} expected=${c.expected} reason=${c.reason}`);
      }
    }
  } catch (error) {
    const message = error && error.message ? error.message : "unknown_error";
    cases.push(makeCase("K-RUNTIME", "runtime", "no-throw", false, message));
    if (cases.length > 0) writeD0Evidence(cases);
    console.error(`verify:hc-wave-2 runtime error: ${message}`);
    console.error(error.stack);
    exitCode = 1;
  }
  process.exit(exitCode);
}

main();
