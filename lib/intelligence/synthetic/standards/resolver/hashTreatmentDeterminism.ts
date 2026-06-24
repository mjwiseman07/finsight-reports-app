import { createHash } from "crypto";

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const canonical: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const entry = canonicalize(record[key]);
    if (entry !== undefined) {
      canonical[key] = entry;
    }
  }
  return canonical;
}

export function hashTreatmentDeterminism(value: unknown): string {
  const canonical = canonicalize(value);
  const serialized = JSON.stringify(canonical);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}
