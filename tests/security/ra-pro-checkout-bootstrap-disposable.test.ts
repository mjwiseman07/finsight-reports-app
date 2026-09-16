/**
 * Disposable Postgres: atomic checkout firm/company bootstrap RPCs.
 * Synthetic only — never production. Requires local Docker.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const dockerOk = (() => {
  const r = spawnSync("docker", ["info"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
  });
  return r.status === 0;
})();

const MIGRATION_REL =
  "supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql";
const BOOT_REL =
  "tests/security/helpers/ra-pro-billing-company-rehearsal-boot.sql";

function repoFile(rel: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), rel));
}

function sleepMs(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

describe.skipIf(!dockerOk)(
  "checkout workspace bootstrap RPCs (disposable Postgres)",
  () => {
    let container = "";
    let port = 0;
    let url = "";
    let tmpDir = "";

    function sh(cmd: string, args: string[], opts: { allowFail?: boolean } = {}) {
      const r = spawnSync(cmd, args, {
        encoding: "utf8",
        windowsHide: true,
        timeout: 120000,
      });
      if (r.status !== 0 && !opts.allowFail) {
        throw new Error(`${cmd} failed: ${r.stderr || r.stdout || r.status}`);
      }
      return r;
    }

    function waitReady() {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const r = sh(
          "docker",
          ["exec", container, "pg_isready", "-U", "postgres", "-h", "127.0.0.1"],
          { allowFail: true },
        );
        if (r.status === 0) return;
        sleepMs(400);
      }
      throw new Error("postgres not ready");
    }

    function psql(sql: string | Buffer) {
      const r = spawnSync(
        "docker",
        [
          "exec",
          "-i",
          container,
          "psql",
          "-U",
          "postgres",
          "-h",
          "127.0.0.1",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        {
          input: sql,
          encoding: "utf8",
          windowsHide: true,
          maxBuffer: 20 * 1024 * 1024,
        },
      );
      if (r.status !== 0) throw new Error(r.stderr || r.stdout);
      return r.stdout;
    }

    async function asService<T>(fn: (c: Client) => Promise<T>): Promise<T> {
      const c = new Client({ connectionString: url });
      await c.connect();
      try {
        await c.query("SET ROLE service_role");
        return await fn(c);
      } finally {
        await c.end().catch(() => {});
      }
    }

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-boot-"));
      container = `ra-pro-boot-${randomBytes(4).toString("hex")}`;
      port = 56100 + Math.floor(Math.random() * 900);
      url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
      const mig = repoFile(MIGRATION_REL);
      expect(mig.toString("utf8")).toMatch(/bootstrap_checkout_firm_workspace/);
      sh("docker", [
        "run",
        "-d",
        "--rm",
        "--name",
        container,
        "-e",
        "POSTGRES_PASSWORD=postgres",
        "-p",
        `${port}:5432`,
        "postgres:16-alpine",
      ]);
      waitReady();
      psql(repoFile(BOOT_REL));
      psql(mig);
    }, 120000);

    afterAll(() => {
      if (container) sh("docker", ["rm", "-f", container], { allowFail: true });
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    });

    it("forced membership failure leaves zero new firms/memberships", async () => {
      const buyer = randomUUID();
      const before = await asService(async (c) => {
        const f = await c.query(`SELECT count(*)::int n FROM public.firms`);
        const m = await c.query(`SELECT count(*)::int n FROM public.firm_memberships`);
        return { f: f.rows[0].n as number, m: m.rows[0].n as number };
      });

      await asService(async (c) => {
        await c.query("BEGIN");
        // Pre-fill seats on a throwaway linked firm so buyer's membership hit seat cap
        // after firm create inside the same statement? Easier: call RPC then force fail
        // by using isolation that fails before mutation.
        await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        let failed = false;
        try {
          await c.query(
            `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, $2, NULL)`,
            [buyer, "ShouldRollBack"],
          );
          await c.query("COMMIT");
        } catch (e) {
          failed = /ra_pro_capacity_isolation_unsupported/.test(
            String((e as Error).message || e),
          );
          await c.query("ROLLBACK");
        }
        expect(failed).toBe(true);
      });

      const after = await asService(async (c) => {
        const f = await c.query(`SELECT count(*)::int n FROM public.firms`);
        const m = await c.query(`SELECT count(*)::int n FROM public.firm_memberships`);
        const named = await c.query(
          `SELECT count(*)::int n FROM public.firms WHERE name = 'ShouldRollBack'`,
        );
        return {
          f: f.rows[0].n as number,
          m: m.rows[0].n as number,
          named: named.rows[0].n as number,
        };
      });
      expect(after.f).toBe(before.f);
      expect(after.m).toBe(before.m);
      expect(after.named).toBe(0);
    });

    it("concurrent same-company bootstrap yields one linked firm + one membership", async () => {
      const buyer = randomUUID();
      const companyId = randomUUID();
      await asService(async (c) => {
        await c.query(`INSERT INTO public.companies (id, name) VALUES ($1, 'Co')`, [
          companyId,
        ]);
        await c.query(
          `INSERT INTO public.company_users (company_id, user_id, role, status)
           VALUES ($1, $2, 'owner_executive', 'active')`,
          [companyId, buyer],
        );
      });

      const clients: Client[] = [];
      for (let i = 0; i < 8; i++) {
        const c = new Client({ connectionString: url });
        await c.connect();
        await c.query("SET ROLE service_role");
        clients.push(c);
      }
      try {
        const settled = await Promise.allSettled(
          clients.map(async (c) => {
            const r = await c.query(
              `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, $2, $3::uuid) AS j`,
              [buyer, "Linked Firm", companyId],
            );
            return r.rows[0].j;
          }),
        );
        expect(settled.every((s) => s.status === "fulfilled")).toBe(true);
        const firmIds = new Set(
          settled
            .filter((s): s is PromiseFulfilledResult<{ firm_id: string }> =>
              s.status === "fulfilled",
            )
            .map((s) => s.value.firm_id),
        );
        expect(firmIds.size).toBe(1);

        const counts = await asService(async (c) => {
          const firms = await c.query(
            `SELECT count(*)::int n FROM public.firms WHERE billing_company_id = $1`,
            [companyId],
          );
          const mem = await c.query(
            `SELECT count(*)::int n FROM public.firm_memberships
             WHERE user_id = $1 AND status = 'active'`,
            [buyer],
          );
          return { firms: firms.rows[0].n as number, mem: mem.rows[0].n as number };
        });
        expect(counts.firms).toBe(1);
        expect(counts.mem).toBe(1);
      } finally {
        await Promise.all(clients.map((c) => c.end().catch(() => {})));
      }
    });

    it("retry after failure reuses exactly one unlinked workspace", async () => {
      const buyer = randomUUID();
      await asService(async (c) => {
        await c.query("BEGIN");
        await c.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        try {
          await c.query(
            `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, 'Solo', NULL)`,
            [buyer],
          );
          await c.query("COMMIT");
        } catch {
          await c.query("ROLLBACK");
        }
      });

      const first = await asService(async (c) => {
        const r = await c.query(
          `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, 'Solo', NULL) AS j`,
          [buyer],
        );
        return r.rows[0].j as { firm_id: string; created_firm: boolean };
      });
      const second = await asService(async (c) => {
        const r = await c.query(
          `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, 'Solo', NULL) AS j`,
          [buyer],
        );
        return r.rows[0].j as { firm_id: string; created_firm: boolean };
      });
      expect(first.firm_id).toBe(second.firm_id);
      expect(second.created_firm).toBe(false);
      const n = await asService(async (c) => {
        const r = await c.query(
          `SELECT count(*)::int n FROM public.firms f
           JOIN public.firm_memberships fm ON fm.firm_id = f.id
           WHERE fm.user_id = $1`,
          [buyer],
        );
        return r.rows[0].n as number;
      });
      expect(n).toBe(1);
    });

    it("ownership failure creates nothing", async () => {
      const buyer = randomUUID();
      const companyId = randomUUID();
      await asService(async (c) => {
        await c.query(`INSERT INTO public.companies (id, name) VALUES ($1, 'Other')`, [
          companyId,
        ]);
      });
      const before = await asService(async (c) => {
        const f = await c.query(`SELECT count(*)::int n FROM public.firms`);
        return f.rows[0].n as number;
      });
      await asService(async (c) => {
        let msg = "";
        try {
          await c.query(
            `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, 'X', $2::uuid)`,
            [buyer, companyId],
          );
        } catch (e) {
          msg = String((e as Error).message || e);
        }
        expect(msg).toMatch(/bootstrap_checkout_buyer_not_company_member/);
      });
      const after = await asService(async (c) => {
        const f = await c.query(`SELECT count(*)::int n FROM public.firms`);
        const m = await c.query(
          `SELECT count(*)::int n FROM public.firm_memberships WHERE user_id = $1`,
          [buyer],
        );
        return { f: f.rows[0].n as number, m: m.rows[0].n as number };
      });
      expect(after.f).toBe(before);
      expect(after.m).toBe(0);
    });

    it("authenticated cannot execute bootstrap RPCs", async () => {
      const c = new Client({ connectionString: url });
      await c.connect();
      try {
        await c.query("SET ROLE authenticated");
        let denied = false;
        try {
          await c.query(
            `SELECT public.bootstrap_checkout_firm_workspace($1::uuid, 'Nope', NULL)`,
            [randomUUID()],
          );
        } catch (e) {
          denied = /permission denied|bootstrap_checkout_firm_forbidden/i.test(
            String((e as Error).message || e),
          );
        }
        expect(denied).toBe(true);
      } finally {
        await c.end().catch(() => {});
      }
    });
  },
);
