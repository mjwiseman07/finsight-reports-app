import { createHash } from "node:crypto";

function sortKeys(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map((v) => sortKeys(v));
  if (typeof obj !== "object") return obj;
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = sortKeys((obj as Record<string, unknown>)[k]);
  }
  return out;
}

export function canonicalPayloadJson(payload: unknown): string {
  return JSON.stringify(sortKeys(payload));
}

export function computeEventHash(args: {
  previousEventHash: string | null;
  eventId: string;
  eventType: string;
  payload: unknown;
}): string {
  const canonical = canonicalPayloadJson(args.payload);
  const input = (args.previousEventHash ?? "") + args.eventId + args.eventType + canonical;
  return createHash("sha256").update(input, "utf8").digest("hex");
}
