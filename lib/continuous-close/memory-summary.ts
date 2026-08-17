/**
 * Continuous Close memory summary (OBSERVE).
 *
 * Composes a read-only summary from existing client Memory records.
 * Does not call recordMemory / upsertMemory — persistence remains a later block.
 */

export type ContinuousCloseMemoryRecordView = {
  memory_key: string;
  memory_type: string;
  confidence_score: number | null;
  persistence_status: string;
  topic?: string | null;
};

export type ContinuousCloseMemorySummary = {
  recordCount: number;
  persistedCount: number;
  pendingCount: number;
  averageConfidence: number | null;
  topics: string[];
  memoryTypes: string[];
  /** Deterministic highlight keys (no payloads — avoid leaking memory bodies). */
  highlightKeys: string[];
};

export function buildContinuousCloseMemorySummary(
  records: readonly ContinuousCloseMemoryRecordView[] = [],
): ContinuousCloseMemorySummary {
  const persisted = records.filter((r) => r.persistence_status === "persisted");
  const pending = records.filter((r) => r.persistence_status === "pending");
  const confidences = records
    .map((r) => r.confidence_score)
    .filter((c): c is number => typeof c === "number" && Number.isFinite(c));

  const topics = Array.from(
    new Set(records.map((r) => String(r.topic || "").trim()).filter(Boolean)),
  ).sort();
  const memoryTypes = Array.from(new Set(records.map((r) => r.memory_type))).sort();
  const highlightKeys = [...records]
    .sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0))
    .slice(0, 5)
    .map((r) => r.memory_key);

  return {
    recordCount: records.length,
    persistedCount: persisted.length,
    pendingCount: pending.length,
    averageConfidence:
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null,
    topics,
    memoryTypes,
    highlightKeys,
  };
}
