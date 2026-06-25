/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * GC-1 anti-pattern guards.
 */

export function runAntiPatternGuards(sources: {
  govconSource: string;
  repoRootFiles: string[];
}): { id: string; pass: boolean; reason: string }[] {
  const { govconSource, repoRootFiles } = sources;
  const cases: { id: string; pass: boolean; reason: string }[] = [];
  const productionOnly = govconSource.replace(/\/\*[\s\S]*?\*\//g, "");

  cases.push({
    id: "AP-1",
    pass: !/31\.205-\d+.*unallowable/i.test(productionOnly),
    reason: "no hard-coded FAR 31.205 rule text",
  });

  cases.push({
    id: "AP-2",
    pass: !productionOnly.includes("overlay/govcon/"),
    reason: "no overlay/govcon/ path",
  });

  cases.push({
    id: "AP-3",
    pass: !repoRootFiles.some((f) => f.includes("PHASE_42.locked.ts")),
    reason: "PHASE_42.locked.ts not present or unmodified scope",
  });

  cases.push({
    id: "AP-4",
    pass: !/handleId:\s*"IFRS_/i.test(productionOnly),
    reason: "no IFRS_* handles under govcon/",
  });

  cases.push({
    id: "AP-5",
    pass: !/typical industry rate/i.test(productionOnly),
    reason: "no fabricated typical industry rates",
  });

  cases.push({
    id: "AP-6",
    pass: !productionOnly.includes("export type DoctrineBinding"),
    reason: "no global doctrine-binding union (GAP-2=A)",
  });

  return cases;
}
