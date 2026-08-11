// WBP W1b — Write-boundary lifecycle emitter.
// Mirrors lib/lifecycle/emit-sync-event.ts pattern EXACTLY:
// - Trigger derives prev_hash / row_hash / chain_seq
// - actor_kind: system, actor_via: accounting-sync (already allowlisted)
// - from_status = to_status = active (Option 2 self-transition)
// - Never throws — lifecycle emission MUST NOT block the write path
// Returns the inserted event's id so callers can populate WriteReceipt.lifecycleEventIds.

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JournalEntry,
  WriteLifecycleEventKind,
  WriteBoundaryLifecyclePayload,
} from "./types";

export type EmitWriteLifecycleEventParams = {
  admin: SupabaseClient;
  pilotSlotId: string;
  eventKind: WriteLifecycleEventKind;
  payload: WriteBoundaryLifecyclePayload;
};

/** Exported for unit tests; used by emitWriteLifecycleEvent for reason_code. */
export function reasonCodeForWriteEvent(kind: WriteLifecycleEventKind): string {
  switch (kind) {
    case "pilot.lifecycle.write-validated":
      return "accounting.write.validated";
    case "pilot.lifecycle.write-rejected":
      return "accounting.write.rejected";
    case "pilot.lifecycle.write-posted":
      return "accounting.write.posted";
    case "pilot.lifecycle.write-drifted":
      return "accounting.write.drifted";
    case "pilot.lifecycle.write-void-succeeded":
      return "accounting.write.void_succeeded";
    case "pilot.lifecycle.write-failed":
      return "accounting.write.failed";
    case "pilot.lifecycle.cache-refreshed":
      return "accounting.cache.refreshed"; // WBP W1c.4a
  }
}

/**
 * Insert a write-boundary lifecycle event.
 * Returns the inserted row id, or null on failure (caller does NOT throw).
 */
export async function emitWriteLifecycleEvent(
  params: EmitWriteLifecycleEventParams,
): Promise<string | null> {
  const { admin, pilotSlotId, eventKind, payload } = params;

  const { data, error } = await admin
    .from("pilot_lifecycle_events")
    .insert({
      pilot_slot_id: pilotSlotId,
      event_kind: eventKind,
      actor_kind: "system",
      actor_via: "accounting-sync",
      from_status: "active",
      to_status: "active",
      reason_code: reasonCodeForWriteEvent(eventKind),
      payload,
      // DO NOT SET: prev_hash, row_hash, chain_seq, company_id, firm_id.
      // BEFORE-INSERT trigger derives them.
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[emitWriteLifecycleEvent] insert failed", { eventKind, pilotSlotId, error });
    return null;
  }
  return (data?.id as string) ?? null;
}

/**
 * Deterministic SHA-256 of the canonical JSON of a JournalEntry.
 * Used to populate WriteLifecyclePayload.request_hash so the same input always
 * produces the same hash — enabling replay-safe dedup verification against the chain.
 * Sorts object keys recursively so map ordering doesn't affect the hash.
 */
export function computeRequestHash(entry: JournalEntry): string {
  const canonical = canonicalize(entry);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
  );
  return `{${pairs.join(",")}}`;
}
