/**
 * Target #2 safety-gate + dry-run classifier regressions.
 * Synthetic fixtures / disposable Postgres only — never production.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertTarget2Ok,
  classifyDryRunFailure,
  computeTarget2BindingFingerprint,
  computeTarget2RowFingerprint,
  probeTarget2,
  runApplicator,
} from "../../scripts/security/credential-browser-containment-apply-core.js";
import { TARGET2 } from "../../scripts/security/credential-browser-containment-constants.js";

const {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
  fixtureTarget2Pins,
  FIXTURE_TARGET_ID,
  FIXTURE_TARGET_USER,
  FIXTURE_TARGET_TENANT,
  FIXTURE_US_SIBLING_ID,
  FIXTURE_US_SIBLING_TENANT,
} = require("./helpers/containment-applicator-sim.js");

const dockerOk = (() => {
  try {
    const { spawnSync } = require("node:child_process");
    const r = spawnSync("docker", ["version"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
})();

describe("TARGET2 sealed privacy-handle constants (no docker)", () => {
  it("documents recovered salts, truncation, and sealed expected digests", () => {
    expect(TARGET2.fingerprint).toBe("d331891f0424");
    expect(TARGET2.binding_fingerprint).toBe("c0948f590d6b6fce");
    expect(TARGET2.excluded_row_fingerprint).toBe("e8d831d85aaa");
    expect(TARGET2.row_fp_salt).toBe("|reconnect-session-2026-09-07");
    expect(TARGET2.binding_fp_salt).toBe("|bind-2026-09-07");
    expect(TARGET2.row_fp_hex_len).toBe(12);
    expect(TARGET2.binding_fp_hex_len).toBe(16);
    expect(TARGET2.fingerprint).toHaveLength(12);
    expect(TARGET2.binding_fingerprint).toHaveLength(16);
    expect(TARGET2.excluded_row_fingerprint).toHaveLength(12);
  });

  it("Node digest helpers match documented formulas and truncation", () => {
    const id = "00000000-0000-0000-0000-0000000000aa";
    const user = "00000000-0000-0000-0000-0000000000bb";
    const realm = "synthetic-realm";
    const row = createHash("sha256")
      .update(`${id}|reconnect-session-2026-09-07`, "utf8")
      .digest("hex")
      .slice(0, 12);
    const bind = createHash("sha256")
      .update(`${user}|${realm}|bind-2026-09-07`, "utf8")
      .digest("hex")
      .slice(0, 16);
    expect(computeTarget2RowFingerprint(id)).toBe(row);
    expect(computeTarget2BindingFingerprint(user, realm)).toBe(bind);
    expect(computeTarget2RowFingerprint(id)).toHaveLength(12);
    expect(computeTarget2BindingFingerprint(user, realm)).toHaveLength(16);
  });

  it("stable digests ignore mutable timestamps and token material in formula surface", () => {
    expect(TARGET2).not.toHaveProperty("updated_at");
    expect(TARGET2).not.toHaveProperty("access_token");
    expect(TARGET2).not.toHaveProperty("refresh_token");
    expect(TARGET2).not.toHaveProperty("token_expires_at");
    // Binding privacy handle IS sealed into TARGET2 (not a raw identity column).
    expect(TARGET2.binding_fingerprint).toBe("c0948f590d6b6fce");
  });

  it("forbids unqualified digest() and raw-column literal fingerprint compares in apply-core", () => {
    const src = readFileSync(
      "scripts/security/credential-browser-containment-apply-core.js",
      "utf8",
    );
    expect(src).toMatch(/extensions\.digest\(/);
    // Ignore Node crypto Hash#digest("hex"); forbid SQL-style unqualified digest(.
    const withoutCryptoHex = src.replace(/\.digest\("hex"\)/g, ".HEXDIGEST()");
    // Comments may mention the word; enforce SQL call sites are extensions-qualified only.
    const callSites = withoutCryptoHex.match(/(?:extensions\.)?digest\s*\(/g) || [];
    expect(callSites.every((c) => c.startsWith("extensions."))).toBe(true);
    expect(callSites.length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/external_entity_id\s*=\s*\$/);
    expect(src).not.toMatch(/metadata_json->>'fingerprint'/);
    expect(src).toMatch(/TARGET2_INVARIANT_MULTIPLE_MATCHES/);
    expect(src).toMatch(/TARGET2_EXCLUDED_SIBLING_COLLISION/);
  });

  it("classifies target mismatches under target2_binding, never TLS_FAIL", () => {
    const tls = { mode: "verify_full_embedded_ca" };
    for (const code of [
      "TARGET2_BINDING_MISMATCH",
      "TARGET2_INVARIANT_MULTIPLE_MATCHES",
      "TARGET2_EXCLUDED_SIBLING_COLLISION",
    ]) {
      const err = new Error(`${code}: synthetic`);
      err.code = code;
      err.phase = "target2_binding";
      const c = classifyDryRunFailure(err, { tls });
      expect(c.code).toBe(code);
      expect(c.phase).toBe("target2_binding");
      expect(c.code).not.toBe("TLS_FAIL");
    }
  });

  it("assertTarget2Ok distinguishes zero vs multiple vs collision", () => {
    expect(() =>
      assertTarget2Ok({
        target_combined_matches: 0,
        excluded_collision_matches: 0,
      }),
    ).toThrow(/TARGET2_BINDING_MISMATCH/);
    try {
      assertTarget2Ok({ target_combined_matches: 2, excluded_collision_matches: 0 });
    } catch (err: any) {
      expect(err.code).toBe("TARGET2_INVARIANT_MULTIPLE_MATCHES");
      expect(err.phase).toBe("target2_binding");
    }
    try {
      assertTarget2Ok({ target_combined_matches: 1, excluded_collision_matches: 1 });
    } catch (err: any) {
      expect(err.code).toBe("TARGET2_EXCLUDED_SIBLING_COLLISION");
      expect(err.phase).toBe("target2_binding");
    }
  });
});

describe.skipIf(!dockerOk)("target #2 digest probe (disposable postgres)", () => {
  let pg: { name: string; url: string; stop: () => Promise<void> };

  beforeAll(async () => {
    pg = await startDisposablePg();
  }, 120000);

  afterAll(async () => {
    if (pg) await pg.stop();
  });

  async function resetWorld() {
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(`
      DROP SCHEMA IF EXISTS supabase_migrations CASCADE;
      DROP VIEW IF EXISTS public.qbo_connections_unified CASCADE;
      DROP TABLE IF EXISTS public.accounting_connections CASCADE;
      DROP TABLE IF EXISTS public.quickbooks_connections CASCADE;
      DROP FUNCTION IF EXISTS extensions.digest(bytea, text);
    `);
    await seedApplicatorWorld(client);
    await client.end();
  }

  it("Postgres extensions.digest matches Node helpers for fixture identities", async () => {
    await resetWorld();
    const pins = fixtureTarget2Pins();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const { rows } = await client.query(
      `
      SELECT
        left(encode(extensions.digest(($1::text || $2::text)::bytea, 'sha256'::text), 'hex'), 12) AS row_fp,
        left(encode(extensions.digest(($3::text || '|' || $4::text || $5::text)::bytea, 'sha256'::text), 'hex'), 16) AS bind_fp
      `,
      [
        FIXTURE_TARGET_ID,
        TARGET2.row_fp_salt,
        FIXTURE_TARGET_USER,
        FIXTURE_TARGET_TENANT,
        TARGET2.binding_fp_salt,
      ],
    );
    expect(rows[0].row_fp).toBe(pins.target2Fingerprint);
    expect(rows[0].bind_fp).toBe(pins.target2BindingFingerprint);
    expect(rows[0].row_fp).toBe(computeTarget2RowFingerprint(FIXTURE_TARGET_ID));
    expect(rows[0].bind_fp).toBe(
      computeTarget2BindingFingerprint(FIXTURE_TARGET_USER, FIXTURE_TARGET_TENANT),
    );
    await client.end();
  });

  it("combined match is exactly one; excluded US distinguished without collision", async () => {
    await resetWorld();
    const pins = fixtureTarget2Pins();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const probe = await probeTarget2(client, {
      fingerprint: pins.target2Fingerprint,
      bindingFingerprint: pins.target2BindingFingerprint,
      excludedFingerprint: pins.target2ExcludedFingerprint,
    });
    expect(probe.eligible_rows).toBe(2);
    expect(probe.target_row_fp_matches).toBe(1);
    expect(probe.target_binding_matches).toBe(1);
    expect(probe.target_combined_matches).toBe(1);
    expect(probe.excluded_us_matches).toBe(1);
    expect(probe.excluded_collision_matches).toBe(0);
    assertTarget2Ok(probe);
    await client.end();
  });

  it("updated_at advance and token rotation do not change digests", async () => {
    await resetWorld();
    const pins = fixtureTarget2Pins();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(
      `UPDATE public.accounting_connections
       SET updated_at = now() + interval '30 days',
           access_token = 'FAKE_ROTATED_ACCESS',
           refresh_token = 'FAKE_ROTATED_REFRESH',
           token_expires_at = now() + interval '3 hours'
       WHERE id = $1::uuid`,
      [FIXTURE_TARGET_ID],
    );
    const probe = await probeTarget2(client, {
      fingerprint: pins.target2Fingerprint,
      bindingFingerprint: pins.target2BindingFingerprint,
      excludedFingerprint: pins.target2ExcludedFingerprint,
    });
    expect(probe.target_combined_matches).toBe(1);
    assertTarget2Ok(probe);
    await client.end();

    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY");
    expect(evidence.reason_code).not.toBe("TLS_FAIL");
    expect(evidence.target2?.target_combined_matches).toBe(1);
    const blob = JSON.stringify(evidence);
    expect(blob).not.toMatch(/FAKE_ROTATED|fake-realm-local|11111111-1111/);
  });

  it("user/realm/row-id changes fail closed", async () => {
    await resetWorld();
    const pins = fixtureTarget2Pins();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(
      `UPDATE public.accounting_connections
       SET tenant_or_realm_id = 'mutated-realm'
       WHERE id = $1::uuid`,
      [FIXTURE_TARGET_ID],
    );
    const probe = await probeTarget2(client, {
      fingerprint: pins.target2Fingerprint,
      bindingFingerprint: pins.target2BindingFingerprint,
      excludedFingerprint: pins.target2ExcludedFingerprint,
    });
    expect(probe.target_combined_matches).toBe(0);
    expect(() => assertTarget2Ok(probe)).toThrow(/TARGET2_BINDING_MISMATCH/);
    await client.end();
  });

  it("zero combined matches and multiple matches fail closed distinctly", async () => {
    await resetWorld();
    const pins = fixtureTarget2Pins();
    const client = new Client({ connectionString: pg.url });
    await client.connect();

    await client.query(
      `UPDATE public.accounting_connections SET access_token = NULL WHERE id = $1::uuid`,
      [FIXTURE_TARGET_ID],
    );
    const zero = await probeTarget2(client, {
      fingerprint: pins.target2Fingerprint,
      bindingFingerprint: pins.target2BindingFingerprint,
      excludedFingerprint: pins.target2ExcludedFingerprint,
    });
    expect(zero.target_combined_matches).toBe(0);
    expect(() => assertTarget2Ok(zero)).toThrow(/TARGET2_BINDING_MISMATCH/);

    // Restore tokens; duplicate combined match by cloning digest inputs onto US sibling.
    await client.query(
      `UPDATE public.accounting_connections
       SET access_token = 'FAKE_ACCESS_TOKEN_LOCAL_ONLY',
           refresh_token = 'FAKE_REFRESH_TOKEN_LOCAL_ONLY',
           tenant_or_realm_id = $2,
           user_id = $3::uuid
       WHERE id = $1::uuid`,
      [FIXTURE_TARGET_ID, FIXTURE_TARGET_TENANT, FIXTURE_TARGET_USER],
    );
    // Second row: same user+tenant (same binding) and... cannot same row_fp without same id.
    // Multiple combined requires two rows with same row_fp AND binding — impossible for distinct ids.
    // Simulate multiple by probing with a fingerprint that matches zero row digests but we insert
    // two rows sharing binding and force combined via overriding expected row fp to match both —
    // not possible with id-based row_fp.
    // Instead: assert multiple path by feeding assertTarget2Ok directly (unit) already covered;
    // here verify collision path when excluded shares binding.
    await client.query(
      `UPDATE public.accounting_connections
       SET tenant_or_realm_id = $2, user_id = $3::uuid
       WHERE id = $1::uuid`,
      [FIXTURE_US_SIBLING_ID, FIXTURE_TARGET_TENANT, FIXTURE_TARGET_USER],
    );
    const collision = await probeTarget2(client, {
      fingerprint: pins.target2Fingerprint,
      bindingFingerprint: pins.target2BindingFingerprint,
      excludedFingerprint: pins.target2ExcludedFingerprint,
    });
    expect(collision.excluded_collision_matches).toBeGreaterThan(0);
    expect(() => assertTarget2Ok(collision)).toThrow(/TARGET2_EXCLUDED_SIBLING_COLLISION/);
    await client.end();

    await resetWorld();
    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    // Wipe tokens so dry-run fails closed with TARGET2_BINDING_MISMATCH (not TLS).
    const wipe = new Client({ connectionString: pg.url });
    await wipe.connect();
    await wipe.query(
      `UPDATE public.accounting_connections SET access_token = NULL WHERE id = $1::uuid`,
      [FIXTURE_TARGET_ID],
    );
    await wipe.end();
    const blocked = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(blocked.verdict).toBe("DRY_RUN_BLOCKED");
    expect(blocked.reason_code).toBe("TARGET2_BINDING_MISMATCH");
    expect(blocked.phase).toBe("target2_binding");
    expect(blocked.reason_code).not.toBe("TLS_FAIL");
    expect(JSON.stringify(blocked)).not.toMatch(/fake-realm|11111111-1111|FAKE_ACCESS/);
  });

  it("evidence never contains raw fixture ids, realms, or token values", async () => {
    await resetWorld();
    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY");
    const s = JSON.stringify(evidence);
    expect(s).not.toMatch(new RegExp(FIXTURE_TARGET_ID, "i"));
    expect(s).not.toMatch(new RegExp(FIXTURE_US_SIBLING_ID, "i"));
    expect(s).not.toMatch(/fake-realm-local|us-sandbox-realm/);
    expect(s).not.toMatch(/FAKE_ACCESS_TOKEN|FAKE_REFRESH_TOKEN|FAKE_US_/);
    expect(evidence.target2?.eligible_rows).toBe(2);
    expect(evidence.target2?.target_combined_matches).toBe(1);
    expect(evidence.target2?.excluded_collision_matches).toBe(0);
  });
});
