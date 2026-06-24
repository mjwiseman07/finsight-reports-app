import fs from "fs";
import path from "path";
import { buildParityChecklist, loadBaseline } from "../job-descriptions/load-baseline";
import { validateWorkerJobDescriptionsDocument } from "./schema-validate";
import {
  assertLockedPathsUntouched,
  assertPhase38OnlyExternalIO,
  assertPhase39LockImports,
  assertRoleAdapterBridgeSingleton,
} from "./invariants";
import workerJobDescriptions from "../job-descriptions/worker-job-descriptions.json";
import parityChecklistCommitted from "../job-descriptions/parity-checklist.json";
import type { WorkerJobDescriptionsDocument } from "../types";

export interface VerifyPanelConsumerResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function verifyPanelConsumer(repoRoot: string): VerifyPanelConsumerResult {
  const errors: string[] = [];

  try {
    validateWorkerJobDescriptionsDocument(workerJobDescriptions as WorkerJobDescriptionsDocument);
  } catch (error) {
    errors.push(`worker-job-descriptions validation failed: ${String(error)}`);
  }

  try {
    loadBaseline();
  } catch (error) {
    errors.push(`loadBaseline failed: ${String(error)}`);
  }

  const regenerated = buildParityChecklist();
  const committed = `${JSON.stringify(parityChecklistCommitted, null, 2)}\n`;
  const generated = `${JSON.stringify(regenerated, null, 2)}\n`;
  if (committed !== generated) {
    errors.push("parity-checklist.json is out of sync with worker-job-descriptions.json");
  }

  errors.push(...assertPhase39LockImports());
  errors.push(...assertPhase38OnlyExternalIO());
  errors.push(...assertRoleAdapterBridgeSingleton());
  errors.push(...assertLockedPathsUntouched(repoRoot));

  const checklistPath = path.join(
    repoRoot,
    "lib/intelligence/synthetic/panel-consumer/job-descriptions/parity-checklist.json",
  );
  if (!fs.existsSync(checklistPath)) {
    errors.push("parity-checklist.json missing");
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
