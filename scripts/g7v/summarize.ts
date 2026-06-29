import fs from "node:fs";
import path from "node:path";

export function summarize(records: unknown[]) {
  const rows = records as Array<{
    status: string;
    vertical: string;
    cascadeStagesFired: number[];
    cascadeStagesSkipped: Array<{ stageId: number; reason: string }>;
    provenanceCoverage: number;
    citationCoverage: number;
    findings: Array<{ severity: string }>;
  }>;

  const summary = {
    runAt: new Date().toISOString(),
    lockTag: "LOCK-G7",
    lockCommit: "a9de7c9",
    totalVerticals: rows.length,
    pass: rows.filter((r) => r.status === "PASS").length,
    fail: rows.filter((r) => r.status === "FAIL").length,
    error: rows.filter((r) => r.status === "ERROR").length,
    sev1Count: rows.flatMap((r) => r.findings).filter((f) => f.severity === "SEV-1").length,
    sev2Count: rows.flatMap((r) => r.findings).filter((f) => f.severity === "SEV-2").length,
    sev3Count: rows.flatMap((r) => r.findings).filter((f) => f.severity === "SEV-3").length,
    perVertical: rows.map((r) => ({
      vertical: r.vertical,
      status: r.status,
      stagesFired: r.cascadeStagesFired.length,
      stagesSkipped: r.cascadeStagesSkipped.length,
      provenanceCoverage: r.provenanceCoverage,
      citationCoverage: r.citationCoverage,
      findings: r.findings.length,
    })),
  };

  const outPath = path.resolve("evidence/g7v/_summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`[G7-V] Summary written to ${outPath}`);
  return summary;
}
