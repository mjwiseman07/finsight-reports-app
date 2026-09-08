/**
 * Gate unit tests: negative fixtures must fail closed; metadata-only must pass.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const scanPath = path.join(
  root,
  "scripts/gates/lib/qbo-credential-writer-scan.mjs",
);
const fixturesDir = path.join(
  root,
  "scripts/gates/__fixtures__/qbo-credential-writer",
);

async function loadScan(): Promise<{
  analyzeSource: (
    sourceText: string,
    fileRel: string,
    filePath?: string,
  ) => Array<{
    classification: string;
    enclosingFunction: string | null;
    file: string;
    line: number;
  }>;
  scanCredentialWriters: (opts: {
    root?: string;
    sourceFiles?: Array<{ rel: string; text: string }>;
  }) => {
    offenders: Array<{ classification: string }>;
    findings: Array<{ classification: string }>;
  };
}> {
  return import(pathToFileURL(scanPath).href) as Promise<{
    analyzeSource: (
      sourceText: string,
      fileRel: string,
      filePath?: string,
    ) => Array<{
      classification: string;
      enclosingFunction: string | null;
      file: string;
      line: number;
    }>;
    scanCredentialWriters: (opts: {
      root?: string;
      sourceFiles?: Array<{ rel: string; text: string }>;
    }) => {
      offenders: Array<{ classification: string }>;
      findings: Array<{ classification: string }>;
    };
  }>;
}

describe("qbo credential writer inventory gate fixtures", () => {
  it("rejects inline credential update bypass", async () => {
    const { analyzeSource, scanCredentialWriters } = await loadScan();
    const rel = "scripts/gates/__fixtures__/qbo-credential-writer/bypass-inline-update.ts";
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    const updates = analyzeSource(text, rel);
    expect(updates.some((u) => u.classification === "credential_literal")).toBe(true);

    const { offenders } = scanCredentialWriters({
      root,
      sourceFiles: [{ rel, text }],
    });
    expect(offenders.length).toBeGreaterThan(0);
  });

  it("rejects payload update even when CAS is imported", async () => {
    const { scanCredentialWriters } = await loadScan();
    const rel =
      "scripts/gates/__fixtures__/qbo-credential-writer/bypass-payload-despite-cas-import.ts";
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    const { offenders } = scanCredentialWriters({
      root,
      sourceFiles: [{ rel, text }],
    });
    expect(offenders.some((o) => o.classification === "credential_identifier" || o.classification === "unresolved_identifier" || o.classification === "credential_literal")).toBe(true);
  });

  it("rejects credential update outside allowlisted function", async () => {
    const { analyzeSource } = await loadScan();
    const rel = "scripts/gates/__fixtures__/qbo-credential-writer/bypass-wrong-function.ts";
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    const updates = analyzeSource(text, rel);
    const sneaky = updates.filter((u) => u.enclosingFunction === "sneakyExtraCredentialWrite");
    expect(sneaky.length).toBeGreaterThan(0);
  });

  it("does not flag metadata-only updates as credential writers", async () => {
    const { scanCredentialWriters } = await loadScan();
    const rel = "scripts/gates/__fixtures__/qbo-credential-writer/ok-metadata-only.ts";
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    const { offenders, findings } = scanCredentialWriters({
      root,
      sourceFiles: [{ rel, text }],
    });
    expect(findings.every((f) => f.classification === "metadata_or_other_literal")).toBe(true);
    expect(offenders.length).toBe(0);
  });

  it("fixture directory exists for review evidence", () => {
    expect(fs.existsSync(fixturesDir)).toBe(true);
  });
});
