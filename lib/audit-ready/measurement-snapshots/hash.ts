import { createHash } from "node:crypto";
import type { MeasurementSnapshotHashBody } from "./types";

/**
 * Stable canonical JSON. Object keys sorted; array order preserved.
 * Copied locally so measurement hashing is not coupled to Memory FNV hashes.
 * SHA-256 hex — same digest as URM evidence, not a new chain.
 */
export function stableCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableCanonicalJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableCanonicalJson(entryValue)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

/** Hash body is exactly schemaVersion + snapshotKind + asOfDate + payload. */
export function hashMeasurementSnapshotBody(
  body: MeasurementSnapshotHashBody,
): string {
  return sha256Hex(
    stableCanonicalJson({
      schemaVersion: body.schemaVersion,
      snapshotKind: body.snapshotKind,
      asOfDate: body.asOfDate,
      payload: body.payload,
    }),
  );
}
