import fs from "node:fs";
import path from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";

type MockCoFixture = {
  _g7vStub?: boolean;
  _g7vStubComment?: string;
  company?: { name?: string; fiscalYear?: number; currency?: string };
  trialBalance?: unknown[];
  accountMap?: Record<string, unknown>;
  subledgers?: Record<string, unknown[]>;
  elections?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  priorPeriod?: unknown;
  extracted?: ExtractedFiling;
};

export function loadMockCoFixture(fixturePath: string): ExtractedFiling {
  const absPath = path.resolve(fixturePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Mock-co fixture not found: ${fixturePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(absPath, "utf-8")) as MockCoFixture;

  if (raw.extracted) {
    return raw.extracted;
  }

  throw new Error(
    `Fixture ${fixturePath} has no extracted block — routers require ExtractedFiling shape`,
  );
}

export function loadFixtureMeta(fixturePath: string): MockCoFixture {
  const absPath = path.resolve(fixturePath);
  return JSON.parse(fs.readFileSync(absPath, "utf-8")) as MockCoFixture;
}
