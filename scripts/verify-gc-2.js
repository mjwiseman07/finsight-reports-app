/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase GC-2 — GovCon/DCAA Wave 2 Structural Enforcement Verifier
 * Floor 121 cases: Gates A–F + K-V (30 poison) + 12 anti-pattern guards.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const GC_INDUSTRY = "lib/intelligence/synthetic/industry/govcon";
const GC_STANDARDS = "lib/intelligence/synthetic/standards/govcon";
const EVIDENCE_VERSION = "GC.2.K-LOCK.0";
const EXPECTED_CASE_COUNT = 121;

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

function makeCase(id, gate, pass, reason) {
  return { id, gate, pass, reason };
}

function baseAllowInput(overrides = {}) {
  return {
    subSegmentId: "C",
    costCategory: "direct-labor",
    amountUsd: 1000,
    structuralPreconditionsMet: true,
    ...overrides,
  };
}

function baseCasInput(overrides = {}) {
  return {
    subSegmentId: "C",
    structuralPreconditionsMet: true,
    ...overrides,
  };
}

function fpraState(pool, rate = 0.12, ceiling = 0.15) {
  return {
    pool,
    state: "FPRA",
    rate,
    fpraCeiling: ceiling,
    timestampMs: Date.now(),
    icsFinalized: false,
    containsGovernmentContractData: true,
  };
}

function collectIndustryGovconSource() {
  return listFiles(GC_INDUSTRY, (f) => f.endsWith(".ts")).map(read).join("\n");
}

function runPoisonCheck(id, category, runFn) {
  const { createGcAuditEmitter } = loadTsModule(`${GC_INDUSTRY}/audit/gc-audit-emitter.ts`);
  const emitter = createGcAuditEmitter();
  let rejected = false;
  let violationName = "";
  try {
    const result = runFn(emitter);
    if (
      result &&
      (result.allowed === false || result.compliant === false || result.reconciled === false)
    ) {
      rejected = true;
      violationName = "return-reject";
    }
  } catch (err) {
    rejected = true;
    violationName = err.name || "Error";
  }
  const dcaa = emitter.getDcaaEvents().length > 0;
  const esc = emitter.getEscalationEvents().length > 0;
  const pass = rejected && dcaa && esc;
  return makeCase(
    id,
    "K-V",
    pass,
    pass
      ? `${category}:${violationName}+dcaa+escalation`
      : `${category}:rejected=${rejected} dcaa=${dcaa} esc=${esc}`,
  );
}

function runGateA() {
  const { resolveGovConCitationHandle } = loadTsModule(`${GC_STANDARDS}/handles.ts`);
  const handles = [
    "FAR_31_201_2_ALLOWABILITY",
    "FAR_31_205_6_COMPENSATION",
    "DCAA_CAM_CH6",
    "CAS_401_CONSISTENCY_ESTIMATING",
    "FAR_52_216_7_D_ICS_SUBMISSION",
    "EXEC_COMP_CAP_CY2025",
    "DFARS_252_242_7006",
    "DFARS_252_242_7005",
    "DFARS_252_215_7002",
    "DFARS_215_407_3",
    "FAR_31_205_46_TRAVEL",
  ];

  const cases = handles.map((handleId, index) => {
    let pass = false;
    let reason = "";
    try {
      const resolved = resolveGovConCitationHandle(handleId);
      pass = resolved.url.startsWith("https://");
      reason = pass ? resolved.url : "non-https url";
    } catch (err) {
      reason = err.message;
    }
    return makeCase(`A-${index + 1}`, "A", pass, reason);
  });

  try {
    resolveGovConCitationHandle("FAR_31_205_FABRICATED_TRAP");
    cases.push(makeCase("A-12", "A", false, "silent rejection"));
  } catch (err) {
    const audits = err.escalationAudits || [];
    cases.push(
      makeCase(
        "A-12",
        "A",
        audits.length > 0,
        audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      ),
    );
  }

  return cases.slice(0, 12);
}

function runGateB() {
  const { evaluateFar31205Allowability } = loadTsModule(`${GC_INDUSTRY}/far-31-205/index.ts`);
  const { createGcAuditEmitter } = loadTsModule(`${GC_INDUSTRY}/audit/gc-audit-emitter.ts`);
  const cases = [];

  const scenarios = [
    { id: "B-1", subsection: "2", input: baseAllowInput(), expectAllowed: true },
    {
      id: "B-2",
      subsection: "2",
      input: baseAllowInput({ structuralPreconditionsMet: false }),
      expectAllowed: false,
    },
    { id: "B-3", subsection: "5", input: baseAllowInput(), expectAllowed: true },
    {
      id: "B-4",
      subsection: "5",
      input: baseAllowInput({ structuralPreconditionsMet: false }),
      expectAllowed: false,
    },
    {
      id: "B-5",
      subsection: "6",
      input: baseAllowInput({ compensationUsd: 500_000, compensationCalendarYear: 2025 }),
      expectAllowed: true,
    },
    {
      id: "B-6",
      subsection: "6",
      input: baseAllowInput({ compensationUsd: 800_000, compensationCalendarYear: 2025 }),
      expectAllowed: false,
      throws: "ExecCompViolation",
    },
    { id: "B-7", subsection: "9", input: baseAllowInput(), expectAllowed: true },
    {
      id: "B-8",
      subsection: "9",
      input: baseAllowInput({ structuralPreconditionsMet: false }),
      expectAllowed: false,
    },
    { id: "B-9", subsection: "24", input: baseAllowInput(), expectAllowed: true },
    {
      id: "B-10",
      subsection: "24",
      input: baseAllowInput({ structuralPreconditionsMet: false }),
      expectAllowed: false,
    },
    { id: "B-11", subsection: "45", input: baseAllowInput(), expectAllowed: true },
    {
      id: "B-12",
      subsection: "45",
      input: baseAllowInput({ structuralPreconditionsMet: false }),
      expectAllowed: false,
    },
    {
      id: "B-13",
      subsection: "46",
      input: baseAllowInput({ perDiemCitationHandleId: undefined }),
      expectAllowed: false,
      throws: "PerDiemCitationViolation",
    },
    {
      id: "B-14",
      subsection: "46",
      input: baseAllowInput({ perDiemCitationHandleId: "GSA_PERDIEM_CONUS" }),
      expectAllowed: true,
    },
    { id: "B-15", subsection: "50", input: baseAllowInput(), expectAllowed: true },
    { id: "B-16", subsection: "99", input: baseAllowInput(), expectThrow: true },
  ];

  for (const scenario of scenarios) {
    const emitter = createGcAuditEmitter();
    let pass = false;
    let reason = "";
    try {
      const result = evaluateFar31205Allowability(scenario.subsection, scenario.input, emitter);
      if (scenario.expectThrow) {
        pass = false;
        reason = "expected throw for unknown subsection";
      } else {
        pass = result.allowed === scenario.expectAllowed;
        reason = pass ? "allowability ok" : `expected ${scenario.expectAllowed}, got ${result.allowed}`;
      }
    } catch (err) {
      if (scenario.throws) {
        pass = err.name === scenario.throws;
        reason = pass ? scenario.throws : err.message;
      } else if (scenario.expectThrow) {
        pass = (err.escalationAudits || []).length > 0;
        reason = pass ? "unknown subsection rejected" : err.message;
      } else if (scenario.throws === undefined && !scenario.expectAllowed) {
        pass = true;
        reason = err.name;
      } else {
        reason = err.message;
      }
    }
    cases.push(makeCase(scenario.id, "B", pass, reason));
  }

  return cases.slice(0, 16);
}

function runGateC() {
  const cas = loadTsModule(`${GC_INDUSTRY}/cas/index.ts`);
  const { createGcAuditEmitter } = loadTsModule(`${GC_INDUSTRY}/audit/gc-audit-emitter.ts`);
  const cases = [];

  const evaluators = [
    { id: "C-1", fn: cas.evaluateCas401 },
    { id: "C-2", fn: cas.evaluateCas402 },
    { id: "C-3", fn: cas.evaluateCas403 },
    { id: "C-4", fn: cas.evaluateCas405 },
    { id: "C-5", fn: cas.evaluateCas406 },
    { id: "C-6", fn: cas.evaluateCas410 },
    { id: "C-7", fn: cas.evaluateCas418 },
    { id: "C-8", fn: cas.evaluateCas420 },
  ];

  for (const { id, fn } of evaluators) {
    const emitter = createGcAuditEmitter();
    const result = fn(baseCasInput(), emitter);
    cases.push(
      makeCase(
        id,
        "C",
        result.compliant && emitter.getDcaaEvents().length >= 1,
        result.compliant ? "cas-compliant+dcaa" : "cas-fail",
      ),
    );
  }

  const failEmitter = createGcAuditEmitter();
  const fail401 = cas.evaluateCas401(baseCasInput({ structuralPreconditionsMet: false }), failEmitter);
  cases.push(
    makeCase(
      "C-9",
      "C",
      !fail401.compliant && failEmitter.getEscalationEvents().length >= 1,
      "cas-precondition-fail",
    ),
  );

  const ds1Below = createGcAuditEmitter();
  const below = cas.reconcileDs1Disclosure(
    {
      ...baseCasInput(),
      disclosedPractice: "standard",
      resolvedPractice: "standard",
      contractAwardUsd: 1_000_000,
    },
    ds1Below,
  );
  cases.push(makeCase("C-10", "C", below.reconciled, "ds1-below-threshold"));

  const ds1Ok = createGcAuditEmitter();
  const ok = cas.reconcileDs1Disclosure(
    {
      ...baseCasInput(),
      disclosedPractice: "standard",
      resolvedPractice: "standard",
      contractAwardUsd: 10_000_000,
    },
    ds1Ok,
  );
  cases.push(makeCase("C-11", "C", ok.reconciled, "ds1-reconciled"));

  const ds1Mismatch = createGcAuditEmitter();
  const mismatch = cas.reconcileDs1Disclosure(
    {
      ...baseCasInput(),
      disclosedPractice: "standard",
      resolvedPractice: "modified",
      contractAwardUsd: 10_000_000,
    },
    ds1Mismatch,
  );
  cases.push(
    makeCase(
      "C-12",
      "C",
      !mismatch.reconciled && ds1Mismatch.getEscalationEvents().length >= 1,
      "ds1-mismatch-rejected",
    ),
  );

  const ds2Url = cas.getDs2HandleUrl();
  cases.push(makeCase("C-13", "C", ds2Url.startsWith("https://"), ds2Url));

  return cases.slice(0, 13);
}

function runGateD() {
  const { applyExecCompCap, EXEC_COMP_CAP_CY2025, EXEC_COMP_CAP_CY2026_EST } = loadTsModule(
    `${GC_INDUSTRY}/exec-comp-cap/index.ts`,
  );
  const { resolveExecCompCap } = loadTsModule(`${GC_STANDARDS}/execCompCap.ts`);
  const { createGcAuditEmitter } = loadTsModule(`${GC_INDUSTRY}/audit/gc-audit-emitter.ts`);
  const cases = [];

  const y2025 = resolveExecCompCap(2025);
  cases.push(
    makeCase(
      "D-1",
      "D",
      y2025.amount === EXEC_COMP_CAP_CY2025 && y2025.confirmed,
      `CY2025 cap=${y2025.amount}`,
    ),
  );

  const y2026 = resolveExecCompCap(2026);
  cases.push(
    makeCase(
      "D-2",
      "D",
      y2026.amount === EXEC_COMP_CAP_CY2026_EST && y2026.escalationAudits.length === 1,
      "CY2026 EST emits escalation-audit",
    ),
  );

  const e3 = createGcAuditEmitter();
  const under = applyExecCompCap(
    { subSegmentId: "C", compensationUsd: 600_000, calendarYear: 2025 },
    e3,
  );
  cases.push(
    makeCase(
      "D-3",
      "D",
      under.allowed && e3.getDcaaEvents().length >= 1,
      `under-cap dcaa=${e3.getDcaaEvents().length}`,
    ),
  );

  const e4 = createGcAuditEmitter();
  let d4Pass = false;
  try {
    applyExecCompCap({ subSegmentId: "C", compensationUsd: 800_000, calendarYear: 2025 }, e4);
  } catch (err) {
    d4Pass = err.name === "ExecCompViolation" && e4.getEscalationEvents().length >= 1;
  }
  cases.push(makeCase("D-4", "D", d4Pass, d4Pass ? "ExecCompViolation" : "no-reject"));

  const e5 = createGcAuditEmitter();
  const boundary = applyExecCompCap(
    { subSegmentId: "C", compensationUsd: 650_000, calendarYear: 2026, spansCyBoundary: true },
    e5,
  );
  cases.push(
    makeCase(
      "D-5",
      "D",
      boundary.allowed && boundary.dcaaEventsEmitted === 2,
      `boundary-events=${boundary.dcaaEventsEmitted}`,
    ),
  );

  const y1999 = resolveExecCompCap(1999);
  cases.push(
    makeCase(
      "D-6",
      "D",
      !y1999.confirmed && y1999.escalationAudits.length >= 1,
      "unsupported-year-escalation",
    ),
  );

  const e7 = createGcAuditEmitter();
  const atCap = applyExecCompCap(
    { subSegmentId: "T", compensationUsd: EXEC_COMP_CAP_CY2025, calendarYear: 2025 },
    e7,
  );
  cases.push(makeCase("D-7", "D", atCap.allowed, "at-cap-allowed"));

  const e8 = createGcAuditEmitter();
  let d8Pass = false;
  try {
    applyExecCompCap({ subSegmentId: "C", compensationUsd: 750_000, calendarYear: 2026 }, e8);
  } catch (err) {
    d8Pass = err.name === "ExecCompViolation";
  }
  cases.push(
    makeCase(
      "D-8",
      "D",
      d8Pass && e8.getDcaaEvents().length >= 1,
      d8Pass ? "over-cap-2026-rejected" : "leak",
    ),
  );

  return cases.slice(0, 8);
}

function runGateE() {
  const {
    transitionFPRAtoPBR,
    transitionPBRtoFinal,
    reconcileFinaltoICS,
    assertNoPostIcsMutation,
    assertTimestampMonotonicity,
  } = loadTsModule(`${GC_INDUSTRY}/rate-state-machine/transitions.ts`);
  const { INDIRECT_RATE_POOLS } = loadTsModule(`${GC_INDUSTRY}/rate-state-machine/types.ts`);
  const { createGcAuditEmitter } = loadTsModule(`${GC_INDUSTRY}/audit/gc-audit-emitter.ts`);
  const cases = [];

  const poolStates = {};
  for (let i = 0; i < INDIRECT_RATE_POOLS.length; i++) {
    const pool = INDIRECT_RATE_POOLS[i];
    const emitter = createGcAuditEmitter();
    const fpra = fpraState(pool);
    const pbr = transitionFPRAtoPBR(fpra, fpra.rate + 0.01, true, emitter, "C");
    poolStates[pool] = { fpra, pbr, emitter };
    cases.push(
      makeCase(
        `E-${i + 1}`,
        "E",
        pbr.state === "PBR" && emitter.getDcaaEvents().length >= 1,
        `${pool}:fpra-to-pbr`,
      ),
    );
  }

  for (let i = 0; i < INDIRECT_RATE_POOLS.length; i++) {
    const pool = INDIRECT_RATE_POOLS[i];
    const { pbr, emitter } = poolStates[pool];
    const fin = transitionPBRtoFinal(pbr, pbr.rate, emitter, "C");
    poolStates[pool].final = fin;
    cases.push(
      makeCase(
        `E-${i + 5}`,
        "E",
        fin.state === "FINAL" && fin.pbrPredecessorId !== undefined,
        `${pool}:pbr-to-final`,
      ),
    );
  }

  for (let i = 0; i < INDIRECT_RATE_POOLS.length; i++) {
    const pool = INDIRECT_RATE_POOLS[i];
    const { final, emitter } = poolStates[pool];
    const ics = reconcileFinaltoICS(final, final.rate, emitter, "C");
    cases.push(
      makeCase(
        `E-${i + 9}`,
        "E",
        ics.state === "ICS" && ics.icsFinalized,
        `${pool}:final-to-ics`,
      ),
    );
  }

  const g1 = createGcAuditEmitter();
  let e13Pass = false;
  try {
    transitionFPRAtoPBR(fpraState("overhead", 0.1, 0.11), 0.2, false, g1, "C");
  } catch (err) {
    e13Pass = err.name === "RateStateViolation" && g1.getEscalationEvents().length >= 1;
  }
  cases.push(makeCase("E-13", "E", e13Pass, "pbr-exceeds-fpra-rejected"));

  const g2 = createGcAuditEmitter();
  let e14Pass = false;
  try {
    reconcileFinaltoICS(
      {
        pool: "g_and_a",
        state: "FINAL",
        rate: 0.08,
        timestampMs: Date.now(),
        icsFinalized: false,
        containsGovernmentContractData: true,
      },
      0.08,
      g2,
      "C",
    );
  } catch (err) {
    e14Pass = err.name === "RateStateViolation";
  }
  cases.push(makeCase("E-14", "E", e14Pass, "orphan-final-rejected"));

  const g3 = createGcAuditEmitter();
  let e15Pass = false;
  const fpra = fpraState("fringe");
  const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, g3, "C");
  const fin = transitionPBRtoFinal(pbr, pbr.rate, g3, "C");
  try {
    reconcileFinaltoICS(fin, fin.rate * 1.1, g3, "C");
  } catch (err) {
    e15Pass = err.name === "RateStateViolation" && g3.getDcaaEvents().length >= 2;
  }
  cases.push(makeCase("E-15", "E", e15Pass, "ics-variance-rejected"));

  let e16Pass = false;
  try {
    assertNoPostIcsMutation(
      {
        pool: "materials_handling",
        state: "ICS",
        rate: 0.05,
        timestampMs: Date.now(),
        icsFinalized: true,
        containsGovernmentContractData: true,
      },
      0.06,
    );
  } catch (err) {
    e16Pass = err.name === "RateStateViolation";
  }
  cases.push(makeCase("E-16", "E", e16Pass, "post-ics-mutation-blocked"));

  let e17Pass = false;
  try {
    assertTimestampMonotonicity(Date.now(), Date.now() - 1000);
  } catch (err) {
    e17Pass = err.name === "RateStateViolation";
  }
  cases.push(makeCase("E-17", "E", e17Pass, "timestamp-monotonicity-blocked"));

  const chainEmitter = createGcAuditEmitter();
  const chainFpra = fpraState("overhead");
  const chainPbr = transitionFPRAtoPBR(chainFpra, chainFpra.rate, true, chainEmitter, "C");
  const chainFin = transitionPBRtoFinal(chainPbr, chainPbr.rate, chainEmitter, "C");
  const chainIcs = reconcileFinaltoICS(chainFin, chainFin.rate, chainEmitter, "C");
  cases.push(
    makeCase(
      "E-18",
      "E",
      chainIcs.state === "ICS" && chainEmitter.getDcaaEvents().length >= 3,
      `full-chain-events=${chainEmitter.getDcaaEvents().length}`,
    ),
  );

  return cases.slice(0, 18);
}

function runGateF() {
  const { createGcAuditEmitter, assertDcaaEventSchema } = loadTsModule(
    `${GC_INDUSTRY}/audit/gc-audit-emitter.ts`,
  );
  const {
    DCAA_RATE_AUDIT_CHANNEL_ID,
    DCAA_RATE_AUDIT_EVIDENCE_VERSION,
    DCAA_RATE_AUDIT_RETENTION_YEARS,
  } = loadTsModule("lib/intelligence/synthetic/audit/channels/dcaa-rate-audit.ts");
  const { evaluateFar31205Allowability } = loadTsModule(`${GC_INDUSTRY}/far-31-205/index.ts`);
  const { evaluateCas401 } = loadTsModule(`${GC_INDUSTRY}/cas/cas-401.ts`);
  const { evaluateMAAR6Compliance } = loadTsModule(`${GC_INDUSTRY}/maar6-timekeeping/index.ts`);
  const { applyExecCompCap } = loadTsModule(`${GC_INDUSTRY}/exec-comp-cap/index.ts`);
  const { activateCasCoveredSubSegment } = loadTsModule(`${GC_INDUSTRY}/sub-segments/c-cas-covered.ts`);
  const {
    transitionFPRAtoPBR,
    transitionPBRtoFinal,
    reconcileFinaltoICS,
  } = loadTsModule(`${GC_INDUSTRY}/rate-state-machine/transitions.ts`);
  const cases = [];

  cases.push(
    makeCase(
      "F-1",
      "F",
      DCAA_RATE_AUDIT_EVIDENCE_VERSION === EVIDENCE_VERSION,
      DCAA_RATE_AUDIT_EVIDENCE_VERSION,
    ),
  );

  const schemaEmitter = createGcAuditEmitter();
  schemaEmitter.emitDcaaRateAudit({
    subSegmentId: "C",
    decisionType: "rate-resolution",
    evidence: { probe: true },
    outcome: "allowed",
    handleId: "FAR_31_SUBPART_2",
  });
  const schemaEvent = schemaEmitter.getDcaaEvents()[0];
  cases.push(
    makeCase(
      "F-2",
      "F",
      assertDcaaEventSchema(schemaEvent),
      "assertDcaaEventSchema",
    ),
  );

  cases.push(
    makeCase(
      "F-3",
      "F",
      schemaEvent.channelId === DCAA_RATE_AUDIT_CHANNEL_ID &&
        schemaEvent.retentionPolicyYears === DCAA_RATE_AUDIT_RETENTION_YEARS,
      `channel=${schemaEvent.channelId} retention=${schemaEvent.retentionPolicyYears}`,
    ),
  );

  cases.push(
    makeCase(
      "F-4",
      "F",
      schemaEvent.containsGovernmentContractData === true,
      "containsGovernmentContractData",
    ),
  );

  const probes = [
    {
      id: "F-5",
      run: (emitter) =>
        activateCasCoveredSubSegment({ entityId: "ent-1", subSegmentId: "C" }, emitter),
      type: "rate-resolution",
    },
    {
      id: "F-6",
      run: (emitter) => {
        const fpra = fpraState("overhead");
        transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
      },
      type: "fpra-to-pbr-transition",
    },
    {
      id: "F-7",
      run: (emitter) => {
        const fpra = fpraState("g_and_a");
        const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
        transitionPBRtoFinal(pbr, pbr.rate, emitter, "C");
      },
      type: "pbr-to-final-transition",
    },
    {
      id: "F-8",
      run: (emitter) => {
        const fpra = fpraState("fringe");
        const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
        const fin = transitionPBRtoFinal(pbr, pbr.rate, emitter, "C");
        reconcileFinaltoICS(fin, fin.rate, emitter, "C");
      },
      type: "final-to-ics-reconciliation",
    },
    {
      id: "F-9",
      run: (emitter) =>
        applyExecCompCap({ subSegmentId: "C", compensationUsd: 500_000, calendarYear: 2025 }, emitter),
      type: "exec-comp-cap-check",
    },
    {
      id: "F-10",
      run: (emitter) =>
        evaluateMAAR6Compliance(
          {
            subSegmentId: "T",
            laborRateUsd: 85,
            maar6EvidenceHandleId: "DCAA_MAAR_6_AP",
            timekeepingIntegrityVerified: true,
          },
          emitter,
        ),
      type: "maar6-timekeeping-check",
    },
    {
      id: "F-11",
      run: (emitter) => evaluateFar31205Allowability("2", baseAllowInput(), emitter),
      type: "far-31-205-allowability",
    },
    {
      id: "F-12",
      run: (emitter) => evaluateCas401(baseCasInput(), emitter),
      type: "cas-application",
    },
  ];

  for (const probe of probes) {
    const emitter = createGcAuditEmitter();
    probe.run(emitter);
    const event = emitter.getDcaaEvents().find((e) => e.decisionType === probe.type);
    cases.push(
      makeCase(
        probe.id,
        "F",
        event !== undefined && event.evidenceVersion === EVIDENCE_VERSION,
        event ? event.decisionType : "missing-event",
      ),
    );
  }

  return cases.slice(0, 12);
}

function runKVCases() {
  const { evaluateFar31205Allowability } = loadTsModule(`${GC_INDUSTRY}/far-31-205/index.ts`);
  const { evaluateCas401, reconcileDs1Disclosure } = loadTsModule(`${GC_INDUSTRY}/cas/index.ts`);
  const { applyExecCompCap } = loadTsModule(`${GC_INDUSTRY}/exec-comp-cap/index.ts`);
  const { evaluateMAAR6Compliance } = loadTsModule(`${GC_INDUSTRY}/maar6-timekeeping/index.ts`);
  const {
    transitionFPRAtoPBR,
    transitionPBRtoFinal,
    reconcileFinaltoICS,
  } = loadTsModule(`${GC_INDUSTRY}/rate-state-machine/transitions.ts`);
  const cases = [];

  const cat1 = [
    (emitter) =>
      evaluateFar31205Allowability("2", baseAllowInput({ structuralPreconditionsMet: false }), emitter),
    (emitter) =>
      evaluateFar31205Allowability("5", baseAllowInput({ structuralPreconditionsMet: false }), emitter),
    (emitter) =>
      evaluateFar31205Allowability("9", baseAllowInput({ structuralPreconditionsMet: false }), emitter),
    (emitter) =>
      evaluateFar31205Allowability("46", baseAllowInput({ perDiemCitationHandleId: "INVALID" }), emitter),
    (emitter) =>
      evaluateFar31205Allowability("50", baseAllowInput({ structuralPreconditionsMet: false }), emitter),
  ];
  cat1.forEach((fn, i) => cases.push(runPoisonCheck(`K-V.${String(i + 1).padStart(2, "0")}`, "unallowable-evasion", fn)));

  const cat2 = [
    (emitter) => transitionFPRAtoPBR(fpraState("g_and_a", 0.1, 0.11), 0.2, false, emitter, "C"),
    (emitter) => transitionFPRAtoPBR(fpraState("g_and_a", 0.08, 0.08), 0.12, false, emitter, "C"),
    (emitter) => {
      const fpra = fpraState("g_and_a");
      const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
      const fin = transitionPBRtoFinal(pbr, pbr.rate, emitter, "C");
      reconcileFinaltoICS(fin, fin.rate * 1.05, emitter, "C");
    },
    (emitter) => {
      const fpra = fpraState("g_and_a", 0.06, 0.06);
      transitionFPRAtoPBR(fpra, 0.1, false, emitter, "S");
    },
    (emitter) => transitionFPRAtoPBR(fpraState("g_and_a", 0.08, 0.08), 0.09, false, emitter, "S"),
  ];
  cat2.forEach((fn, i) =>
    cases.push(runPoisonCheck(`K-V.${String(i + 6).padStart(2, "0")}`, "ga-base-spoof", fn)),
  );

  const cat3 = [
    (emitter) => transitionFPRAtoPBR(fpraState("overhead", 0.12, 0.12), 0.15, false, emitter, "C"),
    (emitter) => {
      const fpra = fpraState("overhead");
      const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
      reconcileFinaltoICS(
        { ...pbr, state: "FINAL", pbrPredecessorId: undefined },
        pbr.rate,
        emitter,
        "C",
      );
    },
    (emitter) => {
      const fpra = fpraState("overhead");
      const pbr = transitionFPRAtoPBR(fpra, fpra.rate, true, emitter, "C");
      const fin = transitionPBRtoFinal(pbr, pbr.rate, emitter, "C");
      reconcileFinaltoICS(fin, fin.rate * 1.08, emitter, "C");
    },
    (emitter) => {
      const fpra = fpraState("materials_handling", 0.05, 0.05);
      transitionFPRAtoPBR(fpra, 0.12, false, emitter, "F");
    },
    (emitter) =>
      transitionFPRAtoPBR(fpraState("fringe", 0.07, 0.07), 0.12, false, emitter, "T"),
  ];
  cat3.forEach((fn, i) =>
    cases.push(runPoisonCheck(`K-V.${String(i + 11).padStart(2, "0")}`, "rate-chain-spoof", fn)),
  );

  const cat4 = [
    (emitter) => evaluateCas401(baseCasInput({ structuralPreconditionsMet: false }), emitter),
    (emitter) =>
      reconcileDs1Disclosure(
        {
          ...baseCasInput(),
          disclosedPractice: "full",
          resolvedPractice: "modified",
          contractAwardUsd: 60_000_000,
        },
        emitter,
      ),
    (emitter) =>
      reconcileDs1Disclosure(
        {
          ...baseCasInput({ structuralPreconditionsMet: false }),
          disclosedPractice: "full",
          resolvedPractice: "full",
          contractAwardUsd: 20_000_000,
        },
        emitter,
      ),
    (emitter) => evaluateCas401(baseCasInput({ structuralPreconditionsMet: false }), emitter),
    (emitter) =>
      reconcileDs1Disclosure(
        {
          ...baseCasInput(),
          disclosedPractice: "standard",
          resolvedPractice: "other",
          contractAwardUsd: 8_000_000,
        },
        emitter,
      ),
  ];
  cat4.forEach((fn, i) =>
    cases.push(runPoisonCheck(`K-V.${String(i + 16).padStart(2, "0")}`, "cas-threshold-spoof", fn)),
  );

  const cat5 = [
    (emitter) =>
      evaluateMAAR6Compliance(
        { subSegmentId: "T", laborRateUsd: 90, timekeepingIntegrityVerified: true },
        emitter,
      ),
    (emitter) =>
      evaluateMAAR6Compliance(
        {
          subSegmentId: "T",
          laborRateUsd: 90,
          maar6EvidenceHandleId: "DCAA_MAAR_6_AP",
          timekeepingIntegrityVerified: false,
        },
        emitter,
      ),
    (emitter) =>
      evaluateMAAR6Compliance(
        {
          subSegmentId: "T",
          laborRateUsd: 90,
          maar6EvidenceHandleId: "DCAA_MAAR_6_AP",
          timekeepingIntegrityVerified: false,
        },
        emitter,
      ),
    (emitter) =>
      evaluateMAAR6Compliance(
        { subSegmentId: "T", laborRateUsd: 120, timekeepingIntegrityVerified: false },
        emitter,
      ),
    (emitter) =>
      evaluateMAAR6Compliance(
        {
          subSegmentId: "T",
          laborRateUsd: 75,
          maar6EvidenceHandleId: "DCAA_MAAR_6_AP",
          timekeepingIntegrityVerified: false,
        },
        emitter,
      ),
  ];
  cat5.forEach((fn, i) =>
    cases.push(runPoisonCheck(`K-V.${String(i + 21).padStart(2, "0")}`, "timekeeping-spoof", fn)),
  );

  const cat6 = [
    (emitter) =>
      applyExecCompCap({ subSegmentId: "C", compensationUsd: 900_000, calendarYear: 2025 }, emitter),
    (emitter) =>
      applyExecCompCap({ subSegmentId: "C", compensationUsd: 720_000, calendarYear: 2026 }, emitter),
    (emitter) =>
      applyExecCompCap({ subSegmentId: "N", compensationUsd: 999_999, calendarYear: 2025 }, emitter),
    (emitter) => evaluateFar31205Allowability("6", baseAllowInput({ compensationUsd: 850_000 }), emitter),
    (emitter) =>
      evaluateFar31205Allowability("46", baseAllowInput({ perDiemCitationHandleId: undefined }), emitter),
  ];
  cat6.forEach((fn, i) =>
    cases.push(runPoisonCheck(`K-V.${String(i + 26).padStart(2, "0")}`, "exec-comp-audit-bypass", fn)),
  );

  return cases.slice(0, 30);
}

function runAntiPatternGuards() {
  const source = collectIndustryGovconSource();
  const productionOnly = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const cases = [];

  cases.push(
    makeCase(
      "AP-1",
      "AP",
      !/31\.205-\d+.*unallowable/i.test(productionOnly),
      "no hard-coded FAR 31.205 rule text",
    ),
  );

  cases.push(
    makeCase(
      "AP-2",
      "AP",
      !/reclassif(y|ied).*silent/i.test(productionOnly),
      "no silent unallowable reclassification",
    ),
  );

  cases.push(
    makeCase(
      "AP-3",
      "AP",
      !/handleId:\s*"IFRS_/i.test(productionOnly),
      "no IFRS handles in industry/govcon",
    ),
  );

  cases.push(
    makeCase(
      "AP-4",
      "AP",
      !/customerName|companyName.*subSegment/i.test(productionOnly),
      "no name-based sub-segment routing",
    ),
  );

  cases.push(
    makeCase(
      "AP-5",
      "AP",
      source.includes("pbrPredecessorId") && source.includes("Orphan final"),
      "rate requires predecessor state",
    ),
  );

  cases.push(
    makeCase(
      "AP-6",
      "AP",
      source.includes("resolveExecCompCap") && source.includes("calendarYear"),
      "exec comp cap uses current-FY resolver",
    ),
  );

  cases.push(
    makeCase(
      "AP-7",
      "AP",
      source.includes("evaluateMAAR6Compliance") && source.includes("Maar6Violation"),
      "MAAR 6 timekeeping gate present",
    ),
  );

  cases.push(
    makeCase(
      "AP-8",
      "AP",
      !/silent.*g.?&.?a.*base/i.test(productionOnly),
      "no silent G&A base change",
    ),
  );

  cases.push(
    makeCase(
      "AP-9",
      "AP",
      source.includes("CAS_406_ACCOUNTING_PERIOD"),
      "CAS 406 accounting period referenced",
    ),
  );

  cases.push(
    makeCase(
      "AP-10",
      "AP",
      source.includes("CAS_420") || source.includes("IRAD_BP"),
      "IRAD/B&P via CAS 420 not direct allocation",
    ),
  );

  cases.push(
    makeCase(
      "AP-11",
      "AP",
      source.includes("rejected-escalation") && !/warning only/i.test(productionOnly),
      "hard reject — no warning-only",
    ),
  );

  cases.push(
    makeCase(
      "AP-12",
      "AP",
      source.includes("createGcAuditEmitter") && !source.includes("industry/libraries/govcon"),
      "wave-2 industry namespace + single audit emitter",
    ),
  );

  return cases.slice(0, 12);
}

function runVerifier() {
  return [
    ...runGateA(),
    ...runGateB(),
    ...runGateC(),
    ...runGateD(),
    ...runGateE(),
    ...runGateF(),
    ...runKVCases(),
    ...runAntiPatternGuards(),
  ];
}

function main() {
  let cases = [];
  try {
    cases = runVerifier();
  } catch (error) {
    const message = error && error.message ? error.message : "unknown_error";
    console.error(`GC-2 verifier runtime error: ${message}`);
    console.error(error.stack);
    process.exit(1);
  }

  if (cases.length !== EXPECTED_CASE_COUNT) {
    console.error(`FAIL: Expected ${EXPECTED_CASE_COUNT} cases — got ${cases.length}`);
    process.exit(1);
  }

  const passCount = cases.filter((c) => c.pass).length;
  const failCases = cases.filter((c) => !c.pass);

  console.log(`GC-2 verifier: ${passCount}/${EXPECTED_CASE_COUNT} PASS`);
  for (const c of failCases) {
    console.error(`FAIL ${c.id} [${c.gate}]: ${c.reason}`);
  }

  const evidenceOk = cases.some(
    (c) => c.id === "F-1" && c.pass && c.reason === EVIDENCE_VERSION,
  );
  if (!evidenceOk) {
    console.error(`FAIL: evidence version check ${EVIDENCE_VERSION} missing or failed`);
    process.exit(1);
  }

  process.exit(failCases.length === 0 ? 0 : 1);
}

main();
