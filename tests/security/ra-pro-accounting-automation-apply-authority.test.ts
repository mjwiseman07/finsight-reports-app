import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const verifier =
  "scripts/security/verify-ra-pro-accounting-automation-apply-authority.js";

describe("RA Pro accounting-automation apply authority", () => {
  it("verifies both ordered LF Git blobs without production contact", () => {
    const raw = execFileSync(process.execPath, [verifier], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    const result = JSON.parse(raw);
    expect(result.verdict).toBe("OFFLINE_AUTHORITY_VERIFIED");
    expect(result.history).toEqual({ prior: 188, post: 190 });
    expect(result.migrations.map((m: { version: string }) => m.version)).toEqual([
      "20260917044537",
      "20260917180140",
    ]);
    expect(result.migrations.every((m: { lineEndings: string }) => m.lineEndings === "LF")).toBe(true);
    expect(result.productionContact).toBe(false);
    expect(result.applyAuthorized).toBe(false);
  });

  it("does not accept a database URL or authorization token interface", () => {
    const run = spawnSync(process.execPath, [verifier, "--apply"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL:
          "postgresql://forbidden.invalid/postgres",
      },
    });
    expect(run.status).toBe(1);
    const result = JSON.parse(run.stderr);
    expect(result.verdict).toBe("BLOCKED");
    expect(result.reason).toBe("OFFLINE_VERIFIER_ARGUMENTS_FORBIDDEN");
  });
});
