/**
 * Disposable Postgres: RA Pro client/seat capacity locking.
 * Synthetic only — never production. Requires local Docker.
 *
 * Caller contract: on `ra_pro_capacity_lock_busy`, ROLLBACK and retry the
 * full transaction. The database does not auto-retry.
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

    function waitReady(seconds = 60) {
      const deadline = Date.now() + seconds * 1000;
      while (Date.now() < deadline) {
        const r = sh(
          "docker",
          [
            "exec",
            container,
            "pg_isready",
            "-U",
            "postgres",
            "-h",
            "127.0.0.1",
          ],
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
        await c.query(`INSERT INTO public.companies (id, name) VALUES ($1, $2)`, [
          companyId,
          label,
        ]);
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

    /** Caller-side retry required by ra_pro_capacity_lock_busy (no DB auto-retry). */
    async function runWithLockBusyRetry(
      c: Client,
      work: () => Promise<void>,
      maxAttempts = 50,
    ): Promise<"ok"> {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await c.query("BEGIN");
        try {
          await work();
          await c.query("COMMIT");
          return "ok";
        } catch (e) {
          await c.query("ROLLBACK").catch(() => {});
          const msg = String((e as Error).message || e);
          if (/ra_pro_capacity_lock_busy/.test(msg)) {
            sleepMs(5 + (attempt % 10));
            continue;
          }
          throw e;
        }
      }
      throw new Error("ra_pro_capacity_lock_busy_retry_exhausted");
    }

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-cap-"));
      container = `ra-pro-cap-${randomBytes(4).toString("hex")}`;
      port = 56000 + Math.floor(Math.random() * 1000);
      url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;

      const boot = repoFile(BOOT_REL);
      const mig = repoFile(MIGRATION_REL);
      expect(mig.includes(0x0d)).toBe(false);
      expect(mig.toString("utf8")).toMatch(/pg_try_advisory_xact_lock/);
      expect(mig.toString("utf8")).toMatch(
        /ra_pro_capacity_isolation_unsupported/,
      );

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

    async function raceInsertsWithCallerRetry(opts: {
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
        const settled = await Promise.allSettled(
          clients.map((c, i) =>
            runWithLockBusyRetry(c, async () => {
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
            }),
          ),
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

    it("RC: 10 concurrent client inserts never leave more than 2 counted clients", async () => {
      const { firmId, companyId } = await seedLinkedFirm("client-race");
      const r = await raceInsertsWithCallerRetry({
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
      expect(
        r.errors.every((e) => /ra_pro_client_cap_reached/.test(e)),
      ).toBe(true);
    });

    it("RC: 8 concurrent seat inserts with 4 prefilled never leave more than 5 seats", async () => {
      const { firmId, companyId } = await seedLinkedFirm("seat-race");
      const r = await raceInsertsWithCallerRetry({
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
      expect(r.errors.every((e) => /ra_pro_seat_cap_reached/.test(e))).toBe(
        true,
      );
    });

    it.each(["REPEATABLE READ", "SERIALIZABLE"] as const)(
      "%s fail-closes before client/seat/move/reactivate mutation",
      async (level) => {
        const firm = await seedLinkedFirm(`iso-${level}`);
        const other = await seedLinkedFirm(`iso-other-${level}`);

        await withClient(async (c) => {
          await c.query(
            `INSERT INTO public.firm_clients
               (firm_id, company_id, name, subscription_status)
             VALUES ($1, $2, 'seed', 'inactive')`,
            [firm.firmId, firm.companyId],
          );
          await c.query(
            `INSERT INTO public.firm_memberships
               (firm_id, user_id, role, status)
             VALUES ($1, $2, 'member', 'inactive')`,
            [firm.firmId, randomUUID()],
          );
          await c.query(
            `INSERT INTO public.firm_clients
               (firm_id, company_id, name, subscription_status)
             VALUES ($1, $2, 'movable', 'active')`,
            [other.firmId, other.companyId],
          );
        });

        const beforeClients = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_clients
             WHERE firm_id = $1 AND subscription_status = 'active'`,
            [firm.firmId],
          );
          return r.rows[0].n as number;
        });
        expect(beforeClients).toBe(0);

        await withClient(async (c) => {
          await c.query("SET ROLE authenticated");

          for (const work of [
            async () => {
              await c.query(
                `INSERT INTO public.firm_clients
                   (firm_id, company_id, name, subscription_status)
                 VALUES ($1, $2, 'rr-ins', 'active')`,
                [firm.firmId, firm.companyId],
              );
            },
            async () => {
              await c.query(
                `INSERT INTO public.firm_memberships
                   (firm_id, user_id, role, status)
                 VALUES ($1, $2, 'member', 'active')`,
                [firm.firmId, randomUUID()],
              );
            },
            async () => {
              await c.query(
                `UPDATE public.firm_clients SET firm_id = $1
                 WHERE firm_id = $2 AND name = 'movable'`,
                [firm.firmId, other.firmId],
              );
            },
            async () => {
              await c.query(
                `UPDATE public.firm_memberships SET status = 'active'
                 WHERE firm_id = $1 AND status = 'inactive'`,
                [firm.firmId],
              );
            },
          ]) {
            await c.query("BEGIN");
            await c.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);
            let msg = "";
            try {
              await work();
              await c.query("COMMIT");
              throw new Error("expected_isolation_reject");
            } catch (e) {
              msg = String((e as Error).message || e);
              await c.query("ROLLBACK").catch(() => {});
            }
            expect(msg).toMatch(/ra_pro_capacity_isolation_unsupported/);
            expect(msg).not.toMatch(/expected_isolation_reject/);
          }
        });

        const afterClients = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_clients
             WHERE firm_id = $1 AND subscription_status = 'active'`,
            [firm.firmId],
          );
          return r.rows[0].n as number;
        });
        const afterSeats = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_memberships
             WHERE firm_id = $1 AND status = 'active'`,
            [firm.firmId],
          );
          return r.rows[0].n as number;
        });
        expect(afterClients).toBe(0);
        expect(afterSeats).toBe(0);
      },
    );

    it("concurrent firm moves cannot bypass client cap", async () => {
      const dest = await seedLinkedFirm("move-dest");
      const srcA = await seedLinkedFirm("move-src-a");
      const srcB = await seedLinkedFirm("move-src-b");

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
          `SELECT id FROM public.firm_clients
           WHERE firm_id IN ($1, $2) AND name LIKE 'mover-%'
           ORDER BY name`,
          [srcA.firmId, srcB.firmId],
        );
        return r.rows as { id: string }[];
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
          clients.map((c, i) =>
            runWithLockBusyRetry(c, async () => {
              await c.query(
                `UPDATE public.firm_clients SET firm_id = $1 WHERE id = $2`,
                [dest.firmId, movers[i].id],
              );
            }),
          ),
        );

        const destCount = await withClient(async (c) => {
          const r = await c.query(
            `SELECT count(*)::int AS n FROM public.firm_clients
             WHERE firm_id = $1 AND subscription_status = 'active'`,
            [dest.firmId],
          );
          return r.rows[0].n as number;
        });
        expect(destCount).toBeLessThanOrEqual(2);
        expect(destCount).toBe(2);
        expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
        expect(settled.filter((s) => s.status === "rejected")).toHaveLength(1);
      } finally {
        await Promise.all(clients.map((c) => c.end().catch(() => {})));
      }
    });

    it("opposing multi-statement moves: no deadlock wait, no cap bypass", async () => {
      const sA = await seedLinkedFirm("swap-a");
      const sB = await seedLinkedFirm("swap-b");
      const r1 = randomUUID();
      const r2 = randomUUID();
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO public.firm_clients
             (id, firm_id, company_id, name, subscription_status)
           VALUES ($1, $2, $3, '1', 'active'), ($4, $5, $6, '2', 'active')`,
          [r1, sA.firmId, sA.companyId, r2, sB.firmId, sB.companyId],
        );
      });

      const u1 = new Client({ connectionString: url });
      const u2 = new Client({ connectionString: url });
      await u1.connect();
      await u2.connect();
      await u1.query("SET ROLE authenticated");
      await u2.query("SET ROLE authenticated");

      const started = Date.now();
      const settled = await Promise.allSettled([
        (async () => {
          await u1.query("BEGIN");
          try {
            await u1.query(`UPDATE public.firm_clients SET firm_id=$1 WHERE id=$2`, [
              sB.firmId,
              r1,
            ]);
            await u1.query(`UPDATE public.firm_clients SET firm_id=$1 WHERE id=$2`, [
              sA.firmId,
              r2,
            ]);
            await u1.query("COMMIT");
          } catch (e) {
            await u1.query("ROLLBACK").catch(() => {});
            throw e;
          }
        })(),
        (async () => {
          await u2.query("BEGIN");
          try {
            await u2.query(`UPDATE public.firm_clients SET firm_id=$1 WHERE id=$2`, [
              sA.firmId,
              r2,
            ]);
            await u2.query(`UPDATE public.firm_clients SET firm_id=$1 WHERE id=$2`, [
              sB.firmId,
              r1,
            ]);
            await u2.query("COMMIT");
          } catch (e) {
            await u2.query("ROLLBACK").catch(() => {});
            throw e;
          }
        })(),
      ]);
      const elapsed = Date.now() - started;
      await u1.end().catch(() => {});
      await u2.end().catch(() => {});

      expect(elapsed).toBeLessThan(3000);
      const errs = settled
        .filter((s): s is PromiseRejectedResult => s.status === "rejected")
        .map((s) => String(s.reason?.message || s.reason));
      expect(errs.some((e) => /deadlock detected/i.test(e))).toBe(false);
      expect(
        errs.every((e) =>
          /ra_pro_capacity_lock_busy|ra_pro_client_cap_reached/.test(e),
        ) || settled.every((s) => s.status === "fulfilled"),
      ).toBe(true);

      const counts = await withClient(async (c) => {
        const a = await c.query(
          `SELECT count(*)::int AS n FROM public.firm_clients
           WHERE firm_id=$1 AND subscription_status='active'`,
          [sA.firmId],
        );
        const b = await c.query(
          `SELECT count(*)::int AS n FROM public.firm_clients
           WHERE firm_id=$1 AND subscription_status='active'`,
          [sB.firmId],
        );
        return { a: a.rows[0].n as number, b: b.rows[0].n as number };
      });
      expect(counts.a).toBeLessThanOrEqual(2);
      expect(counts.b).toBeLessThanOrEqual(2);
    });

    it("concurrent reactivation cannot bypass seat cap", async () => {
      const { firmId } = await seedLinkedFirm("reactivate");
      const inactiveIds: string[] = [];
      await withClient(async (c) => {
        for (let i = 0; i < 5; i++) {
          await c.query(
            `INSERT INTO public.firm_memberships (firm_id, user_id, role, status)
             VALUES ($1, $2, 'member', 'active')`,
            [firmId, randomUUID()],
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
          clients.map((c, i) =>
            runWithLockBusyRetry(c, async () => {
              await c.query(
                `UPDATE public.firm_memberships SET status = 'active' WHERE id = $1`,
                [inactiveIds[i]],
              );
            }),
          ),
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
        expect(
          settled
            .filter((s): s is PromiseRejectedResult => s.status === "rejected")
            .every((s) =>
              /ra_pro_seat_cap_reached/.test(
                String(s.reason?.message || s.reason),
              ),
            ),
        ).toBe(true);
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
      await blocker.query(
        `SELECT public.ra_pro_lock_firm_capacity(ARRAY[$1::uuid])`,
        [a.firmId],
      );

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
        expect(Date.now() - started).toBeLessThan(2000);

        // Same firm is busy (nonblocking)
        await other.query("BEGIN");
        let busy = false;
        try {
          await other.query(
            `INSERT INTO public.firm_clients
               (firm_id, company_id, name, subscription_status)
             VALUES ($1, $2, 'same-busy', 'active')`,
            [a.firmId, a.companyId],
          );
          await other.query("COMMIT");
        } catch (e) {
          busy = /ra_pro_capacity_lock_busy/.test(
            String((e as Error).message || e),
          );
          await other.query("ROLLBACK").catch(() => {});
        }
        expect(busy).toBe(true);

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

    it("lock helper remains invoker-scoped; anon cannot execute", async () => {
      const r = await withClient(async (c) => {
        const q = await c.query(
          `SELECT p.prosecdef,
                  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
                  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'ra_pro_lock_firm_capacity'`,
        );
        expect(q.rows.length).toBe(1);
        return q.rows[0] as {
          prosecdef: boolean;
          anon_exec: boolean;
          auth_exec: boolean;
        };
      });
      expect(r.prosecdef).toBe(false);
      expect(r.anon_exec).toBe(false);
      expect(r.auth_exec).toBe(true);
      const text = repoFile(MIGRATION_REL).toString("utf8");
      expect(text).toMatch(/pg_try_advisory_xact_lock/);
      expect(text).not.toMatch(
        /CREATE OR REPLACE FUNCTION public\.ra_pro_lock_firm_capacity[\s\S]*SECURITY DEFINER/i,
      );
    });
  },
);
