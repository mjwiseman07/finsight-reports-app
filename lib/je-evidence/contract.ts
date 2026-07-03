// D6.4a: Runtime validation gate. Composer output goes through this before it reaches
// the D2 posting path. Failure = throw, never post.

import type { JeCompositionResult, JeLineWithEvidence } from "./types";

export class JeEvidenceContractError extends Error {
  constructor(
    msg: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(msg);
    this.name = "JeEvidenceContractError";
  }
}

export function validateJeComposition(je: JeCompositionResult): void {
  if (!je.lines || je.lines.length < 2) {
    throw new JeEvidenceContractError("JE must have at least 2 lines", { je });
  }
  let drTotal = 0;
  let crTotal = 0;
  for (const line of je.lines) {
    validateLine(line);
    drTotal += line.drAmount;
    crTotal += line.crAmount;
  }
  if (Math.abs(drTotal - crTotal) > 0.005) {
    throw new JeEvidenceContractError(
      `JE unbalanced: dr=${drTotal.toFixed(2)} cr=${crTotal.toFixed(2)}`,
      { drTotal, crTotal },
    );
  }
}

function validateLine(line: JeLineWithEvidence): void {
  if (typeof line.lineIndex !== "number" || line.lineIndex < 0) {
    throw new JeEvidenceContractError("line.lineIndex missing or invalid", { line });
  }
  if (!line.accountId || !line.accountName) {
    throw new JeEvidenceContractError("line missing accountId/accountName", { line });
  }
  const dr = Number(line.drAmount || 0);
  const cr = Number(line.crAmount || 0);
  if (dr < 0 || cr < 0) {
    throw new JeEvidenceContractError("negative dr/cr not allowed", { line });
  }
  if (dr > 0 && cr > 0) {
    throw new JeEvidenceContractError("line has both dr and cr > 0", { line });
  }
  if (dr === 0 && cr === 0) {
    throw new JeEvidenceContractError("line has zero dr and zero cr", { line });
  }
  if (!line.evidence) {
    throw new JeEvidenceContractError("line missing evidence (contract violation)", { line });
  }
  const ev = line.evidence;
  if (!ev.evidenceType) {
    throw new JeEvidenceContractError("evidence.evidenceType required", { line });
  }
  if (!ev.sourceType) {
    throw new JeEvidenceContractError("evidence.sourceType required", { line });
  }
  if (!ev.evidenceSummary || ev.evidenceSummary.trim().length < 3) {
    throw new JeEvidenceContractError("evidence.evidenceSummary required (min 3 chars)", { line });
  }
}
