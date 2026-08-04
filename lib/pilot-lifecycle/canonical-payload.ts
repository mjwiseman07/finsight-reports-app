/**
 * Canonical payload composition for pilot_lifecycle_events.
 *
 * Contract: MUST produce byte-identical output to
 * public.pilot_lifecycle_events_canonical_payload(...) —
 * which is `jsonb_build_object(...)::text` in Postgres.
 *
 * Postgres jsonb::text quirks we mirror:
 *  - object keys ordered by shortlex (length asc, then name asc)
 *  - spaces after `:` and `,` (e.g. `{"a": 1, "bb": 2}`)
 *  - UUID / text nulls as JSON null
 *  - assertions_covered sorted alphabetically (DB uses ORDER BY 1)
 *  - event_at via to_char UTC `YYYY-MM-DD"T"HH24:MI:SS.US"Z"`
 *
 * Any drift breaks client-side tamper-evidence. Do not modify without
 * updating the DB function in the same PR and regenerating fixtures.
 */

export type LifecycleEventForCanonicalization = {
  event_kind: string;
  event_at: string;
  schema_version: string;
  pilot_slot_id: string;
  from_status: string | null;
  to_status: string | null;
  classification_hint: string | null;
  company_id: string | null;
  firm_id: string | null;
  actor_kind: string;
  actor_user_id: string | null;
  actor_via: string;
  assertions_covered: readonly string[] | null;
  evidence_refs: unknown;
  reason_code: string;
  reason_text: string | null;
  payload: unknown;
};

/** Postgres jsonb key order: length ascending, then lexical. */
export function compareJsonbKeys(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Format timestamptz the same way as
 * to_char(p_event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"').
 */
export function formatEventAtForCanonical(eventAt: string): string {
  const trimmed = eventAt.trim();
  const m = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (m) {
    const frac = (m[3] ?? "").padEnd(6, "0").slice(0, 6);
    return `${m[1]}T${m[2]}.${frac}Z`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`canonical: unparseable event_at ${eventAt}`);
  }
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  // Date only has ms precision — pad to microseconds.
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}T${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(d.getUTCSeconds(), 2)}.${pad(d.getUTCMilliseconds() * 1000, 6)}Z`;
}

function postgresJsonbText(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical: non-finite number");
    }
    // Match JSON / jsonb number text (no trailing .0 for integers).
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map(postgresJsonbText).join(", ")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort(
      compareJsonbKeys,
    );
    if (keys.length === 0) return "{}";
    const parts = keys.map(
      (k) =>
        `${JSON.stringify(k)}: ${postgresJsonbText((value as Record<string, unknown>)[k])}`,
    );
    return `{${parts.join(", ")}}`;
  }
  throw new Error(`canonical: unsupported type ${typeof value}`);
}

export function composeCanonicalPayload(
  ev: LifecycleEventForCanonicalization,
): string {
  const assertions = [...(ev.assertions_covered ?? [])].sort();
  const obj: Record<string, unknown> = {
    event_kind: ev.event_kind,
    event_at: formatEventAtForCanonical(ev.event_at),
    schema_version: ev.schema_version,
    pilot_slot_id: ev.pilot_slot_id,
    from_status: ev.from_status,
    to_status: ev.to_status,
    classification_hint: ev.classification_hint,
    company_id: ev.company_id,
    firm_id: ev.firm_id,
    actor_kind: ev.actor_kind,
    actor_user_id: ev.actor_user_id,
    actor_via: ev.actor_via,
    assertions_covered: assertions,
    evidence_refs: ev.evidence_refs ?? [],
    reason_code: ev.reason_code,
    reason_text: ev.reason_text,
    payload: ev.payload ?? {},
  };
  return postgresJsonbText(obj);
}
