import fs from "node:fs";
import path from "node:path";
import type { VerticalConfig } from "./verticals";

export function writeEvidence(
  vertical: VerticalConfig,
  record: unknown,
  disclosure: unknown,
  cascadeLog: unknown,
  provenanceGraph: unknown,
) {
  const dir = path.resolve(`evidence/g7v/${vertical.code}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "run.json"), JSON.stringify(record, null, 2));
  fs.writeFileSync(path.join(dir, "disclosure.json"), JSON.stringify(disclosure, null, 2));
  fs.writeFileSync(path.join(dir, "cascade.log"), JSON.stringify(cascadeLog, null, 2));
  fs.writeFileSync(path.join(dir, "provenance.json"), JSON.stringify(provenanceGraph, null, 2));
}
