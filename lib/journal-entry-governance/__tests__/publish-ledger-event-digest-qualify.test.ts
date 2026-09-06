import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const ORIGIN = path.join(
  ROOT,
  "supabase/migrations/20260717050000_d65_p2_block5_anomaly_score_merkle.sql",
);
const Q8B = path.join(
  ROOT,
  "supabase/migrations/20260718190000_q8b_function_search_path_lockdown.sql",
);
const REMEDIATION = path.join(
  ROOT,
  "supabase/migrations/20260906184500_publish_ledger_event_extensions_digest_qualify.sql",
);

function read(p: string) {
  return fs.readFileSync(p, "utf8");
}

describe("publish_ledger_event pgcrypto digest qualification (static)", () => {
  it("origin migration uses unqualified digest with unknown literal (defect provenance)", () => {
    const src = read(ORIGIN);
    expect(src).toMatch(
      /v_new_hash\s*:=\s*encode\(\s*digest\(\s*v_hash_input::bytea\s*,\s*'sha256'\s*\)\s*,\s*'hex'\s*\)/,
    );
    expect(src).not.toMatch(/extensions\.digest/);
  });

  it("Q8b locks publish_ledger_event search_path to public, pg_temp (excludes extensions)", () => {
    const src = read(Q8B);
    expect(src).toContain(
      "public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text)",
    );
    expect(src).toMatch(
      /ALTER FUNCTION %s SET search_path = public, pg_temp/,
    );
    expect(src).not.toMatch(/search_path = public, extensions/);
  });

  it("forward remediation qualifies extensions.digest(bytea, text) without weakening search_path", () => {
    const src = read(REMEDIATION);
    expect(src).toMatch(
      /extensions\.digest\(\s*v_hash_input::bytea\s*,\s*'sha256'::text\s*\)/,
    );
    // Hash input cast preserved for Patent #6 continuity (no convert_to swap).
    expect(src).toContain("v_hash_input::bytea");
    expect(src).toMatch(/SET search_path = public, pg_temp/);
    expect(src).not.toMatch(/SET search_path = public, extensions/);
    // No fake public wrapper / duplicate digest.
    expect(src).not.toMatch(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.digest\b/i,
    );
    // Unqualified digest call must not remain in the remediated body.
    // Strip qualified calls first so substring "digest(" inside extensions.digest
    // cannot false-match (EXT_DIGEST / lookbehind-i pitfalls).
    const body = src.slice(src.indexOf("AS $fn$"), src.indexOf("$fn$;"));
    const withoutQualified = body.replace(/extensions\.digest\s*\(/gi, "");
    expect(withoutQualified).not.toMatch(/\bdigest\s*\(/i);
    expect(body).toMatch(/extensions\.digest\s*\(/);
  });

  it("fail-closed contract: remediation depends on extensions.digest existing", () => {
    const src = read(REMEDIATION);
    expect(src).toMatch(/extensions\.digest/);
    expect(src.toLowerCase()).toMatch(/fail-closed/);
    // Must not create extension in public as a workaround.
    expect(src).not.toMatch(
      /CREATE\s+EXTENSION\s+.*pgcrypto\s+WITH\s+SCHEMA\s+public/i,
    );
  });
});
