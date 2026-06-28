import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RegisterClassificationMismatchError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "register-schema-v1.2.0";
export const REGISTER_SCHEMA_VERSION = "1.2.0";

const REQUIRED_GAP_FIELDS = [
  "id",
  "filingId",
  "vertical",
  "framework",
  "tier",
  "severity",
  "classification",
  "message",
  "observed",
  "expected",
  "triage",
  "createdAt",
] as const;

export function validateRegisterSchemaV120(ctx: CrossoverContext): CrossoverValidatorResult {
  const register = ctx.register;
  if (register.schemaVersion !== REGISTER_SCHEMA_VERSION) {
    throw new RegisterClassificationMismatchError(
      `register.schemaVersion expected ${REGISTER_SCHEMA_VERSION}, got ${register.schemaVersion}`,
    );
  }

  for (const gap of register.gaps) {
    for (const field of REQUIRED_GAP_FIELDS) {
      const value = gap[field];
      if (value === undefined || value === null) {
        throw new RegisterClassificationMismatchError(`${gap.id}: missing required field ${field}`);
      }
    }
    if (gap.triage === "satisfied" && gap.closure_mechanism === "emitter-satisfaction" && !gap.emitter_path) {
      throw new RegisterClassificationMismatchError(`${gap.id}: emitter_path required for emitter-satisfaction`);
    }
    if (gap.triage === "satisfied" && !gap.closed_in) {
      throw new RegisterClassificationMismatchError(`${gap.id}: closed_in required for satisfied`);
    }
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `all ${register.gaps.length} gaps validate against register schema v${REGISTER_SCHEMA_VERSION}`,
  };
}

export function readRegisterSchemaVersion(repoRoot: string): string {
  const schemaPath = join(repoRoot, "schemas/register.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as { version?: string };
  return schema.version ?? REGISTER_SCHEMA_VERSION;
}
