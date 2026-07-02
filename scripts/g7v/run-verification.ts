#!/usr/bin/env node
/**
 * Phase G7-V — read-only disclosure validation harness orchestrator.
 */
import path from "node:path";
import { CASCADE_STAGES, VERTICALS, type VerticalConfig } from "./verticals";
import fs from "node:fs";
import {
  captureCascade,
  observeRouterDisclosureStages,
  wireCascadeTap,
  type CascadeTap,
} from "./capture-cascade";
import { captureProvenance } from "./capture-provenance";
import { diffBaseline } from "./diff-baseline";
import { writeEvidence } from "./write-evidence";
import { summarize } from "./summarize";
import { DISCLOSURE_ENTRY_POINT, generateDisclosure } from "./generate-disclosure";
import { loadMockCoFixture } from "./load-fixture";

type Severity = "SEV-1" | "SEV-2" | "SEV-3";

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

type VerticalRecord = {
  vertical: string;
  verticalName: string;
  status: "PASS" | "FAIL" | "ERROR";
  entryPoint: string;
  fixturePath: string;
  filingId: string;
  framework: string;
  satisfiedEmitters: number;
  failClosedEmitters: number;
  cascadeWireMode: string;
  cascadeWireDetail: string;
  cascadeStagesFired: number[];
  cascadeStagesSkipped: Array<{ stageId: number; reason: string }>;
  provenanceCoverage: number;
  citationCoverage: number;
  baselineDiff: ReturnType<typeof diffBaseline>;
  findings: Finding[];
  error?: string;
};

function evaluateVertical(
  vertical: VerticalConfig,
  tap: CascadeTap,
  cascadeWireMode: string,
  cascadeWireDetail: string,
): VerticalRecord {
  const findings: Finding[] = [];
  const extracted = loadMockCoFixture(vertical.mockCoFixturePath);
  const disclosure = generateDisclosure(extracted, vertical.code);

  const proxyStagesFired =
    cascadeWireMode === "silent" || cascadeWireMode === "router-proxy"
      ? observeRouterDisclosureStages(tap, disclosure, extracted)
      : 0;

  const stagesFired = tap.firedStages();
  const stagesSkipped = tap.skippedStages();

  if (stagesFired.length === 0) {
    findings.push({
      severity: "SEV-2",
      code: "CASCADE-SILENT",
      message: `0/${CASCADE_STAGES.length} cascade stages observed — ${cascadeWireDetail}`,
    });
  } else if (stagesFired.length < CASCADE_STAGES.length) {
    findings.push({
      severity: "SEV-3",
      code: "CASCADE-PARTIAL",
      message: `${stagesFired.length}/${CASCADE_STAGES.length} stages observed via router proxy (${stagesSkipped.length} skipped — outside router entry path or substrate silent)`,
    });
  }

  if (cascadeWireMode === "silent" && proxyStagesFired > 0) {
    findings.push({
      severity: "SEV-3",
      code: "CASCADE-SUBSTRATE-SILENT",
      message: `Substrate silent; ${proxyStagesFired} stage(s) observed via harness router proxy only`,
    });
  }

  const provenance = captureProvenance();
  const provenanceCoverage = provenance.coverage(disclosure);
  const citationCoverage = provenance.citationResolution(disclosure);
  const baselineDiff = diffBaseline(disclosure, vertical.baselineDisclosurePath);

  for (const note of baselineDiff.notes) {
    findings.push({
      severity: "SEV-3",
      code: "BASELINE-INFO",
      message: note,
    });
  }

  if (disclosure.frameworkViolation) {
    findings.push({
      severity: "SEV-2",
      code: "FRAMEWORK-VIOLATION",
      message: disclosure.frameworkViolation.message,
    });
  }

  if (disclosure.results.length === 0 && !disclosure.frameworkViolation) {
    findings.push({
      severity: "SEV-1",
      code: "NO-EMITTERS",
      message: "Router returned zero emitter results with no framework violation explanation",
    });
  }

  if (disclosure.satisfiedEmitters === 0 && disclosure.results.length > 0) {
    findings.push({
      severity: "SEV-1",
      code: "ALL-FAIL-CLOSED",
      message: `All ${disclosure.failClosedEmitters} emitters returned fail-closed`,
    });
  }

  if (citationCoverage < 1.0 && disclosure.results.some((r) => r.status === "satisfied")) {
    findings.push({
      severity: "SEV-2",
      code: "CITATION-GAP",
      message: `Citation resolution coverage ${(citationCoverage * 100).toFixed(1)}%`,
    });
  }

  const hasSev1 = findings.some((f) => f.severity === "SEV-1");
  const status: VerticalRecord["status"] = hasSev1 ? "FAIL" : "PASS";

  return {
    vertical: vertical.code,
    verticalName: vertical.name,
    status,
    entryPoint: DISCLOSURE_ENTRY_POINT,
    fixturePath: vertical.mockCoFixturePath,
    filingId: extracted.filingId,
    framework: extracted.framework,
    satisfiedEmitters: disclosure.satisfiedEmitters,
    failClosedEmitters: disclosure.failClosedEmitters,
    cascadeWireMode,
    cascadeWireDetail,
    cascadeStagesFired: tap.firedStages(),
    cascadeStagesSkipped: tap.skippedStages(),
    provenanceCoverage,
    citationCoverage,
    baselineDiff,
    findings,
  };
}

function baselinesPresent(): boolean {
  return VERTICALS.every((v) => fs.existsSync(path.resolve(v.baselineDisclosurePath)));
}

function printDiscoveryBanner(): void {
  console.log("[G7-V] Step 1 discovery summary");
  console.log("  Entry point: lib/router/{vertical}/index.ts — run*Router(extracted)");
  console.log("  Missing: src/disclosures/, src/cascade/, src/memory/, generateDisclosure export");
  console.log("  Cascade signal: substrate silent — harness uses router-output proxy observation");
  console.log("  Mock-co fixtures: fixtures/mock-cos/{CODE}.json (G7-V stubs with extracted block)");
  console.log(
    baselinesPresent()
      ? "  Baselines: fixtures/baselines/*-pre-G7.json — present"
      : "  Baselines: fixtures/baselines/*-pre-G7.json — not present (informational diff only)",
  );
  console.log("");
}

function main(): void {
  printDiscoveryBanner();

  const wire = wireCascadeTap();
  const effectiveMode = wire.mode === "silent" ? "router-proxy" : wire.mode;
  console.log(`[G7-V] Cascade wire mode: ${effectiveMode} (substrate: ${wire.mode})`);
  console.log(`[G7-V] ${wire.detail}`);
  console.log("");

  const records: VerticalRecord[] = [];
  const disclosures: Array<{ vertical: VerticalConfig; disclosure: ReturnType<typeof generateDisclosure> }> =
    [];

  for (const vertical of VERTICALS) {
    const verticalTap = captureCascade();

    process.stdout.write(`[G7-V] ${vertical.name} (${vertical.code}) ... `);
    try {
      const record = evaluateVertical(
        vertical,
        verticalTap,
        wire.mode === "silent" ? "router-proxy" : wire.mode,
        wire.detail,
      );
      records.push(record);
      disclosures.push({
        vertical,
        disclosure: generateDisclosure(loadMockCoFixture(vertical.mockCoFixturePath), vertical.code),
      });
      console.log(record.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("ERROR");
      records.push({
        vertical: vertical.code,
        verticalName: vertical.name,
        status: "ERROR",
        entryPoint: DISCLOSURE_ENTRY_POINT,
        fixturePath: vertical.mockCoFixturePath,
        filingId: "unknown",
        framework: "unknown",
        satisfiedEmitters: 0,
        failClosedEmitters: 0,
        cascadeWireMode: wire.mode,
        cascadeWireDetail: wire.detail,
        cascadeStagesFired: [],
        cascadeStagesSkipped: [],
        provenanceCoverage: 0,
        citationCoverage: 0,
        baselineDiff: { figuresChanged: 0, citationsChanged: 0, notes: [] },
        findings: [{ severity: "SEV-1", code: "RUNTIME-ERROR", message }],
        error: message,
      });
    }
  }

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const vertical = VERTICALS[i];
    const disclosure = disclosures[i]?.disclosure ?? { error: record.error };
    writeEvidence(
      vertical,
      record,
      disclosure,
      record.cascadeStagesSkipped.length > 0 || record.cascadeStagesFired.length > 0
        ? { fired: record.cascadeStagesFired, skipped: record.cascadeStagesSkipped }
        : { mode: wire.mode, detail: wire.detail },
      { coverage: record.provenanceCoverage, citations: record.citationCoverage },
    );
  }

  const summary = summarize(records);

  console.log("");
  console.log(
    `[G7-V] Results: ${summary.pass} PASS, ${summary.fail} FAIL, ${summary.error} ERROR`,
  );
  console.log(
    `[G7-V] Findings: SEV-1=${summary.sev1Count} SEV-2=${summary.sev2Count} SEV-3=${summary.sev3Count}`,
  );

  const green =
    summary.error === 0 &&
    summary.fail === 0 &&
    summary.sev1Count === 0 &&
    summary.sev2Count === 0;

  if (green) {
    console.log("Go/no-go: GREEN — G8 may proceed");
    process.exit(0);
  } else {
    console.log("Go/no-go: RED — fix G7 before G8");
    process.exit(1);
  }
}

main();
