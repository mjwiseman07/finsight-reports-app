/**
 * Phase MC-2e.4 fixture — mirrors the module-scoped parseNumber function
 * in `app/upload/page.tsx`. Kept intentionally colocated with the test
 * suite so drift is visible at review time.
 *
 * If you edit parseNumber in `app/upload/page.tsx`, you MUST make the
 * identical edit here or the test suite goes stale. This fixture will be
 * retired when parseNumber is moved into a proper `lib/parse/` module or
 * inlined into a shared upload helper (post-Intuit submission).
 */
import { parseAmount } from "@/lib/parse/amount";

// Phase MC-2e.3 (Issue #6, Gap I-3): body replaced with delegating wrapper
// around the shared locale-aware parser at lib/parse/amount. Public signature
// preserved: (value: unknown) => number | null. All 49 downstream call sites
// in this file are unchanged.
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).replace(/^=/, "").trim();
  if (!raw) return null;
  // Collapse inner whitespace (ASCII space, NBSP U+00A0, NNBSP U+202F, thin
  // space U+2009) so fr-FR / fr-CA `1 234,56` reduces to `1234,56` and can
  // be interpreted by the shared parser's heuristic mixed-punct branch.
  const collapsed = raw.replace(/[\s\u00a0\u202f\u2009]+/g, "");
  return parseAmount(collapsed);
}
