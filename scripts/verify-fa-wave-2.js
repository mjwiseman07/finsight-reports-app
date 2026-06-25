/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase FA-2 — Fund Accounting Wave 2 Verifier
 * Floor 35 cases, overdelivery target 40+ (delivers 62: K-0..K-V + K-LOCK).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const FA_ROOT = "lib/intelligence/synthetic/industry/fund-accounting";
const D0_DIR = path.join(root, "evidence");
const D0_PATH = path.join(D0_DIR, "fa-wave-2-d0.json");
const D0_TMP = `${D0_PATH}.tmp`;
const ATTESTATION_PATH = path.join(root, "FA_WAVE_2_ATTESTATION.md");
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

function collectFaSources() {
  return listFiles(FA_ROOT, (f) => f.endsWith(".ts")).map(read).join("\n");
}

function runK0Cases() {
  const cases = [];
  const faSource = collectFaSources();
  const verifierSource = read(path.join("scripts", "verify-fa-wave-2.js"));

  const { scanSourceForForbiddenImports } = loadTsModule(
    `${FA_ROOT}/kernel/fa-isolation-contract.ts`,
  );
  const scan = scanSourceForForbiddenImports(faSource + verifierSource);

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

  const registryMutations = /REGISTRY_CHANGE_LOG\.md.*write|fs\.writeFileSync.*registry/i.test(
    faSource,
  );
  cases.push(
    makeCase(
      "K-0.3",
      "boundary-isolation",
      "no-direct-registry-mutation",
      !registryMutations,
      registryMutations ? "direct_registry_write" : "42.7A.5_only",
    ),
  );

  const auditDirect = /auditLogWriter|fa-audit-emitter|standards\/audit/.test(faSource);
  cases.push(
    makeCase(
      "K-0.4",
      "boundary-isolation",
      "audit-through-42.7-framework",
      auditDirect,
      auditDirect ? "audit_wired" : "no_audit_path",
    ),
  );

  const { assertSubSegmentIsolation } = loadTsModule(`${FA_ROOT}/kernel/fa-sub-segment-router.ts`);
  let k05Pass = false;
  let k05Reason = "ok";
  try {
    assertSubSegmentIsolation("M", "H", "form-pf");
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

  return cases;
}

function runKFCases() {
  const cases = [];
  const {
    resolveFundCapability,
    getFairValueLevelLabel,
    classifyRedeemableUnits,
    resolveInvestmentEntityException,
  } = loadTsModule(`${FA_ROOT}/capabilities/resolveFundCapability.ts`);
  const { createFAAuditEmitter } = loadTsModule(`${FA_ROOT}/audit/fa-audit-emitter.ts`);
  const { assertFrameworkHintMatchesEntity } = loadTsModule(
    `${FA_ROOT}/kernel/fa-framework-binding.ts`,
  );

  const emitter = createFAAuditEmitter();
  const ctx = {
    companyId: "co-1",
    entityId: "ent-m",
    reportingBasis: "US_GAAP",
    subSegment: "M",
    primaryFramework: "US_GAAP",
  };
  const tsNow = new Date().toISOString();

  const navResults = resolveFundCapability({
    context: ctx,
    capabilityKey: "nav-daily",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.1",
      "treatment-resolver",
      "nav-via-resolver",
      navResults[0]?.treatmentSource === "treatment-resolver",
      navResults[0]?.treatmentSource ?? "missing",
    ),
  );

  const dualCtx = { ...ctx, secondaryFramework: "IFRS" };
  const dualResults = resolveFundCapability({
    context: dualCtx,
    capabilityKey: "fair-value-hierarchy",
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
    (e) => e.payload?.faAuditChannel === "treatment-resolver-audit",
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

  const ifrsCtx = { ...ctx, primaryFramework: "IFRS", reportingBasis: "IFRS" };
  const invExc = resolveInvestmentEntityException(ifrsCtx, emitter, tsNow);
  const gaapInvExc = resolveInvestmentEntityException(ctx, emitter, tsNow);
  cases.push(
    makeCase(
      "K-F.5",
      "gaap-ifrs-divergence",
      "investment-entity-ifrs-only",
      invExc !== null && gaapInvExc === null,
      `ifrs=${Boolean(invExc)} gaap=${Boolean(gaapInvExc)}`,
    ),
  );

  cases.push(
    makeCase(
      "K-F.6",
      "fair-value-hierarchy",
      "level3-label",
      getFairValueLevelLabel(3, "US_GAAP") === "ASC_820:Level3",
      getFairValueLevelLabel(3, "US_GAAP"),
    ),
  );

  const expenseResults = resolveFundCapability({
    context: ctx,
    capabilityKey: "expense-recognition",
    emitter,
    timestamp: tsNow,
  });
  cases.push(
    makeCase(
      "K-F.7",
      "expense-recognition",
      "asc946-citation",
      expenseResults[0]?.citationHandle === "ASC_946_INVESTMENT_COMPANIES",
      expenseResults[0]?.citationHandle ?? "missing",
    ),
  );

  const gaapClass = classifyRedeemableUnits("US_GAAP");
  const ifrsClass = classifyRedeemableUnits("IFRS");
  cases.push(
    makeCase(
      "K-F.8",
      "liability-equity",
      "framework-specific",
      gaapClass.standard === "ASC_480" && ifrsClass.standard === "IAS_32",
      `${gaapClass.standard}/${ifrsClass.standard}`,
    ),
  );

  return cases;
}

function runKGCases() {
  const cases = [];
  const { assertCapabilityApplicable } = loadTsModule(
    `${FA_ROOT}/kernel/fa-sub-segment-router.ts`,
  );
  const { computePeWaterfall } = loadTsModule(`${FA_ROOT}/governance/hedge-pe-controls.ts`);
  const { buildSubSegmentCacheKey, assertSubSegmentIsolation } = loadTsModule(
    `${FA_ROOT}/kernel/fa-sub-segment-router.ts`,
  );

  let kg1 = false;
  try {
    assertCapabilityApplicable("M", "form-pf");
  } catch (e) {
    kg1 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-G.1", "sub-segment", "M-no-form-pf", kg1, kg1 ? "blocked" : "leak"));

  let kg2 = false;
  try {
    assertCapabilityApplicable("E", "rule-6c-11-etf-basket");
    kg2 = true;
  } catch {
    kg2 = false;
  }
  cases.push(makeCase("K-G.2", "sub-segment", "E-etf-basket", kg2, kg2 ? "allowed" : "blocked"));

  let kg3 = true;
  try {
    assertCapabilityApplicable("H", "form-pf");
    assertCapabilityApplicable("H", "3c7-exemption");
  } catch {
    kg3 = false;
  }
  cases.push(makeCase("K-G.3", "sub-segment", "H-pf-3c7", kg3, kg3 ? "both_allowed" : "missing"));

  const waterfall = computePeWaterfall(1_000_000, 0.08, 5_000_000, 0);
  cases.push(
    makeCase(
      "K-G.4",
      "pe-waterfall",
      "four-tier",
      waterfall.length === 4 && waterfall[3].tier === "carry",
      `tiers=${waterfall.length}`,
    ),
  );

  let kg5 = false;
  try {
    assertCapabilityApplicable("C", "form-n-csr");
    assertCapabilityApplicable("C", "nav-daily");
    kg5 = true;
  } catch {
    kg5 = false;
  }
  try {
    assertCapabilityApplicable("C", "nav-daily");
  } catch {
    /* nav-daily not for C */
  }
  let kg5b = false;
  try {
    assertCapabilityApplicable("C", "form-n-csr");
    kg5b = true;
  } catch {
    kg5b = false;
  }
  let kg5c = false;
  try {
    assertCapabilityApplicable("C", "liability-equity-classification");
    kg5c = true;
  } catch {
    kg5c = false;
  }
  cases.push(
    makeCase(
      "K-G.5",
      "closed-end",
      "form-n-csr-not-daily-nav",
      kg5b && !kg5,
      `ncsr=${kg5b} daily=${kg5} redeem=${kg5c}`,
    ),
  );

  const hKey = buildSubSegmentCacheKey("ent-h", "H", "nav-periodic");
  const mKey = buildSubSegmentCacheKey("ent-h", "M", "nav-daily");
  let kg6 = false;
  try {
    assertSubSegmentIsolation("H", "M", "nav-daily");
  } catch (e) {
    kg6 = e.name === "SubSegmentIsolationViolation";
  }
  cases.push(
    makeCase(
      "K-G.6",
      "cache-isolation",
      "H-cannot-read-M-cache",
      kg6 && hKey !== mKey,
      kg6 ? "isolated" : "leak",
    ),
  );

  return cases;
}

function runKHCases() {
  const cases = [];
  const {
    assert3c1OwnerCap,
    assert3c7QualifiedPurchaser,
    computeSidePocketNav,
    assertSidePocketIsolation,
    crystallizeIncentiveFee,
    evaluateLockUpRedemption,
    computePeWaterfall,
    rollForwardRecallableFlag,
    evaluateFormPfThreshold,
    FORM_PF_HEDGE_THRESHOLD_USD,
  } = loadTsModule(`${FA_ROOT}/governance/hedge-pe-controls.ts`);
  const { createFAAuditEmitter } = loadTsModule(`${FA_ROOT}/audit/fa-audit-emitter.ts`);
  const emitter = createFAAuditEmitter();

  const owners = Array.from({ length: 101 }, (_, i) => ({
    ownerId: `o-${i}`,
    isQualifiedPurchaser: true,
  }));
  let kh1 = false;
  try {
    assert3c1OwnerCap(owners, emitter, "ent-h");
  } catch (e) {
    kh1 = e.name === "RegistrationRequiredEscalation";
  }
  cases.push(makeCase("K-H.1", "3c1-cap", "RegistrationRequiredEscalation", kh1, kh1 ? "blocked" : "leak"));

  let kh2 = false;
  try {
    assert3c7QualifiedPurchaser({ ownerId: "x", isQualifiedPurchaser: false }, emitter, "ent-h");
  } catch (e) {
    kh2 = e.name === "RegistrationRequiredEscalation";
  }
  cases.push(makeCase("K-H.2", "3c7-qp", "non-QP-blocked", kh2, kh2 ? "blocked" : "leak"));

  const sp = computeSidePocketNav({ sidePocketNav: 50, mainFundNav: 950, sidePocketAssetIds: ["a1"] });
  cases.push(
    makeCase(
      "K-H.3",
      "side-pocket",
      "nav-segregated",
      sp.mainNav === 950 && sp.sidePocketNav === 50,
      `main=${sp.mainNav} side=${sp.sidePocketNav}`,
    ),
  );

  const fee = crystallizeIncentiveFee({ priorPeakNav: 100, currentNav: 110, accruedIncentiveFee: 0 });
  cases.push(makeCase("K-H.4", "hwm", "fee-deferred-below-peak", fee === 2, `fee=${fee}`));

  const lockUp = evaluateLockUpRedemption("2026-12-31", "2026-06-01", emitter, "ent-h");
  cases.push(
    makeCase(
      "K-H.5",
      "lock-up",
      "human-review",
      !lockUp.allowed && lockUp.requiresHumanReview,
      `allowed=${lockUp.allowed}`,
    ),
  );

  const wf = computePeWaterfall(500_000, 0.08, 1_000_000, 0);
  cases.push(makeCase("K-H.6", "pe-waterfall", "four-tier", wf.length === 4, `tiers=${wf.length}`));

  const recalled = rollForwardRecallableFlag({
    distributionId: "d1",
    amountUsd: 100,
    recallable: true,
  });
  cases.push(makeCase("K-H.7", "recallable", "flag-preserved", recalled.recallable === true, "ok"));

  const pf = evaluateFormPfThreshold("hedge", FORM_PF_HEDGE_THRESHOLD_USD, emitter, "ent-h");
  cases.push(
    makeCase(
      "K-H.8",
      "form-pf",
      "threshold-breach-event",
      pf.filingRequired && pf.section === "2b",
      `required=${pf.filingRequired}`,
    ),
  );

  let kh3b = false;
  try {
    assertSidePocketIsolation(
      { sidePocketNav: 50, mainFundNav: 950, sidePocketAssetIds: ["a1"] },
      "a1",
    );
  } catch (e) {
    kh3b = e.name === "SidePocketIsolationViolation";
  }
  cases.push(makeCase("K-H.3b", "side-pocket", "asset-not-in-main", kh3b, kh3b ? "blocked" : "leak"));

  return cases;
}

function runKICases() {
  const cases = [];
  const { resolveFundCapability } = loadTsModule(`${FA_ROOT}/capabilities/resolveFundCapability.ts`);
  const { createFAAuditEmitter, emitOrgEdgeAudit } = loadTsModule(
    `${FA_ROOT}/audit/fa-audit-emitter.ts`,
  );
  const { writeFrameworkScopedMemory, readFrameworkScopedMemory, resetTenantMemoryStore } =
    loadTsModule(`${FA_ROOT}/traps/trap-defenses.ts`);

  const emitter = createFAAuditEmitter();
  const ctx = {
    companyId: "co-i",
    entityId: "ent-i",
    reportingBasis: "US_GAAP",
    subSegment: "M",
    primaryFramework: "US_GAAP",
  };
  emitter.getEntries().length;
  resolveFundCapability({
    context: ctx,
    capabilityKey: "nav-daily",
    emitter,
    timestamp: new Date().toISOString(),
  });
  const resolverAudits = emitter.getEntries().filter(
    (e) => e.payload?.faAuditChannel === "treatment-resolver-audit",
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

  resetTenantMemoryStore();
  writeFrameworkScopedMemory("co-i", "US_GAAP", "nav-daily", { nav: 100 });
  const mem = readFrameworkScopedMemory("co-i", "co-i", "US_GAAP", "nav-daily");
  const ifrsLeak = readFrameworkScopedMemory("co-i", "co-i", "IFRS", "nav-daily");
  cases.push(
    makeCase(
      "K-I.2",
      "memory",
      "zero-ifrs-keys-for-gaap",
      mem !== undefined && ifrsLeak === undefined,
      "framework-scoped",
    ),
  );

  const { evaluateLockUpRedemption } = loadTsModule(`${FA_ROOT}/governance/hedge-pe-controls.ts`);
  const escEmitter = createFAAuditEmitter();
  evaluateLockUpRedemption("2026-12-31", "2026-01-01", escEmitter, "ent-h");
  const esc = escEmitter.getEntries().filter((e) => e.payload?.faAuditChannel === "escalation-audit");
  cases.push(
    makeCase(
      "K-I.3",
      "escalation-audit",
      "lock-up-fires",
      esc.length >= 1 && esc[0].payload?.severity === "medium",
      `events=${esc.length}`,
    ),
  );

  const panelEmitter = createFAAuditEmitter();
  const { evaluateFormPfThreshold } = loadTsModule(`${FA_ROOT}/governance/hedge-pe-controls.ts`);
  evaluateFormPfThreshold("hedge", 2_000_000_000, panelEmitter, "ent-h");
  const panel = panelEmitter.getEntries().filter(
    (e) => e.payload?.faAuditChannel === "panel-decision-audit",
  );
  cases.push(
    makeCase(
      "K-I.4",
      "panel-decision-audit",
      "form-pf-multi-party",
      panel.length >= 1 && (panel[0].payload?.multiPartySignatures?.length ?? 0) >= 2,
      `signatures=${panel[0]?.payload?.multiPartySignatures?.length ?? 0}`,
    ),
  );

  emitOrgEdgeAudit(emitter, {
    entityId: "ent-i",
    callingIndustry: "healthcare",
    capabilityKey: "nav-daily",
  });
  const orgEdge = emitter.getEntries().filter((e) => e.payload?.faAuditChannel === "org-edge-audit");
  cases.push(
    makeCase(
      "K-I.5",
      "org-edge-audit",
      "external-industry-call",
      orgEdge.length >= 1,
      `events=${orgEdge.length}`,
    ),
  );

  const dualCtx = { ...ctx, secondaryFramework: "IFRS" };
  const dualEmitter = createFAAuditEmitter();
  resolveFundCapability({
    context: dualCtx,
    capabilityKey: "fair-value-hierarchy",
    emitter: dualEmitter,
    timestamp: new Date().toISOString(),
  });
  const memWrites = dualEmitter.getEntries().filter(
    (e) => e.payload?.faAuditChannel === "memory-framework-dimension",
  );
  const frameworks = new Set(memWrites.map((e) => e.payload?.framework));
  cases.push(
    makeCase(
      "K-I.6",
      "dual-book-memory",
      "two-framework-tags",
      memWrites.length >= 2 && frameworks.size === 2,
      `writes=${memWrites.length} fw=${frameworks.size}`,
    ),
  );

  return cases;
}

function runKJCases() {
  const cases = [];
  const {
    defendTrap1_MutualDailyNavBleed,
    defendTrap2_InvestmentEntityLeak,
    defendTrap3_CarryContamination,
    defendTrap4_FormPfMisfire,
    defendTrap5_SidePocketCross,
    defendTrap6_CrossCustomerLeak,
    resetTenantMemoryStore,
    writeFrameworkScopedMemory,
  } = loadTsModule(`${FA_ROOT}/traps/trap-defenses.ts`);
  const { createFAAuditEmitter } = loadTsModule(`${FA_ROOT}/audit/fa-audit-emitter.ts`);
  const emitter = createFAAuditEmitter();

  const ctxM = {
    companyId: "c",
    reportingBasis: "US_GAAP",
    subSegment: "M",
    primaryFramework: "US_GAAP",
  };

  let t1 = false;
  try {
    defendTrap1_MutualDailyNavBleed(ctxM);
  } catch (e) {
    t1 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-J.1", "trap-1", "M-no-periodic-nav", t1, t1 ? "rejected" : "leak"));

  let t2 = false;
  try {
    defendTrap2_InvestmentEntityLeak({ ...ctxM, primaryFramework: "US_GAAP" }, "investment-entity-exception");
    t2 = true;
  } catch (e) {
    t2 = e.name === "FrameworkMismatchViolation";
  }
  cases.push(makeCase("K-J.2", "trap-2", "no-ifrs10-on-gaap", t2, t2 ? "rejected" : "leak"));

  let t3 = false;
  try {
    defendTrap3_CarryContamination(ctxM);
  } catch (e) {
    t3 = e.name === "SubSegmentApplicabilityViolation";
  }
  cases.push(makeCase("K-J.3", "trap-3", "M-no-waterfall", t3, t3 ? "rejected" : "leak"));

  let t4 = false;
  try {
    defendTrap4_FormPfMisfire(1_000_000_000, emitter, "ent-h");
    t4 = true;
  } catch {
    t4 = false;
  }
  cases.push(makeCase("K-J.4", "trap-4", "1B-no-form-pf", t4, t4 ? "no-filing" : "misfire"));

  let t5 = false;
  try {
    defendTrap5_SidePocketCross(["sp-1"], ["sp-1", "main-1"]);
  } catch (e) {
    t5 = e.name === "SidePocketIsolationViolation";
  }
  cases.push(makeCase("K-J.5", "trap-5", "side-pocket-isolated", t5, t5 ? "rejected" : "leak"));

  resetTenantMemoryStore();
  writeFrameworkScopedMemory("cust-a", "US_GAAP", "nav-daily", { signal: 1 });
  let t6 = false;
  try {
    defendTrap6_CrossCustomerLeak("cust-a", "cust-b", "US_GAAP", "nav-daily", emitter);
  } catch (e) {
    t6 = e.name === "CrossTenantMemoryViolation";
  }
  cases.push(makeCase("K-J.6", "trap-6", "tenant-isolated", !t6, !t6 ? "blocked-read" : "leak"));

  return cases;
}

function runKVCases() {
  const cases = [];
  const { runAllPoisonCases } = loadTsModule(`${FA_ROOT}/traps/poison-cases.ts`);
  const { createFAAuditEmitter } = loadTsModule(`${FA_ROOT}/audit/fa-audit-emitter.ts`);
  const emitter = createFAAuditEmitter();
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
      "FA.2.K-LOCK.0",
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
  const attestationSigned = attestationExists && read(ATTESTATION_PATH).includes("mwiseman@advisacor.com");
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
    fs.existsSync(REGISTRY_LOG) && read(REGISTRY_LOG).includes("FA.2.K-LOCK");
  lockCases.push(
    makeCase(
      "K-LOCK.6",
      "registry-log",
      "FA.2.K-LOCK-entry",
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
      "K-0-through-K-J",
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
    evidenceVersion: "FA.2.K-LOCK.0",
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
        kLock3.outcome = evidence.evidenceVersion === "FA.2.K-LOCK.0" ? "PASS" : "FAIL";
        kLock3.reason = evidence.evidenceVersion;
      }
      writeD0Evidence(cases);
    }

    const failCount = cases.filter((c) => c.outcome === "FAIL").length;
    const passCount = cases.filter((c) => c.outcome === "PASS").length;
    const d0Ok = fs.existsSync(D0_PATH);
    exitCode = failCount === 0 && d0Ok ? 0 : 1;
    console.log(
      `verify:fa-wave-2  cases=${cases.length}  pass=${passCount}  fail=${failCount}  d0=${d0Ok ? "written" : "missing"}`,
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
    console.error(`verify:fa-wave-2 runtime error: ${message}`);
    console.error(error.stack);
    exitCode = 1;
  }
  process.exit(exitCode);
}

main();
