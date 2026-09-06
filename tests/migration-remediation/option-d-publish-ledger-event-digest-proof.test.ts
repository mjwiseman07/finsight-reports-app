import { describe, expect, it } from "vitest";
import {
  stripQualifiedDigestCalls,
  hasUnqualifiedDigestCall,
  analyzePublishLedgerEventDigestDefinition,
} from "../../scripts/migration-remediation/option-d-publish-ledger-event-digest-proof.js";

describe("option-d publish_ledger_event digest proof analyzer", () => {
  it("does not treat extensions.digest as unqualified digest(", () => {
    const body = `
CREATE FUNCTION public.publish_ledger_event(...)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $fn$
BEGIN
  v_new_hash := encode(
    extensions.digest(v_hash_input::bytea, 'sha256'::text),
    'hex'
  );
END;
$fn$;
`;
    expect(hasUnqualifiedDigestCall(body)).toBe(false);
    expect(stripQualifiedDigestCalls(body)).not.toMatch(/\bdigest\s*\(/i);
    // Regression: sentinel EXT_DIGEST would false-positive — strip must remove, not rename.
    expect(stripQualifiedDigestCalls("extensions.digest(")).toBe("");
    const proof = analyzePublishLedgerEventDigestDefinition(body, [
      "search_path=public, pg_temp",
    ]);
    expect(proof.ok).toBe(true);
    expect(proof.hasExtensionsDigest).toBe(true);
    expect(proof.hasTypedSha256).toBe(true);
    expect(proof.hasUnqualifiedDigest).toBe(false);
    expect(proof.searchPathPinned).toBe(true);
  });

  it("detects true unqualified digest( beside qualified calls", () => {
    const body = `
SET search_path = public, pg_temp
extensions.digest(x::bytea, 'sha256'::text);
digest(y::bytea, 'sha256');
`;
    expect(hasUnqualifiedDigestCall(body)).toBe(true);
    const proof = analyzePublishLedgerEventDigestDefinition(body, null);
    expect(proof.ok).toBe(false);
    expect(proof.hasUnqualifiedDigest).toBe(true);
    expect(proof.hasExtensionsDigest).toBe(true);
  });

  it("requires typed sha256 and locked search_path", () => {
    const missingType = `
SET search_path = public, pg_temp
extensions.digest(v_hash_input::bytea, 'sha256');
`;
    expect(analyzePublishLedgerEventDigestDefinition(missingType, null).ok).toBe(
      false,
    );

    const missingPath = `
extensions.digest(v_hash_input::bytea, 'sha256'::text);
`;
    expect(
      analyzePublishLedgerEventDigestDefinition(missingPath, ["search_path=public"])
        .ok,
    ).toBe(false);
  });
});
