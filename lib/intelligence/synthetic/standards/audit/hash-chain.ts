import { createHash } from "node:crypto";
import type { AuditEntry } from "./types";

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

export function hashAuditEntryBase(base: Record<string, unknown>): string {
  const serialized = JSON.stringify(canonicalize(base));
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

export function verifyAuditChain(entries: readonly AuditEntry[]): boolean {
  if (entries.length === 0) {
    return true;
  }
  let expectedPrev = "GENESIS";
  for (const entry of entries) {
    if (entry.prevHash !== expectedPrev) {
      return false;
    }
    const { entryHash, ...withoutHash } = entry;
    const base = { ...withoutHash, prevHash: entry.prevHash };
    const computed = hashAuditEntryBase(base);
    if (computed !== entryHash) {
      return false;
    }
    expectedPrev = entryHash;
  }
  return true;
}
