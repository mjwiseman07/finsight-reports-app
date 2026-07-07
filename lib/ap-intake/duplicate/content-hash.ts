/**
 * Phase D6.5 Part 2 — Block 4: SHA256 of normalized bill text (S1 input).
 */
import { createHash } from "node:crypto";

export function normalizeForHash(rawText: string): string {
  if (!rawText) return "";
  const stripped = rawText.replace(/^\s*(from|to|subject|date|cc|bcc)\s*:.*$/gim, "");
  const lowered = stripped.toLowerCase();
  const collapsed = lowered.replace(/\s+/g, " ");
  return collapsed.trim();
}

export function computeContentHash(rawText: string): string | null {
  const normalized = normalizeForHash(rawText);
  if (!normalized) return null;
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
