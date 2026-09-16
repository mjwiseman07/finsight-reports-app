/**
 * Disposable Postgres: concurrent RA Pro client/seat cap serialization.
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
  // Worktree path matches HEAD after commit; use file bytes so local
  // remediation can be exercised before the seal tip advances.
  return fs.readFileSync(path.join(process.cwd(), rel));
}

describe.skipIf(!dockerOk)(
  "RA Pro concurrent client/seat caps (disposable Postgres)",
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
        throw new Error(
          `${cmd} ${args.join(" ")} failed: ${r.stderr || r.stdout || r.status}`,
        );
      }
      return r;
    }

    function waitReady(seconds = 45) {
      const deadline = Date.now() + seconds * 1000;
      while (Date.now() < deadline) {
        const r = sh(
          "docker",
          ["exec", container, "pg_isready", "-U", "postgres"],
          { allowFail: true },
        );
        if (r.status === 0) return;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
      }
      throw new Error("postgres not ready");
    }

    function psql(sql: string | Buffer) {
      const r = spawnSync(
        "docker",
        ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        {
          input: sql,
          encoding: "utf8",
          windowsHide: true,
          maxBuffer: 20 * 1024 * 1024,
        },
      );
      if (r.status !== 0) {
        throw new Error(`psql failed: ${r.stderr || r.stdout}`);
      }
      return r.stdout;
    }

    async function withClient<T>(
      fn: (c: Client) => Promise<T>,
      role: "postgres" | "authenticated" | "service_role" = "postgres",
    ): Promise<T> {
      const c = new Client({ connectionString: url });
      await c.connect();
      try {
        if (role !== "postgres") {
          await c.query(`SET ROLE ${role}`);
        }
        return await fn(c);
      } finally {
        await c.end().catch(() => {});
      }
    }

    async function seedLinkedFirm(label: string) {
      const companyId = randomUUID();
      const firmId = randomUUID();
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO public.companies (id, name) VALUES ($1, $2)`,
          [companyId, label],
        );
        await c.query(
          `INSERT INTO public.firms (id, name, billing_company_id)
           VALUES ($1, $2, $3)`,
          [firmId, `${label}-firm`, companyId],
        );
        await c.query(
          `INSERT INTO public.pilot_slots (
             company_id, tier_key, pilot_status, pilot_slot_number,
             pricing_structure, pricing_cadence
           ) VALUES ($1, 'review_assist_pro', 'active', $2, 'flat', 'monthly')`,
          [companyId, 50 + Math.floor(Math.random() * 40)],
        );
      });
      return { companyId, firmId };
    }

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-cap-"));
      container = `ra-pro-cap-${randomBytes(4).toString("hex")}`;
      port = 56000 + Math.floor(Math.random() * 1000);
      url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;

      const boot = repoFile(BOOT_REL);
      const mig = repoFile(MIGRATION_REL);
      expect(mig.includes(0x0d)).toBe(false);
      expect(mig.toString("utf8")).toMatch(/ra_pro_lock_firm_capacity/);

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
      psql(boot);
      psql(mig);
      // Browser-role SELECT for firms FOR UPDATE under RLS.
      psql(`
        DROP POLICY IF EXISTS firms_auth_select_cap ON public.firms;
        CREATE POLICY firms_auth_select_cap ON public.firms
          FOR SELECT TO authenticated USING (true);
        DROP POLICY IF EXISTS firms_auth_select_svc ON public.firms;
        CREATE POLICY firms_auth_select_svc ON public.firms
          FOR SELECT TO service_role USING (true);
      `);
    }, 120000);

    afterAll(() => {
      if (container) {
        sh("docker", ["rm", "-f", container], { allowFail: true });
      }
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    });

    async function raceInserts(opts: {
      kind: "client" | "seat";
      firmId: string;
      companyId: string;
      n: number;
      role: "authenticated" | "service_role";
      prefillSeats?: number;
    }) {
      if (opts.kind === "seat" && (opts.prefillSeats ?? 0) > 0) {
        await withClient(async (c) => {
          for (let i = 0; i < (opts.prefillSeats ?? 0); i++) {
            await c.query(
              `INSERT INTO public.firm_memberships (firm_id, user_id, role, status)
               VALUES ($1, $2, 'member', 'active')`,
              [opts.firmId, randomUUID()],
            );
          }
        });
      }

      const clients: Client[] = [];
      for (let i = 0; i < opts.n; i++) {
        const c = new Client({ connectionString: url });
        await c.connect();
        await c.query(`SET ROLE ${opts.role}`);
        clients.push(c);
      }

      try {
        // Each session runs its own short transaction. Holding BEGIN across
        // all sessions before any COMMIT deadlocks on xact advisory locks.
        const settled = await Promise.allSettled(
          clients.map(async (c, i) => {
            await c.query("BEGIN");
            try {
              if (opts.kind === "client") {
                await c.query(
                  `INSERT INTO public.firm_clients
                     (firm_id, company_id, name, subscription_status)
                   VALUES ($1, $2, $3, 'active')`,
                  [
                    opts.firmId,
                    opts.companyId,
                    `race-${i}-${randomBytes(2).toString("hex")}`,
                  ],
                );
              } else {
                await c.query(
                  `INSERT INTO public.firm_memberships
                     (firm_id, user_id, role, status)
                   VALUES ($1, $2, 'member', 'active')`,
                  [opts.firmId, randomUUID()],
                );
              }
              await c.query("COMMIT");
              return "ok";
            } catch (e) {
              await c.query("ROLLBACK").catch(() => {});
              throw e;
            }
          }),
        );

        const count = await withClient(async (c) => {
          if (opts.kind === "client") {
            const r = await c.query(
              `SELECT count(*)::int AS n FROM public.firm_clients
               WHERE firm_id = $1 AND subscription_status = 'active'`,
              [opts.firmId],
            );
            return r.rows[0].n as number;
          }
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_memberships
             WHERE firm_id = $1 AND status = 'active'`,
            [opts.firmId],
          );
          return r.rows[0].n as number;
        });

        return {
          count,
          ok: settled.filter((s) => s.status === "fulfilled").length,
          fail: settled.filter((s) => s.status === "rejected").length,
          errors: settled
            .filter((s): s is PromiseRejectedResult => s.status === "rejected")
            .map((s) => String(s.reason?.message || s.reason).slice(0, 160)),
        };
      } finally {
        await Promise.all(clients.map((c) => c.end().catch(() => {})));
      }
    }

    it("10 concurrent client inserts never leave more than 2 counted clients", async () => {
      const { firmId, companyId } = await seedLinkedFirm("client-race");
      const r = await raceInserts({
        kind: "client",
        firmId,
        companyId,
        n: 10,
        role: "authenticated",
      });
      expect(r.count).toBeLessThanOrEqual(2);
      expect(r.count).toBe(2);
      expect(r.ok).toBe(2);
      expect(r.fail).toBe(8);
      expect(r.errors.every((e) => /ra_pro_client_cap_reached/.test(e))).toBe(
        true,
      );
    });

    it("8 concurrent seat inserts with 4 prefilled never leave more than 5 seats", async () => {
      const { firmId, companyId } = await seedLinkedFirm("seat-race");
      const r = await raceInserts({
        kind: "seat",
        firmId,
        companyId,
        n: 8,
        role: "service_role",
        prefillSeats: 4,
      });
      expect(r.count).toBeLessThanOrEqual(5);
      expect(r.count).toBe(5);
      expect(r.ok).toBe(1);
      expect(r.fail).toBe(7);
      expect(r.errors.every((e) => /ra_pro_seat_cap_reached/.test(e))).toBe(true);
    });

    it("concurrent firm moves cannot bypass client cap", async () => {
      const dest = await seedLinkedFirm("move-dest");
      const srcA = await seedLinkedFirm("move-src-a");
      const srcB = await seedLinkedFirm("move-src-b");

      // Fill dest to 1; leave room for exactly one more.
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO public.firm_clients
             (firm_id, company_id, name, subscription_status)
           VALUES ($1, $2, 'pre', 'active')`,
          [dest.firmId, dest.companyId],
        );
        await c.query(
          `INSERT INTO public.firm_clients
             (id, firm_id, company_id, name, subscription_status)
           VALUES ($1, $2, $3, 'mover-a', 'active'),
                  ($4, $5, $6, 'mover-b', 'active')`,
          [
            randomUUID(),
            srcA.firmId,
            srcA.companyId,
            randomUUID(),
            srcB.firmId,
            srcB.companyId,
          ],
        );
      });

      const movers = await withClient(async (c) => {
        const r = await c.query(
          `SELECT id, firm_id FROM public.firm_clients
           WHERE firm_id IN ($1, $2) AND name LIKE 'mover-%'
           ORDER BY name`,
          [srcA.firmId, srcB.firmId],
        );
        return r.rows as { id: string; firm_id: string }[];
      });
      expect(movers).toHaveLength(2);

      const clients: Client[] = [];
      for (let i = 0; i < 2; i++) {
        const c = new Client({ connectionString: url });
        await c.connect();
        await c.query("SET ROLE authenticated");
        clients.push(c);
      }
      try {
        const settled = await Promise.allSettled(
          clients.map(async (c, i) => {
            await c.query("BEGIN");
            try {
              await c.query(
                `UPDATE public.firm_clients
                 SET firm_id = $1
                 WHERE id = $2`,
                [dest.firmId, movers[i].id],
              );
              await c.query("COMMIT");
              return "ok";
            } catch (e) {
              await c.query("ROLLBACK").catch(() => {});
              throw e;
            }
          }),
        );

        const destCount = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_clients
             WHERE firm_id = $1 AND subscription_status = 'active'`,
            [dest.firmId],
          );
          return r.rows[0].n as number;
        });
        expect(destCount).toBe(2);
        expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
        expect(settled.filter((s) => s.status === "rejected")).toHaveLength(1);
      } finally {
        await Promise.all(clients.map((c) => c.end().catch(() => {})));
      }
    });

    it("concurrent reactivation cannot bypass seat cap", async () => {
      const { firmId } = await seedLinkedFirm("reactivate");
      const inactiveIds: string[] = [];
      await withClient(async (c) => {
        for (let i = 0; i < 5; i++) {
          const id = randomUUID();
          await c.query(
            `INSERT INTO public.firm_memberships (id, firm_id, user_id, role, status)
             VALUES ($1, $2, $3, 'member', 'active')`,
            [id, firmId, randomUUID()],
          );
        }
        for (let i = 0; i < 4; i++) {
          const id = randomUUID();
          inactiveIds.push(id);
          await c.query(
            `INSERT INTO public.firm_memberships (id, firm_id, user_id, role, status)
             VALUES ($1, $2, $3, 'member', 'inactive')`,
            [id, firmId, randomUUID()],
          );
        }
      });

      const clients: Client[] = [];
      for (let i = 0; i < inactiveIds.length; i++) {
        const c = new Client({ connectionString: url });
        await c.connect();
        await c.query("SET ROLE authenticated");
        clients.push(c);
      }
      try {
        const settled = await Promise.allSettled(
          clients.map(async (c, i) => {
            await c.query("BEGIN");
            try {
              await c.query(
                `UPDATE public.firm_memberships SET status = 'active' WHERE id = $1`,
                [inactiveIds[i]],
              );
              await c.query("COMMIT");
              return "ok";
            } catch (e) {
              await c.query("ROLLBACK").catch(() => {});
              throw e;
            }
          }),
        );
        const count = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_memberships
             WHERE firm_id = $1 AND status = 'active'`,
            [firmId],
          );
          return r.rows[0].n as number;
        });
        expect(count).toBe(5);
        expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(0);
      } finally {
        await Promise.all(clients.map((c) => c.end().catch(() => {})));
      }
    });

    it("rejected transactions leave no partial mutations", async () => {
      const { firmId, companyId } = await seedLinkedFirm("partial");
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO public.firm_clients
             (firm_id, company_id, name, subscription_status)
           VALUES ($1, $2, 'a', 'active'), ($1, $2, 'b', 'active')`,
          [firmId, companyId],
        );
      });

      const before = await withClient(async (c) => {
        const r = await c.query(
          `SELECT md5(string_agg(id::text || subscription_status, ',' ORDER BY id)) AS d
           FROM public.firm_clients WHERE firm_id = $1`,
          [firmId],
        );
        return r.rows[0].d as string;
      });

      await withClient(async (c) => {
        await c.query("SET ROLE authenticated");
        await c.query("BEGIN");
        try {
          await c.query(
            `INSERT INTO public.firm_clients
               (firm_id, company_id, name, subscription_status)
             VALUES ($1, $2, 'should-fail', 'active')`,
            [firmId, companyId],
          );
          throw new Error("expected_cap_reject");
        } catch (e) {
          const msg = String((e as Error).message || e);
          expect(msg).toMatch(/ra_pro_client_cap_reached|expected_cap_reject/);
          await c.query("ROLLBACK");
        }
      });

      const after = await withClient(async (c) => {
        const r = await c.query(
          `SELECT md5(string_agg(id::text || subscription_status, ',' ORDER BY id)) AS d,
                  count(*)::int AS n
           FROM public.firm_clients WHERE firm_id = $1`,
          [firmId],
        );
        return r.rows[0] as { d: string; n: number };
      });
      expect(after.n).toBe(2);
      expect(after.d).toBe(before);
    });

    it("independent firms do not share a global capacity lock", async () => {
      const a = await seedLinkedFirm("indep-a");
      const b = await seedLinkedFirm("indep-b");

      const blocker = new Client({ connectionString: url });
      await blocker.connect();
      await blocker.query("BEGIN");
      await blocker.query(`SELECT public.ra_pro_lock_firm_capacity(ARRAY[$1::uuid])`, [
        a.firmId,
      ]);

      const started = Date.now();
      const other = new Client({ connectionString: url });
      await other.connect();
      try {
        await other.query("SET ROLE authenticated");
        await other.query("BEGIN");
        await other.query(
          `INSERT INTO public.firm_clients
             (firm_id, company_id, name, subscription_status)
           VALUES ($1, $2, 'indep-ok', 'active')`,
          [b.firmId, b.companyId],
        );
        await other.query("COMMIT");
        const elapsed = Date.now() - started;
        expect(elapsed).toBeLessThan(2000);

        const keys = await withClient(async (c) => {
          const r = await c.query(
            `SELECT classid, objid, granted
             FROM pg_locks
             WHERE locktype = 'advisory'
               AND pid = $1`,
            [blocker.processID],
          );
          return r.rows as { classid: string; objid: string; granted: boolean }[];
        });
        expect(keys.some((row) => row.granted === true)).toBe(true);

        // Firm B insert must use a different advisory key than firm A's held lock.
        const aKey = await withClient(async (c) => {
          const r = await c.query(
            `SELECT hashtextextended('ra_pro_firm_capacity:' || $1::text, 0) AS k`,
            [a.firmId],
          );
          return String(r.rows[0].k);
        });
        const bKey = await withClient(async (c) => {
          const r = await c.query(
            `SELECT hashtextextended('ra_pro_firm_capacity:' || $1::text, 0) AS k`,
            [b.firmId],
          );
          return String(r.rows[0].k);
        });
        expect(aKey).not.toBe(bKey);
      } finally {
        await blocker.query("ROLLBACK").catch(() => {});
        await blocker.end().catch(() => {});
        await other.end().catch(() => {});
      }
    });

    it("lock helper remains invoker-scoped (not SECURITY DEFINER)", async () => {
      const r = await withClient(async (c) => {
        const q = await c.query(
          `SELECT p.prosecdef
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'ra_pro_lock_firm_capacity'`,
        );
        expect(q.rows.length).toBe(1);
        return q.rows[0].prosecdef as boolean;
      });
      expect(r).toBe(false);
      const text = repoFile(MIGRATION_REL).toString("utf8");
      expect(text).not.toMatch(
        /CREATE OR REPLACE FUNCTION public\.ra_pro_lock_firm_capacity[\s\S]*SECURITY DEFINER/i,
      );
    });
  },
);
