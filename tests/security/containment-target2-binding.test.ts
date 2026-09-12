/**
 * Target #2 safety-gate + dry-run classifier regressions.
 * Synthetic fixtures / disposable Postgres only — never production.
 */
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertTarget2Ok,
  classifyDryRunFailure,
  probeTarget2,
  runApplicator,
} from "../../scripts/security/credential-browser-containment-apply-core.js";
import { TARGET2 } from "../../scripts/security/credential-browser-containment-constants.js";

const {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
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

describe("classifyDryRunFailure (no docker)", () => {
  it("classifies TARGET2_BINDING_MISMATCH with precise non-TLS reason/phase", () => {
    const err = new Error(
      "TARGET2_BINDING_MISMATCH: expected exactly 1 sandbox/connected fingerprint row, got 0",
    );
    // Mirrors the production dry-run misclassification path: TLS evidence present,
    // plain Error without .code, previously forced through classifyTlsError → TLS_FAIL.
    const classified = classifyDryRunFailure(err, {
      tls: { mode: "verify_full_embedded_ca", hostname_verification: "enabled" },
    });
    expect(classified.code).toBe("TARGET2_BINDING_MISMATCH");
    expect(classified.phase).toBe("target2_binding");
    expect(classified.code).not.toBe("TLS_FAIL");
  });

  it("assertTarget2Ok stamps code + phase; never TLS_FAIL", () => {
    expect(() => assertTarget2Ok({ matching_rows: 0, fingerprint: TARGET2.fingerprint })).toThrow(
      /TARGET2_BINDING_MISMATCH/,
    );
    try {
      assertTarget2Ok({ matching_rows: 2, fingerprint: TARGET2.fingerprint });
    } catch (err: any) {
      expect(err.code).toBe("TARGET2_BINDING_MISMATCH");
      expect(err.phase).toBe("target2_binding");
      const classified = classifyDryRunFailure(err, {
        tls: { mode: "verify_full_embedded_ca" },
      });
      expect(classified.code).toBe("TARGET2_BINDING_MISMATCH");
      expect(classified.phase).toBe("target2_binding");
    }
  });

  it("stable binding surface excludes mutable timestamps and token-derived state", () => {
    const keys = Object.keys(TARGET2).sort();
    expect(keys).toEqual([
      "fingerprint",
      "provider",
      "provider_environment",
      "status",
    ]);
    expect(TARGET2).not.toHaveProperty("updated_at");
    expect(TARGET2).not.toHaveProperty("access_token");
    expect(TARGET2).not.toHaveProperty("refresh_token");
    expect(TARGET2).not.toHaveProperty("credentials_cleared_at");
    expect(TARGET2).not.toHaveProperty("token_expires_at");
    // Ops-side binding handle is not an applicator constant.
    expect(JSON.stringify(TARGET2)).not.toMatch(/c0948f590d6b6fce/);
  });
});

describe.skipIf(!dockerOk)("target #2 probe (disposable postgres)", () => {
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
    `);
    await seedApplicatorWorld(client);
    await client.end();
  }

  it("authoritative target #2 still matches after updated_at advances", async () => {
    await resetWorld();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(
      `UPDATE public.accounting_connections
       SET updated_at = now() + interval '7 days',
           access_token = 'FAKE_ROTATED_ACCESS',
           refresh_token = 'FAKE_ROTATED_REFRESH',
           token_expires_at = now() + interval '2 hours'
       WHERE external_entity_id = $1`,
      [TARGET2.fingerprint],
    );
    const probe = await probeTarget2(client, TARGET2.fingerprint);
    expect(probe.matching_rows).toBe(1);
    assertTarget2Ok(probe);
    await client.end();

    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY");
    expect(evidence.reason_code).toBe("DRY_RUN_READY");
    expect(evidence.reason_code).not.toBe("TLS_FAIL");
  });

  it("excluded US sandbox sibling never matches the CA fingerprint", async () => {
    await resetWorld();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    // Synthetic US sibling: same env/status/provider, different identity columns + label.
    await client.query(
      `
      INSERT INTO public.accounting_connections (
        id, user_id, provider, provider_environment, status,
        external_entity_id, tenant_or_realm_id, external_entity_name,
        access_token, refresh_token, token_expires_at, metadata_json
      ) VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        'quickbooks', 'sandbox', 'connected',
        'us-sandbox-sibling-id', 'us-sandbox-realm', 'Sandbox Company US excluded',
        'FAKE_US_ACCESS', 'FAKE_US_REFRESH', now() + interval '1 hour',
        '{"fingerprint":"deadbeef0001"}'::jsonb
      )
      `,
    );
    const probe = await probeTarget2(client, TARGET2.fingerprint);
    expect(probe.matching_rows).toBe(1);
    const { rows } = await client.query(
      `SELECT count(*)::int AS c FROM public.accounting_connections
       WHERE provider = 'quickbooks' AND provider_environment = 'sandbox' AND status = 'connected'`,
    );
    expect(rows[0].c).toBe(2);
    await client.end();
  });

  it("zero rows and multiple rows fail closed with TARGET2_BINDING_MISMATCH (not TLS_FAIL)", async () => {
    await resetWorld();
    const client = new Client({ connectionString: pg.url });
    await client.connect();

    await client.query(
      `UPDATE public.accounting_connections SET external_entity_id = 'wrong-fp' WHERE external_entity_id = $1`,
      [TARGET2.fingerprint],
    );
    const zero = await probeTarget2(client, TARGET2.fingerprint);
    expect(zero.matching_rows).toBe(0);
    expect(() => assertTarget2Ok(zero)).toThrow(/got 0/);

    await client.query(
      `
      UPDATE public.accounting_connections
      SET external_entity_id = $1, provider_environment = $2, status = $3, provider = 'quickbooks'
      WHERE id = '11111111-1111-1111-1111-111111111111'
      `,
      [TARGET2.fingerprint, TARGET2.provider_environment, TARGET2.status],
    );
    await client.query(
      `
      INSERT INTO public.accounting_connections (
        id, user_id, provider, provider_environment, status,
        external_entity_id, access_token, refresh_token, token_expires_at
      ) VALUES (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'quickbooks', $2, $3, $1,
        'FAKE_DUP_ACCESS', 'FAKE_DUP_REFRESH', now() + interval '1 hour'
      )
      `,
      [TARGET2.fingerprint, TARGET2.provider_environment, TARGET2.status],
    );
    const multi = await probeTarget2(client, TARGET2.fingerprint);
    expect(multi.matching_rows).toBe(2);
    expect(() => assertTarget2Ok(multi)).toThrow(/got 2/);
    await client.end();

    // Dry-run with zero match: reason must be TARGET2_BINDING_MISMATCH, not TLS_FAIL.
    await clientConnectWipeTarget(pg.url);
    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_BLOCKED");
    expect(evidence.reason_code).toBe("TARGET2_BINDING_MISMATCH");
    expect(evidence.error_code).toBe("TARGET2_BINDING_MISMATCH");
    expect(evidence.phase).toBe("target2_binding");
    expect(evidence.reason_code).not.toBe("TLS_FAIL");
    expect(String(evidence.error)).toMatch(/TARGET2_BINDING_MISMATCH/);
  });

  it("mutable timestamps and secret/token values do not define the stable binding", async () => {
    await resetWorld();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const before = await probeTarget2(client, TARGET2.fingerprint);
    expect(before.matching_rows).toBe(1);

    await client.query(
      `UPDATE public.accounting_connections
       SET
         updated_at = '2099-01-01T00:00:00Z',
         created_at = '2000-01-01T00:00:00Z',
         access_token = 'FAKE_OTHER_ACCESS',
         refresh_token = 'FAKE_OTHER_REFRESH',
         token_expires_at = '2099-06-01T00:00:00Z',
         credentials_cleared_at = NULL,
         external_entity_name = 'Sandbox Company CA b483 renamed'
       WHERE external_entity_id = $1`,
      [TARGET2.fingerprint],
    );
    const after = await probeTarget2(client, TARGET2.fingerprint);
    expect(after.matching_rows).toBe(1);
    // Clearing tokens does not change matching_rows (token presence is observational only).
    await client.query(
      `UPDATE public.accounting_connections
       SET access_token = NULL, refresh_token = NULL
       WHERE external_entity_id = $1`,
      [TARGET2.fingerprint],
    );
    const cleared = await probeTarget2(client, TARGET2.fingerprint);
    expect(cleared.matching_rows).toBe(1);
    expect(cleared.has_token_presence_boolean).toBe(false);
    await client.end();
  });
});

async function clientConnectWipeTarget(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`
    DROP SCHEMA IF EXISTS supabase_migrations CASCADE;
    DROP VIEW IF EXISTS public.qbo_connections_unified CASCADE;
    DROP TABLE IF EXISTS public.accounting_connections CASCADE;
    DROP TABLE IF EXISTS public.quickbooks_connections CASCADE;
  `);
  await seedApplicatorWorld(client);
  await client.query(
    `UPDATE public.accounting_connections SET external_entity_id = 'no-match', tenant_or_realm_id = 'no-match', metadata_json = '{}'::jsonb`,
  );
  await client.end();
}
